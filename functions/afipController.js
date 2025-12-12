const admin = require('firebase-admin');
const { HttpsError } = require('firebase-functions/v2/https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { execSync } = require('child_process');

// ==========================================
// 1. FUNCIÓN PRINCIPAL: CREAR FACTURA (CAE) - VERSIÓN MEJORADA
// ==========================================
exports.createInvoice = async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Debes estar autenticado.');
  }

  const {
    sucursalId,
    ptoVta,
    cbteTipo,
    concepto,
    docTipo,
    docNro,
    importeTotal,
    importeNeto,
    importeIva,
    importeExento,
    fechaServicioDesde,
    fechaServicioHasta,
    fechaVencimientoPago,
    cbteAsocNro,
  } = request.data;

  const userId = request.auth.uid;

  try {
    // 1. Conversión de Tipos (Blindaje)
    const ptoVtaNum = parseInt(ptoVta, 10);
    const cbteTipoNum = parseInt(cbteTipo, 10);
    const docTipoNum = parseInt(docTipo, 10);
    const docNroStr = String(docNro || '0'); // DocNro debe ser string numérico
    const conceptoNum = parseInt(concepto, 10);

    if (isNaN(ptoVtaNum) || isNaN(cbteTipoNum)) {
      throw new HttpsError(
        'invalid-argument',
        'Punto de Venta o Tipo Comprobante inválidos.',
      );
    }

    // 2. Configuración
    const config = await getAfipConfig(userId, sucursalId);
    if (!config || config.error)
      throw new HttpsError('failed-precondition', 'Falta configurar AFIP.');

    console.log(
      `[AFIP CAE] Facturando: PtoVta ${ptoVtaNum}, Tipo ${cbteTipoNum}, Doc ${docNroStr}`,
    );

    // 3. Token
    const wsaaResult = await getWsaaToken(
      'wsfe',
      config.cert,
      config.key,
      config.production,
    );
    const token = wsaaResult.loginTicketResponse.credentials.token.trim();
    const sign = wsaaResult.loginTicketResponse.credentials.sign.trim();
    const isProd = wsaaResult.productionUsed;
    const cuitEmisor = String(config.cuit).replace(/[^0-9]/g, '');

    // 4. URL
    const wsfeUrl = isProd
      ? 'https://servicios1.afip.gov.ar/wsfev1/service.asmx'
      : 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx';

    // 5. Último Comprobante
    const ultimoNumero = await getLastVoucher(
      token,
      sign,
      cuitEmisor,
      ptoVtaNum,
      cbteTipoNum,
      wsfeUrl,
    );
    const proximoNumero = ultimoNumero + 1;

    // 6. Fechas y Montos
    const fechaCbte = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const impTotal = parseFloat(importeTotal).toFixed(2);
    const impNeto = parseFloat(importeNeto).toFixed(2);
    const impIva = parseFloat(importeIva || 0).toFixed(2);
    const impExento = parseFloat(importeExento || 0).toFixed(2);

    // --- LÓGICA CONDICIÓN IVA (Para cumplir con la nueva norma RG 5616) ---
    // Mapeamos según el tipo de comprobante para ayudar a AFIP
    let condIvaReceptor = ''; // Opcional por defecto
    if (docTipoNum === 80)
      condIvaReceptor = `<ar:CondicionIVAReceptorId>1</ar:CondicionIVAReceptorId>`; // Resp Inscripto
    else if (docTipoNum === 99)
      condIvaReceptor = `<ar:CondicionIVAReceptorId>5</ar:CondicionIVAReceptorId>`; // Consumidor Final
    else if (docTipoNum === 96)
      condIvaReceptor = `<ar:CondicionIVAReceptorId>5</ar:CondicionIVAReceptorId>`; // DNI -> Consumidor Final

    let detalleIva = '';
    if (parseFloat(impIva) > 0) {
      detalleIva = `
        <Iva>
            <AlicIva>
                <Id>5</Id> 
                <BaseImp>${impNeto}</BaseImp>
                <Importe>${impIva}</Importe>
            </AlicIva>
        </Iva>`;
    }

    // --- 2. LÓGICA PARA NOTAS DE CRÉDITO (Error 10197) ---
    let cbtesAsoc = '';
    let periodoAsoc = '';

    // Si es Nota de Crédito (13) o Débito (12)
    if (cbteTipoNum === 13 || cbteTipoNum === 12) {
      if (cbteAsocNro && parseInt(cbteAsocNro) > 0) {
        // Opción A: Anular factura específica (si pusiste número)
        const assocNro = parseInt(cbteAsocNro);
        const assocTipo = 11; // Factura C
        cbtesAsoc = `<ar:CbtesAsoc><ar:CbteAsoc><ar:Tipo>${assocTipo}</ar:Tipo><ar:PtoVta>${ptoVtaNum}</ar:PtoVta><ar:Nro>${assocNro}</ar:Nro></ar:CbteAsoc></ar:CbtesAsoc>`;
      } else {
        // Opción B: Genérico (si dejaste vacío, usa fecha de hoy)
        periodoAsoc = `<ar:PeriodoAsoc><ar:FchDesde>${fechaCbte}</ar:FchDesde><ar:FchHasta>${fechaCbte}</ar:FchHasta></ar:PeriodoAsoc>`;
      }
    }

    // 7. XML REQUEST
    const soapBody = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ar="http://ar.gov.afip.dif.FEV1/">
   <soapenv:Header/>
   <soapenv:Body>
      <ar:FECAESolicitar>
         <ar:Auth>
            <ar:Token>${token}</ar:Token>
            <ar:Sign>${sign}</ar:Sign>
            <ar:Cuit>${cuitEmisor}</ar:Cuit>
         </ar:Auth>
         <ar:FeCAEReq>
            <ar:FeCabReq>
               <ar:CantReg>1</ar:CantReg>
               <ar:PtoVta>${ptoVtaNum}</ar:PtoVta>
               <ar:CbteTipo>${cbteTipoNum}</ar:CbteTipo>
            </ar:FeCabReq>
            <ar:FeDetReq>
               <ar:FECAEDetRequest>
                  <ar:Concepto>${conceptoNum}</ar:Concepto>
                  <ar:DocTipo>${docTipoNum}</ar:DocTipo>
                  <ar:DocNro>${docNroStr}</ar:DocNro>
                  <ar:CbteDesde>${proximoNumero}</ar:CbteDesde>
                  <ar:CbteHasta>${proximoNumero}</ar:CbteHasta>
                  <ar:CbteFch>${fechaCbte}</ar:CbteFch>
                  <ar:ImpTotal>${impTotal}</ar:ImpTotal>
                  <ar:ImpTotConc>0.00</ar:ImpTotConc>
                  <ar:ImpNeto>${impNeto}</ar:ImpNeto>
                  <ar:ImpOpEx>${impExento}</ar:ImpOpEx>
                  <ar:ImpTrib>0.00</ar:ImpTrib>
                  <ar:ImpIVA>${impIva}</ar:ImpIVA>
                  <ar:FchServDesde>${fechaServicioDesde || ''}</ar:FchServDesde>
                  <ar:FchServHasta>${fechaServicioHasta || ''}</ar:FchServHasta>
                  <ar:FchVtoPago>${fechaVencimientoPago || ''}</ar:FchVtoPago>
                  <ar:MonId>PES</ar:MonId>
                  <ar:MonCotiz>1</ar:MonCotiz>
                  ${condIvaReceptor}
                  ${detalleIva}
                  ${cbtesAsoc}
                  ${periodoAsoc}
               </ar:FECAEDetRequest>
            </ar:FeDetReq>
         </ar:FeCAEReq>
      </ar:FECAESolicitar>
   </soapenv:Body>
</soapenv:Envelope>`;

    const response = await fetch(wsfeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml;charset=UTF-8',
        SOAPAction: 'http://ar.gov.afip.dif.FEV1/FECAESolicitar',
      },
      body: soapBody,
    });

    const text = await response.text();

    // --- MEJORA: CAPTURA DE TODOS LOS ERRORES ---
    if (text.includes('<Errors>')) {
      // Usamos matchAll o un loop para sacar TODOS los mensajes, no solo el primero
      const errors = [];
      const regex = /<Msg>(.*?)<\/Msg>/g;
      let match;
      while ((match = regex.exec(text)) !== null) {
        // Filtramos el mensaje largo de "Importante" si hay otros errores reales
        if (!match[1].includes('El dia 6 de abril')) {
          errors.push(match[1]);
        }
      }

      // Si solo quedó el mensaje largo, lo mostramos. Si hay otros, mostramos los reales.
      if (errors.length === 0) {
        // Fallback: buscamos cualquier mensaje
        const anyMsg = text.match(/<Msg>(.*?)<\/Msg>/);
        throw new HttpsError(
          'invalid-argument',
          `AFIP: ${anyMsg ? anyMsg[1] : 'Error desconocido'}`,
        );
      }

      throw new HttpsError(
        'invalid-argument',
        `Rechazo AFIP: ${errors.join(' | ')}`,
      );
    }

    if (text.includes('faultstring')) {
      const faultMatch = text.match(/<faultstring>(.*?)<\/faultstring>/);
      throw new HttpsError(
        'aborted',
        `AFIP Fault: ${faultMatch ? faultMatch[1] : text}`,
      );
    }

    const caeMatch = text.match(/<CAE>(.*?)<\/CAE>/);
    const caeVtoMatch = text.match(/<CAEFchVto>(.*?)<\/CAEFchVto>/);
    const resultadoMatch = text.match(/<Resultado>(.*?)<\/Resultado>/);

    // Si Resultado es R (Rechazado) y no entramos en el if de Errors, algo raro pasó
    if (!caeMatch || (resultadoMatch && resultadoMatch[1] === 'R')) {
      throw new HttpsError(
        'aborted',
        `Factura Rechazada sin motivo claro. Respuesta raw: ${text.substring(0, 200)}`,
      );
    }

    return {
      success: true,
      cae: caeMatch[1],
      caeFchVto: caeVtoMatch ? caeVtoMatch[1] : '',
      cbteNro: proximoNumero,
      cbteTipo: cbteTipoNum, // Added this line
      resultado: resultadoMatch ? resultadoMatch[1] : 'A',
    };
  } catch (error) {
    console.error('[AFIP CAE] Error:', error);
    if (error.code && error.details) throw error;
    throw new HttpsError(
      'internal',
      error.message || 'Error al generar factura',
    );
  }
};

// ==========================================
// 2. FUNCIÓN: OBTENER CONTRIBUYENTE (PADRÓN)
// ==========================================
exports.getContribuyente = async (request) => {
  if (!request.auth) {
    return { success: false, error: 'Debes estar autenticado.' };
  }

  const { cuit, sucursalId } = request.data;
  const userId = request.auth.uid;

  try {
    const config = await getAfipConfig(userId, sucursalId);

    if (!config || config.error) {
      console.error('[AFIP] Configuración incompleta.');
      return {
        success: false,
        error: `Falta configurar CUIT, Certificado o Clave.`,
      };
    }

    // Obtener Token
    const wsaaResult = await getWsaaToken(
      'ws_sr_padron_a13',
      config.cert,
      config.key,
      config.production,
    );

    const token = wsaaResult.loginTicketResponse.credentials.token.trim();
    const sign = wsaaResult.loginTicketResponse.credentials.sign.trim();
    const isProd = wsaaResult.productionUsed;

    const cuitRepresentado = String(config.cuit).replace(/[^0-9]/g, '');
    const cuitConsultado = String(cuit).replace(/[^0-9]/g, '');

    console.log(
      `[AFIP] Consultando CUIT ${cuitConsultado} en entorno: ${isProd ? 'PRODUCCIÓN' : 'HOMOLOGACIÓN'}`,
    );

    const padronUrl = isProd
      ? 'https://aws.afip.gov.ar/sr-padron/webservices/personaServiceA13'
      : 'https://awshomo.afip.gov.ar/sr-padron/webservices/personaServiceA13';

    // XML Manual
    const soapBody = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:a13="http://a13.soap.ws.server.puc.sr/">
   <soapenv:Header/>
   <soapenv:Body>
      <a13:getPersona>
         <token>${token}</token>
         <sign>${sign}</sign>
         <cuitRepresentada>${cuitRepresentado}</cuitRepresentada>
         <idPersona>${cuitConsultado}</idPersona>
      </a13:getPersona>
   </soapenv:Body>
</soapenv:Envelope>`;

    const response = await fetch(padronUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml;charset=UTF-8', SOAPAction: '' },
      body: soapBody,
    });

    const text = await response.text();

    if (text.includes('faultstring') || text.includes('Fault')) {
      const faultMatch = text.match(/<faultstring>(.*?)<\/faultstring>/);
      const errorMsg = faultMatch ? faultMatch[1] : text;
      if (errorMsg.includes('no presente en padron'))
        throw new Error('El CUIT ingresado no existe.');
      throw new Error(`AFIP Error: ${errorMsg}`);
    }

    const extract = (tag, source) => {
      const regex = new RegExp(`<${tag}>(.*?)<\/${tag}>`, 'i');
      const match = source.match(regex);
      return match ? match[1] : '';
    };

    let nombre =
      extract('razonSocial', text) ||
      (extract('apellido', text) + ' ' + extract('nombre', text)).trim();
    if (!nombre || nombre === ' ') nombre = extract('nombre', text);

    const calle = extract('direccion', text);
    const localidad = extract('localidad', text);
    const provincia = extract('descripcionProvincia', text);
    const domicilio = [calle, localidad, provincia].filter(Boolean).join(', ');

    let tipoResponsable = 'Consumidor Final';

    // Lógica mejorada de detección
    const esMonotributo =
      text.includes('<monotributo>') || text.includes('<datosMonotributo>');
    const esRI =
      text.includes('<idImpuesto>30</idImpuesto>') ||
      text.includes('<descripcionImpuesto>IVA</descripcionImpuesto>');
    const esExento =
      text.includes('<idImpuesto>32</idImpuesto>') ||
      text.includes('<descripcionImpuesto>IVA EXENTO</descripcionImpuesto>');

    if (esRI) tipoResponsable = 'Responsable Inscripto';
    else if (esMonotributo) tipoResponsable = 'Responsable Monotributo';
    else if (esExento) tipoResponsable = 'Exento';

    return {
      success: true,
      data: { nombre, domicilio, tipo: tipoResponsable, cuit: cuitConsultado },
    };
  } catch (error) {
    console.error('[AFIP] Error al obtener contribuyente:', error);
    return {
      success: false,
      error: `Error AFIP: ${error.message}`,
      fullError: error.message,
    };
  }
};

// ==========================================
// 3. HELPER INTERNO: OBTENER ÚLTIMO COMPROBANTE
// ==========================================
const getLastVoucher = async (token, sign, cuit, ptoVta, cbteTipo, url) => {
  // CORRECCIÓN AQUÍ: ptoVta y cbteTipo entran limpios como números
  const soapBody = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ar="http://ar.gov.afip.dif.FEV1/">
   <soapenv:Header/>
   <soapenv:Body>
      <ar:FECompUltimoAutorizado>
         <ar:Auth>
            <ar:Token>${token}</ar:Token>
            <ar:Sign>${sign}</ar:Sign>
            <ar:Cuit>${cuit}</ar:Cuit>
         </ar:Auth>
         <ar:PtoVta>${ptoVta}</ar:PtoVta>
         <ar:CbteTipo>${cbteTipo}</ar:CbteTipo>
      </ar:FECompUltimoAutorizado>
   </soapenv:Body>
</soapenv:Envelope>`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml;charset=UTF-8',
      SOAPAction: 'http://ar.gov.afip.dif.FEV1/FECompUltimoAutorizado',
    },
    body: soapBody,
  });

  const text = await response.text();
  const resultMatch = text.match(/<CbteNro>(.*?)<\/CbteNro>/);

  if (!resultMatch) {
    if (text.includes('Fault') || text.includes('Errors')) {
      const faultMatch = text.match(/<faultstring>(.*?)<\/faultstring>/);
      throw new Error(
        'Error al consultar último comprobante: ' +
          (faultMatch ? faultMatch[1] : text),
      );
    }
    return 0;
  }

  return parseInt(resultMatch[1], 10);
};

// ==========================================
// 4. HELPERS DE CONFIGURACIÓN Y CRYPTO
// ==========================================

const getAfipConfig = async (userId, sucursalId) => {
  try {
    let certContent, keyContent, cuit, production;

    if (sucursalId) {
      const sucursalDoc = await admin
        .firestore()
        .collection('sucursales')
        .doc(sucursalId)
        .get();
      if (sucursalDoc.exists) {
        const data = sucursalDoc.data();
        const config = data.configuracion || data;
        if (config.afip) {
          certContent = config.afip.cert;
          keyContent = config.afip.key;
          cuit = config.afip.cuit;
          production = config.afip.production;
        } else if (config.afipCert && config.afipKey) {
          certContent = config.afipCert;
          keyContent = config.afipKey;
          cuit = config.cuit;
          production = config.production;
        }
      }
    }

    if (!certContent || !keyContent) {
      const userDoc = await admin
        .firestore()
        .collection('datosNegocio')
        .doc(userId)
        .get();
      if (userDoc.exists) {
        const data = userDoc.data();
        if (data.afip) {
          certContent = data.afip.cert;
          keyContent = data.afip.key;
          cuit = data.afip.cuit;
          production = data.afip.production;
        } else if (data.afipCert && data.afipKey) {
          certContent = data.afipCert;
          keyContent = data.afipKey;
          cuit = data.cuit;
          production = data.production;
        }
      }
    }

    if (!cuit || !certContent || !keyContent) return { error: true };
    production = production === true || production === 'true';
    return { cuit, cert: certContent, key: keyContent, production };
  } catch (error) {
    return { error: true };
  }
};

const cleanPem = (pem) => {
  if (!pem) return '';
  let type = '';
  if (pem.includes('RSA PRIVATE KEY')) type = 'RSA PRIVATE KEY';
  else if (pem.includes('PRIVATE KEY')) type = 'PRIVATE KEY';
  else if (pem.includes('CERTIFICATE')) type = 'CERTIFICATE';
  else return pem;

  const lines = pem.split(/\r?\n/);
  const bodyLines = lines.filter(
    (line) => !line.includes('BEGIN') && !line.includes('END'),
  );
  const body = bodyLines.join('').replace(/\s/g, '');
  const formattedBody = body.match(/.{1,64}/g).join('\n');
  return `-----BEGIN ${type}-----\n${formattedBody}\n-----END ${type}-----`;
};

const verifyCertMatch = (certPem, keyPem) => {
  try {
    const cert = new crypto.X509Certificate(certPem);
    const publicKey = cert.publicKey;
    const privateKey = crypto.createPrivateKey(keyPem);
    const now = new Date();
    if (new Date(cert.validTo) < now) throw new Error(`Certificado expirado.`);
    if (new Date(cert.validFrom) > now)
      throw new Error(`Certificado aún no válido.`);

    const data = Buffer.from('test');
    const signature = crypto.sign('sha256', data, privateKey);
    const isVerified = crypto.verify('sha256', data, publicKey, signature);
    if (!isVerified) throw new Error('Certificado y Clave no coinciden.');
    return true;
  } catch (error) {
    if (error.message.includes('PEM')) throw new Error('Formato PEM inválido.');
    throw error;
  }
};

// ==========================================
// 5. GET WSAA TOKEN (CORE)
// ==========================================
const getWsaaToken = async (
  serviceName,
  certContentRaw,
  keyContentRaw,
  production,
) => {
  const trace = [];
  trace.push('Inicio getWsaaToken');

  if (certContentRaw.includes('REQUEST'))
    throw new Error('Es un CSR, no un Certificado.');

  const certContent = cleanPem(certContentRaw);
  const keyContent = cleanPem(keyContentRaw);
  verifyCertMatch(certContent, keyContent);

  const tempDir = os.tmpdir();
  const fileUUID = crypto.randomUUID();
  const certPath = path.join(tempDir, `cert_${serviceName}_${fileUUID}.crt`);
  const keyPath = path.join(tempDir, `key_${serviceName}_${fileUUID}.key`);
  const traPath = path.join(tempDir, `tra_${serviceName}_${fileUUID}.xml`);
  const cmsPath = path.join(tempDir, `cms_${serviceName}_${fileUUID}.pem`);

  try {
    fs.writeFileSync(certPath, certContent);
    fs.writeFileSync(keyPath, keyContent);

    try {
      const issuer = execSync(`openssl x509 -noout -issuer -in "${certPath}"`, {
        encoding: 'utf8',
      }).toLowerCase();
      if (issuer.includes('produccion') || issuer.includes('computadores')) {
        if (!production) {
          production = true;
          trace.push('Switch -> Producción');
        }
      } else if (
        issuer.includes('homologacion') ||
        issuer.includes('testing')
      ) {
        if (production) {
          production = false;
          trace.push('Switch -> Homologación');
        }
      }
    } catch (e) {}

    const now = new Date();
    const genDate = new Date(now.getTime() - 600000);
    const expDate = new Date(now.getTime() + 600000);
    const uniqueId = Math.floor(Date.now() / 1000);

    const tra = `<?xml version="1.0" encoding="UTF-8"?>
<loginTicketRequest version="1.0">
  <header>
    <uniqueId>${uniqueId}</uniqueId>
    <generationTime>${genDate.toISOString()}</generationTime>
    <expirationTime>${expDate.toISOString()}</expirationTime>
  </header>
  <service>${serviceName}</service>
</loginTicketRequest>`;

    fs.writeFileSync(traPath, tra);

    execSync(
      `openssl smime -sign -in "${traPath}" -out "${cmsPath}" -inkey "${keyPath}" -signer "${certPath}" -nodetach -outform PEM`,
      { stdio: 'pipe' },
    );

    let cmsContent = fs.readFileSync(cmsPath, 'utf8');
    let cms = cmsContent
      .replace(/-----BEGIN PKCS7-----/g, '')
      .replace(/-----END PKCS7-----/g, '')
      .replace(/-----BEGIN CMS-----/g, '')
      .replace(/-----END CMS-----/g, '')
      .replace(/\s/g, '');

    const wsaaUrl = production
      ? 'https://wsaa.afip.gov.ar/ws/services/LoginCms'
      : 'https://wsaahomo.afip.gov.ar/ws/services/LoginCms';

    const soapBody = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://wsaa.view.sua.dvadac.desein.afip.gov">
   <soapenv:Header/>
   <soapenv:Body><ser:loginCms><in0>${cms}</in0></ser:loginCms></soapenv:Body>
</soapenv:Envelope>`;

    const response = await fetch(wsaaUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml;charset=UTF-8', SOAPAction: '' },
      body: soapBody,
    });

    const text = await response.text();

    if (text.includes('faultstring') || text.includes('Fault')) {
      const faultMatch = text.match(/<faultstring>(.*?)<\/faultstring>/);
      throw new Error(
        `AFIP RECHAZÓ EL PEDIDO: ${faultMatch ? faultMatch[1] : text}`,
      );
    }

    let xmlTicket = '';
    const returnMatch = text.match(
      /<loginCmsReturn[^>]*>([\s\S]*?)<\/loginCmsReturn>/,
    );
    xmlTicket = returnMatch ? returnMatch[1] : text;
    xmlTicket = xmlTicket
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"');

    const tokenMatch = xmlTicket.match(/<token>(.*?)<\/token>/);
    const signMatch = xmlTicket.match(/<sign>(.*?)<\/sign>/);

    if (!tokenMatch || !signMatch)
      throw new Error('No se pudo extraer el Token.');

    return {
      loginTicketResponse: {
        credentials: { token: tokenMatch[1], sign: signMatch[1] },
      },
      productionUsed: production,
    };
  } catch (e) {
    throw new Error(`${e.message}`);
  } finally {
    try {
      if (fs.existsSync(certPath)) fs.unlinkSync(certPath);
      if (fs.existsSync(keyPath)) fs.unlinkSync(keyPath);
      if (fs.existsSync(traPath)) fs.unlinkSync(traPath);
      if (fs.existsSync(cmsPath)) fs.unlinkSync(cmsPath);
    } catch (e) {}
  }
};
// ==========================================
// 6. NUEVO: HEALTH CHECK (FEDummy)
// ==========================================
exports.getServerStatus = async (request) => {
  if (!request.auth) {
    return { success: false, error: 'Debes estar autenticado.' };
  }

  const { sucursalId } = request.data;
  const userId = request.auth.uid;

  try {
    // 1. Reutilizamos la lógica de configuración para validar certificados
    const config = await getAfipConfig(userId, sucursalId);

    if (!config || config.error) {
      return {
        success: false,
        error: 'Falta configurar certificados o CUIT.',
      };
    }

    // 2. Obtener Token (esto ya valida que el certificado no esté vencido y sea par con la key)
    const wsaaResult = await getWsaaToken(
      'wsfe',
      config.cert,
      config.key,
      config.production,
    );
    const token = wsaaResult.loginTicketResponse.credentials.token.trim();
    const sign = wsaaResult.loginTicketResponse.credentials.sign.trim();
    const isProd = wsaaResult.productionUsed;
    const cuitEmisor = String(config.cuit).replace(/[^0-9]/g, '');

    const wsfeUrl = isProd
      ? 'https://servicios1.afip.gov.ar/wsfev1/service.asmx'
      : 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx';

    // 3. Llamada a FEDummy
    const soapBody = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ar="http://ar.gov.afip.dif.FEV1/">
   <soapenv:Header/>
   <soapenv:Body>
      <ar:FEDummy/>
   </soapenv:Body>
</soapenv:Envelope>`;

    const response = await fetch(wsfeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml;charset=UTF-8',
        SOAPAction: 'http://ar.gov.afip.dif.FEV1/FEDummy',
      },
      body: soapBody,
    });

    const text = await response.text();

    // Parsear respuesta simple
    const extract = (tag) => {
      const match = text.match(new RegExp(`<${tag}>(.*?)<\/${tag}>`));
      return match ? match[1] : 'Unknown';
    };

    const appServer = extract('AppServer');
    const dbServer = extract('DbServer');
    const authServer = extract('AuthServer');

    return {
      success: true,
      status: {
        appServer,
        dbServer,
        authServer,
        environment: isProd ? 'Producción' : 'Homologación',
      },
    };
  } catch (error) {
    console.error('[AFIP Health Check] Error:', error);
    return {
      success: false,
      error: error.message || 'Error al conectar con AFIP',
    };
  }
};
