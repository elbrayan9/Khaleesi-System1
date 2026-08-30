// frontend/src/services/pdfService.js

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import { formatCurrency, construirMensajeComprobante } from '../utils/helpers';
import { subirComprobantePdf } from './storageService';

// El logo del negocio, listo para jsPDF.
//
// Primero se usa la copia incrustada en la configuración, que no necesita red:
// es lo que hace que el comprobante salga con el logo siempre, y al instante.
//
// Si el negocio cargó el logo antes de que existiera esa copia, se cae al
// camino viejo de bajarlo de Storage. Ese camino puede fallar por cosas ajenas
// al sistema —la descarga cruzada bloqueada por el navegador, App Check, o
// simplemente que no haya conexión— y por eso lleva un límite de tiempo: sin
// él, un pedido que nunca contesta deja el comprobante colgado sin imprimir.
const cargarLogoParaPdf = async (datosNegocio) => {
  const incrustado = datosNegocio?.logoDataUrl;
  if (incrustado) {
    const dims = await medirImagen(incrustado);
    return { dataUrl: incrustado, format: 'JPEG', ...dims };
  }

  const url = datosNegocio?.logoUrl;
  if (!url) return null;

  const corte = AbortSignal.timeout ? AbortSignal.timeout(6000) : undefined;
  const resp = await fetch(url, { signal: corte });
  if (!resp.ok) {
    throw new Error(`Storage respondió ${resp.status} al pedir el logo`);
  }
  const blob = await resp.blob();
  const dataUrl = await new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result);
    fr.onerror = rej;
    fr.readAsDataURL(blob);
  });
  const dims = await medirImagen(dataUrl);
  const format = blob.type.includes('png') ? 'PNG' : 'JPEG';
  return { dataUrl, format, ...dims };
};

// Se expone solo para las pruebas: es la pieza donde estuvo el problema.
export const __cargarLogoParaPdf = (datosNegocio) =>
  cargarLogoParaPdf(datosNegocio);

// El alto y el ancho reales, para respetar la proporción del logo.
const medirImagen = (dataUrl) =>
  new Promise((res) => {
    const im = new Image();
    im.onload = () =>
      res({ w: im.naturalWidth || 1, h: im.naturalHeight || 1 });
    im.onerror = () => res({ w: 1, h: 1 });
    im.src = dataUrl;
  });

/**
 * Genera un recibo de venta en formato PDF con diseño oficial de AFIP.
 * @param {object} venta - El objeto completo de la venta.
 * @param {object} datosNegocio - Los datos del negocio.
 * @param {object} cliente - Los datos del cliente.
 * @param {string} tipoDocumento - 'Factura A', 'Factura B', 'Factura C', 'Ticket X', 'Presupuesto'
 */
export const generarPdfVenta = async (
  venta,
  datosNegocio,
  cliente,
  tipoDocumento = 'Ticket X',
  accion = 'download',
) => {
  if (!venta) {
    console.error('No se proporcionaron datos de la venta.');
    return;
  }

  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.width; // 210mm
  const pageHeight = doc.internal.pageSize.height; // 297mm
  const margin = 10;
  const contentWidth = pageWidth - margin * 2;

  // --- CONFIGURACIÓN DE FUENTES Y COLORES ---
  const font = 'Helvetica';
  const colorBlack = '#000000';
  const colorGray = '#4b5563'; // Gray 600

  // --- DETERMINAR LETRA Y CÓDIGO ---
  let letra = 'X';
  let codigoComprobante = '';
  let tituloComprobante = 'COMPROBANTE NO VÁLIDO COMO FACTURA';

  const tipoUpper = tipoDocumento.toUpperCase();

  if (tipoUpper.includes('FACTURA A') || tipoUpper === 'A') {
    letra = 'A';
    codigoComprobante = 'COD. 001';
    tituloComprobante = 'FACTURA';
  } else if (tipoUpper.includes('FACTURA B') || tipoUpper === 'B') {
    letra = 'B';
    codigoComprobante = 'COD. 006';
    tituloComprobante = 'FACTURA';
  } else if (tipoUpper.includes('FACTURA C') || tipoUpper === 'C') {
    letra = 'C';
    codigoComprobante = 'COD. 011';
    tituloComprobante = 'FACTURA';
  } else if (tipoUpper.includes('PRESUPUESTO')) {
    letra = 'P';
    tituloComprobante = 'PRESUPUESTO';
  }
  // NOTAS DE CRÉDITO
  else if (tipoUpper.includes('NOTA DE CRÉDITO A')) {
    letra = 'A';
    codigoComprobante = 'COD. 003';
    tituloComprobante = 'NOTA DE CRÉDITO';
  } else if (tipoUpper.includes('NOTA DE CRÉDITO B')) {
    letra = 'B';
    codigoComprobante = 'COD. 008';
    tituloComprobante = 'NOTA DE CRÉDITO';
  } else if (tipoUpper.includes('NOTA DE CRÉDITO C')) {
    letra = 'C';
    codigoComprobante = 'COD. 013';
    tituloComprobante = 'NOTA DE CRÉDITO';
  } else if (tipoUpper.includes('NOTA DE CRÉDITO')) {
    // Default / X
    letra = 'X';
    codigoComprobante = ''; // 'DOCUMENTO NO VÁLIDO COMO FACTURA' is too long for the box
    tituloComprobante = 'NOTA DE CRÉDITO';
  }
  // NOTAS DE DÉBITO
  else if (tipoUpper.includes('NOTA DE DÉBITO A')) {
    letra = 'A';
    codigoComprobante = 'COD. 002';
    tituloComprobante = 'NOTA DE DÉBITO';
  } else if (tipoUpper.includes('NOTA DE DÉBITO B')) {
    letra = 'B';
    codigoComprobante = 'COD. 007';
    tituloComprobante = 'NOTA DE DÉBITO';
  } else if (tipoUpper.includes('NOTA DE DÉBITO C')) {
    letra = 'C';
    codigoComprobante = 'COD. 012';
    tituloComprobante = 'NOTA DE DÉBITO';
  } else if (tipoUpper.includes('NOTA DE DÉBITO')) {
    // Default / X
    letra = 'X';
    codigoComprobante = ''; // 'DOCUMENTO NO VÁLIDO COMO FACTURA' is too long for the box
    tituloComprobante = 'NOTA DE DÉBITO';
  }

  // --- FALLBACK: SI ES 'X' PERO TIENE DATOS DE AFIP, CORREGIMOS ---
  if (letra === 'X' && venta.afipData && venta.afipData.cbteTipo) {
    const tipo = parseInt(venta.afipData.cbteTipo, 10);

    // FACTURAS
    if (tipo === 1) {
      letra = 'A';
      codigoComprobante = 'COD. 001';
      tituloComprobante = 'FACTURA';
    } else if (tipo === 6) {
      letra = 'B';
      codigoComprobante = 'COD. 006';
      tituloComprobante = 'FACTURA';
    } else if (tipo === 11) {
      letra = 'C';
      codigoComprobante = 'COD. 011';
      tituloComprobante = 'FACTURA';
    } else if (tipo === 2) {
      // NOTAS DE DÉBITO
      letra = 'A';
      codigoComprobante = 'COD. 002';
      tituloComprobante = 'NOTA DE DÉBITO';
    } else if (tipo === 7) {
      letra = 'B';
      codigoComprobante = 'COD. 007';
      tituloComprobante = 'NOTA DE DÉBITO';
    } else if (tipo === 12) {
      letra = 'C';
      codigoComprobante = 'COD. 012';
      tituloComprobante = 'NOTA DE DÉBITO';
    } else if (tipo === 3) {
      // NOTAS DE CRÉDITO
      letra = 'A';
      codigoComprobante = 'COD. 003';
      tituloComprobante = 'NOTA DE CRÉDITO';
    } else if (tipo === 8) {
      letra = 'B';
      codigoComprobante = 'COD. 008';
      tituloComprobante = 'NOTA DE CRÉDITO';
    } else if (tipo === 13) {
      letra = 'C';
      codigoComprobante = 'COD. 013';
      tituloComprobante = 'NOTA DE CRÉDITO';
    }
  }

  // --- FALLBACK 2: SI ES MONOTRIBUTISTA Y TIENE CAE, SIEMPRE ES 'C' ---
  // (Para arreglar notas viejas que no guardaron el cbteTipo)
  if (
    letra === 'X' &&
    venta.afipData &&
    venta.afipData.cae &&
    datosNegocio &&
    datosNegocio.condicionIva &&
    datosNegocio.condicionIva.toLowerCase().includes('monotributo')
  ) {
    letra = 'C';
    if (tituloComprobante === 'NOTA DE CRÉDITO') {
      codigoComprobante = 'COD. 013';
    } else if (tituloComprobante === 'NOTA DE DÉBITO') {
      codigoComprobante = 'COD. 012';
    } else if (tituloComprobante === 'FACTURA') {
      codigoComprobante = 'COD. 011';
    }
  }

  // --- DIBUJAR ESTRUCTURA (CAJAS) ---
  doc.setLineWidth(0.3);
  doc.setDrawColor(0);

  // 1. Caja Principal del Encabezado
  doc.rect(margin, margin, contentWidth, 50);

  // 2. Caja de la Letra (Centro)
  const boxSize = 15;
  const centerX = pageWidth / 2;
  doc.rect(centerX - boxSize / 2, margin, boxSize, boxSize);

  // 3. Línea vertical divisoria (debajo de la caja de la letra)
  doc.line(centerX, margin + boxSize, centerX, margin + 50);

  // --- CONTENIDO DEL ENCABEZADO ---

  // LETRA
  doc.setFont(font, 'bold');
  doc.setFontSize(24);
  doc.text(letra, centerX, margin + 10, { align: 'center' });
  doc.setFontSize(8);
  doc.text(codigoComprobante, centerX, margin + 14, { align: 'center' });

  // COLUMNA IZQUIERDA (EMISOR)
  const leftColX = margin + 5;
  let currentY = margin + 10;

  // Logo del negocio (opcional), a la izquierda del nombre.
  let nameX = leftColX;
  if (datosNegocio?.logoDataUrl || datosNegocio?.logoUrl) {
    try {
      const logo = await cargarLogoParaPdf(datosNegocio);
      if (logo) {
        const maxW = 16;
        const maxH = 14;
        const ratio = Math.min(maxW / logo.w, maxH / logo.h);
        const lw = logo.w * ratio;
        const lh = logo.h * ratio;
        doc.addImage(logo.dataUrl, logo.format, margin + 2, margin + 2, lw, lh);
        nameX = margin + 2 + lw + 3;
      }
    } catch (e) {
      // El comprobante sale igual, sin logo: es preferible a no emitirlo.
      console.warn(
        'No se pudo poner el logo en el comprobante. Volvé a subirlo desde ' +
          'Configuración para que quede guardado con la factura. Motivo:',
        e,
      );
    }
  }

  // Nombre Fantasía (Grande)
  doc.setFontSize(18);
  doc.text(datosNegocio?.nombre || 'Mi Negocio', nameX, currentY);
  currentY += 8;

  // Datos Emisor
  doc.setFontSize(9);
  doc.setFont(font, 'bold');
  doc.text('Razón Social:', leftColX, currentY);
  doc.setFont(font, 'normal');
  doc.text(datosNegocio?.nombre || '', leftColX + 22, currentY);
  currentY += 5;

  doc.setFont(font, 'bold');
  doc.text('Domicilio:', leftColX, currentY);
  doc.setFont(font, 'normal');
  // Ajustar texto largo de dirección
  const direccionLines = doc.splitTextToSize(datosNegocio?.direccion || '', 65);
  doc.text(direccionLines, leftColX + 16, currentY);
  // Incrementamos Y dinámicamente según la cantidad de líneas (4mm por línea)
  currentY += Math.max(5, direccionLines.length * 4);

  doc.setFont(font, 'bold');
  doc.text('Condición IVA:', leftColX, currentY);
  doc.setFont(font, 'normal');
  doc.text(
    datosNegocio?.condicionIva || 'Responsable Monotributo',
    leftColX + 24,
    currentY,
  );

  // COLUMNA DERECHA (DATOS COMPROBANTE)
  const rightColX = centerX + 10;
  currentY = margin + 10;

  // Título
  doc.setFont(font, 'bold');
  if (tituloComprobante.length > 25) {
    doc.setFontSize(10); // Reduce font size for long titles
  } else {
    doc.setFontSize(18);
  }
  doc.text(tituloComprobante, rightColX, currentY);
  currentY += 8;

  // Datos
  doc.setFontSize(10);
  const ptoVta = venta.afipData?.ptoVta || datosNegocio?.puntoVenta || 1;
  doc.text(
    `Punto de Venta: ${String(ptoVta).padStart(5, '0')}`,
    rightColX,
    currentY,
  );

  // Comp. Nro con ajuste de fuente si es necesario
  // Si no hay cbteNro (es presupuesto/X), usamos los primeros 8 chars del ID
  let nroMostrar = venta.afipData?.cbteNro;

  if (!nroMostrar) {
    // Es presupuesto o no tiene CAE
    nroMostrar = venta.id
      ? String(venta.id).substring(0, 8).toUpperCase()
      : '00000000';
  } else {
    // Si tiene cbteNro, asegurarnos que sea string y pad
    nroMostrar = String(nroMostrar).padStart(8, '0');
  }

  // FORCE TRUNCATION: Si por alguna razón sigue siendo largo (ej. ID muy largo que se coló), cortarlo a 15 chars max para visualización
  if (String(nroMostrar).length > 15) {
    nroMostrar = String(nroMostrar).substring(0, 15);
  }

  const compNroText = `Comp. Nro: ${nroMostrar}`;

  if (compNroText.length > 20) {
    doc.setFontSize(9);
  }
  doc.text(compNroText, rightColX + 45, currentY);
  doc.setFontSize(10); // Restaurar tamaño
  currentY += 6;

  // Fecha de emisión: si la venta se facturó (con CAE), ARCA usa la fecha del
  // día en que se emitió. Preferimos esa (afipData.fechaComprobante, AAAAMMDD)
  // para que el PDF y el QR coincidan con lo que registró ARCA.
  const fechaCbteRaw = String(venta.afipData?.fechaComprobante || '');
  const fechaEmision = /^\d{8}$/.test(fechaCbteRaw)
    ? `${fechaCbteRaw.slice(6, 8)}/${fechaCbteRaw.slice(4, 6)}/${fechaCbteRaw.slice(0, 4)}`
    : venta.fecha;
  doc.text(`Fecha de Emisión: ${fechaEmision}`, rightColX, currentY);
  currentY += 6;

  doc.text(`CUIT: ${datosNegocio?.cuit || ''}`, rightColX, currentY);
  currentY += 6;

  doc.text(
    `Ingresos Brutos: ${datosNegocio?.ingresosBrutos || 'EXENTO'}`,
    rightColX,
    currentY,
  );
  currentY += 6;

  doc.text(
    `Inicio de Actividades: ${datosNegocio?.inicioActividades || '01/01/2024'}`,
    rightColX,
    currentY,
  );

  // --- CAJA DE PERIODO (Debajo del encabezado) ---
  const periodoY = margin + 52;
  doc.rect(margin, periodoY, contentWidth, 8);
  doc.setFontSize(9);
  doc.setFont(font, 'bold');
  doc.text('Período Facturado Desde:', margin + 2, periodoY + 5);
  doc.setFont(font, 'normal');
  doc.text(fechaEmision, margin + 42, periodoY + 5);
  doc.setFont(font, 'bold');
  doc.text('Hasta:', margin + 70, periodoY + 5);
  doc.setFont(font, 'normal');
  doc.text(fechaEmision, margin + 82, periodoY + 5);
  doc.setFont(font, 'bold');
  doc.text('Vto. para el pago:', margin + 120, periodoY + 5);
  doc.setFont(font, 'normal');
  doc.text(fechaEmision, margin + 150, periodoY + 5);

  // --- CAJA DE DATOS DEL CLIENTE ---
  const clienteY = periodoY + 10;
  doc.rect(margin, clienteY, contentWidth, 20);

  currentY = clienteY + 5;
  // Fila 1
  doc.setFont(font, 'bold');
  doc.text('CUIT:', margin + 2, currentY);
  doc.setFont(font, 'normal');
  doc.text(cliente?.cuit || venta.clienteCuit || '', margin + 12, currentY);

  doc.setFont(font, 'bold');
  doc.text('Apellido y Nombre / Razón Social:', margin + 60, currentY);
  doc.setFont(font, 'normal');
  doc.text(
    cliente?.nombre || venta.clienteNombre || 'Consumidor Final',
    margin + 120,
    currentY,
  );

  currentY += 6;
  // Fila 2
  doc.setFont(font, 'bold');
  doc.text('Condición frente al IVA:', margin + 2, currentY);
  doc.setFont(font, 'normal');
  doc.text(
    cliente?.condicionFiscal || 'Consumidor Final',
    margin + 40,
    currentY,
  );

  doc.setFont(font, 'bold');
  doc.text('Domicilio:', margin + 90, currentY);
  doc.setFont(font, 'normal');
  const domicilio = cliente?.direccion || '-';
  const domicilioLines = doc.splitTextToSize(domicilio, 75); // Ajustar ancho máximo
  doc.text(domicilioLines, margin + 108, currentY);

  currentY += 6;
  // Fila 3
  doc.setFont(font, 'bold');
  doc.text('Condición de venta:', margin + 2, currentY);
  doc.setFont(font, 'normal');
  doc.text(venta.metodoPago || 'Contado', margin + 35, currentY);

  // --- NUEVO: MOSTRAR COMPROBANTE ASOCIADO ---
  if (venta.ventaRelacionadaId) {
    const nroAsoc = String(venta.ventaRelacionadaId).replace(/\D/g, '');
    doc.setFont(font, 'bold');
    doc.text('Comp. Asociado:', margin + 90, currentY); // A la derecha
    doc.setFont(font, 'normal');
    doc.text(`Factura N° ${nroAsoc}`, margin + 118, currentY);
  }

  // --- TABLA DE ÍTEMS ---
  const tableY = clienteY + 22;

  const tableColumn = [
    'Código',
    'Producto / Servicio',
    'Cantidad',
    'U. Medida',
    'Precio Unit.',
    '% Bonif',
    'Subtotal',
  ];
  const tableRows = [];

  // En Factura A los importes se muestran SIN IVA (neto, alícuota 21%).
  const esFacturaA = letra === 'A';

  venta.items.forEach((item) => {
    const cant = Number(item.cantidad) || 0;
    // precioFinal es el TOTAL de la línea (con descuento). El unitario es
    // precioOriginal; si faltara, lo derivamos del total de la línea.
    const totalLineaBruto = Number(item.precioFinal) || 0;
    const unitBruto =
      Number(item.precioOriginal) ||
      (cant > 0 ? totalLineaBruto / cant : totalLineaBruto);
    const precioUnit = esFacturaA ? unitBruto / 1.21 : unitBruto;
    const subtotal = esFacturaA ? totalLineaBruto / 1.21 : totalLineaBruto;

    const itemData = [
      item.codigoBarras || (item.id ? String(item.id).substring(0, 6) : ''),
      item.nombre,
      item.cantidad,
      'unidades',
      formatCurrency(precioUnit), // Precio Unitario
      formatCurrency(item.descuentoPorcentaje), // Bonif
      formatCurrency(subtotal), // Subtotal
    ];
    tableRows.push(itemData);
  });

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: tableY,
    theme: 'plain', // Tema plano para parecerse más al oficial
    styles: {
      font: font,
      fontSize: 9,
      cellPadding: 2,
      lineColor: [0, 0, 0],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [220, 220, 220], // Gris claro
      textColor: 0,
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'left' }, // Código
      1: { halign: 'left' }, // Producto
      2: { halign: 'center' }, // Cantidad
      3: { halign: 'center' }, // U. Medida
      4: { halign: 'right' }, // Precio Unit
      5: { halign: 'center' }, // Bonif
      6: { halign: 'right' }, // Subtotal
    },
    // Dibujar bordes de la tabla manualmente si es necesario, o usar theme grid
    tableLineColor: 0,
    tableLineWidth: 0.1,
  });

  // --- TOTALES Y PIE DE PÁGINA ---
  const finalY = doc.lastAutoTable.finalY;
  const footerHeight = 40; // Espacio para totales y QR
  const bottomY = pageHeight - margin - footerHeight;

  // Si la tabla termina muy abajo, agregar página
  if (finalY > bottomY) {
    doc.addPage();
  }

  // Dibujar caja de totales (siempre al final de la tabla o abajo)
  // Para simplificar, lo ponemos justo debajo de la tabla
  let totalY = finalY + 5;

  // Obtener valores de AFIP o calcular defaults
  const impNeto = venta.afipData?.impNeto
    ? parseFloat(venta.afipData.impNeto)
    : 0;
  const impIva = venta.afipData?.impIva ? parseFloat(venta.afipData.impIva) : 0;

  doc.setFont(font, 'bold');

  if (esFacturaA && impIva > 0) {
    // --- CASO FACTURA A (Con IVA discriminado) ---

    // 1. Neto Gravado
    doc.text('Importe Neto Gravado: $', 140, totalY, { align: 'right' });
    doc.setFont(font, 'normal');
    doc.text(formatCurrency(impNeto), 190, totalY, { align: 'right' });
    totalY += 5;

    // 2. IVA (Mostramos genérico o 21% si no hay desglose múltiple)
    doc.setFont(font, 'bold');
    doc.text('IVA: $', 140, totalY, { align: 'right' });
    doc.setFont(font, 'normal');
    doc.text(formatCurrency(impIva), 190, totalY, { align: 'right' });
    totalY += 5;
  } else {
    // --- CASO FACTURA B/C (Sin discriminar o Monotributo) ---
    doc.text('Subtotal: $', 140, totalY, { align: 'right' });
    doc.setFont(font, 'normal');
    doc.text(formatCurrency(venta.total), 190, totalY, { align: 'right' });
    totalY += 5;
  }

  // 3. Otros Tributos (Mantener si existe)
  doc.setFont(font, 'bold');
  doc.text('Importe Otros Tributos: $', 140, totalY, { align: 'right' });
  doc.setFont(font, 'normal');
  doc.text('0,00', 190, totalY, { align: 'right' });

  // 4. TOTAL FINAL (Grande)
  totalY += 6;
  doc.setFont(font, 'bold');
  doc.setFontSize(11);
  doc.text('Importe Total: $', 140, totalY, { align: 'right' });
  doc.text(formatCurrency(venta.total), 190, totalY, { align: 'right' });

  // --- PIE DE PÁGINA (QR y CAE) ---
  // Posición fija al fondo de la página
  const qrY = pageHeight - 50;

  if (
    tipoUpper.includes('PRESUPUESTO') ||
    tipoUpper.includes('TICKET X') ||
    tipoUpper === 'X'
  ) {
    doc.setFontSize(12);
    doc.setFont(font, 'bold');
    doc.setTextColor(colorBlack);
    doc.text('DOCUMENTO NO VÁLIDO COMO FACTURA', pageWidth / 2, qrY + 20, {
      align: 'center',
    });
  } else {
    // Logo ARCA (Texto por ahora)
    doc.setFontSize(14);
    doc.setFont(font, 'bold');
    doc.setTextColor(colorGray);
    doc.text('ARCA', margin + 40, qrY + 10);
    doc.setFontSize(6);
    doc.text('AGENCIA DE RECAUDACIÓN', margin + 40, qrY + 14);
    doc.text('Y CONTROL ADUANERO', margin + 40, qrY + 17);
    doc.setTextColor(colorBlack);

    doc.setFontSize(9);
    doc.setFont(font, 'bolditalic');
    doc.text('Comprobante Autorizado', margin + 40, qrY + 25);
    doc.setFont(font, 'italic');
    doc.setFontSize(7);
    doc.text(
      'Esta Administración Federal no se responsabiliza por los datos ingresados en el detalle de la operación',
      margin + 40,
      qrY + 30,
    );
  }

  // CAE y Vencimiento (Derecha)
  if (
    venta.afipData &&
    venta.afipData.cae &&
    !tipoUpper.includes('PRESUPUESTO')
  ) {
    doc.setFontSize(10);
    doc.setFont(font, 'bold');
    doc.text(`CAE N°: ${venta.afipData.cae}`, pageWidth - margin, qrY + 10, {
      align: 'right',
    });
    // ARCA devuelve el vto del CAE como AAAAMMDD; lo mostramos DD/MM/AAAA.
    const caeVtoRaw = String(venta.afipData.caeFchVto || '');
    const caeVto = /^\d{8}$/.test(caeVtoRaw)
      ? `${caeVtoRaw.slice(6, 8)}/${caeVtoRaw.slice(4, 6)}/${caeVtoRaw.slice(0, 4)}`
      : caeVtoRaw;
    doc.text(`Fecha de Vto. de CAE: ${caeVto}`, pageWidth - margin, qrY + 16, {
      align: 'right',
    });

    // --- GENERACIÓN DE QR ---
    try {
      // ARCA exige yyyy-mm-dd. Si tenemos la fecha real del comprobante
      // (afipData.fechaComprobante, AAAAMMDD), la usamos; si no, la de la venta.
      let fechaQR;
      if (/^\d{8}$/.test(fechaCbteRaw)) {
        fechaQR = `${fechaCbteRaw.slice(0, 4)}-${fechaCbteRaw.slice(4, 6)}-${fechaCbteRaw.slice(6, 8)}`;
      } else {
        const [dQR, mQR, yQR] = String(venta.fecha).split('/');
        fechaQR = `${yQR}-${String(mQR).padStart(2, '0')}-${String(dQR).padStart(2, '0')}`;
      }

      const qrData = {
        ver: 1,
        fecha: fechaQR,
        cuit: parseInt(String(datosNegocio?.cuit || '').replace(/\D/g, ''), 10),
        ptoVta: venta.afipData.ptoVta || 1,
        tipoCmp: parseInt(venta.afipData.cbteTipo, 10),
        nroCmp: parseInt(venta.afipData.cbteNro, 10),
        importe: venta.total,
        moneda: 'PES',
        ctz: 1,
        tipoDocRec: venta.afipData.docTipo || 99,
        nroDocRec: parseInt(venta.afipData.docNro || 0, 10),
        tipoCodAut: 'E',
        codAut: parseInt(venta.afipData.cae, 10),
      };

      const jsonString = JSON.stringify(qrData);
      const base64Data = btoa(jsonString);
      const urlQR = `https://www.afip.gob.ar/fe/qr/?p=${base64Data}`;

      const qrImage = await QRCode.toDataURL(urlQR, {
        errorCorrectionLevel: 'M',
      });
      doc.addImage(qrImage, 'PNG', margin, qrY, 35, 35);
    } catch (error) {
      console.error('Error QR:', error);
    }
  }

  // Devolver el PDF como Blob (para compartir/subir sin descargar).
  if (accion === 'blob') {
    return doc.output('blob');
  }

  // Guardar PDF o Imprimir
  if (accion === 'print') {
    doc.autoPrint(); // Inyecta script de impresión automática en el PDF
    const blobUrl = doc.output('bloburl');

    // Crear un iframe invisible para imprimir sin pop-ups
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    iframe.src = blobUrl;

    document.body.appendChild(iframe);

    // Esperar a que cargue y llamar a imprimir
    iframe.onload = function () {
      setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      }, 500); // Pequeño delay para asegurar carga del PDF viewer
    };
  } else {
    doc.save(
      `${tipoDocumento.replace(/ /g, '_')}_${venta.id ? venta.id.substring(0, 8) : 'temp'}.pdf`,
    );
  }
};

// ----------------------------------------------------------------------------
// Envío del comprobante como PDF por WhatsApp
// ----------------------------------------------------------------------------

const derivarTipoDoc = (venta) => {
  const t = parseInt(venta?.afipData?.cbteTipo, 10);
  if (t === 1) return 'Factura A';
  if (t === 6) return 'Factura B';
  if (t === 11) return 'Factura C';
  return 'Ticket X';
};

/**
 * Envía el comprobante de una venta por WhatsApp COMO PDF. Estrategia en cascada:
 *  1) Compartir nativo (adjunta el PDF real) si el dispositivo lo permite.
 *  2) Subir a Firebase Storage y mandar el LINK del PDF por WhatsApp.
 *  3) Fallback: descargar el PDF y abrir WhatsApp con el texto del comprobante.
 */
export const enviarComprobantePdfWhatsapp = async (
  venta,
  datosNegocio,
  cliente,
) => {
  if (!venta) return;
  const tipoDoc = derivarTipoDoc(venta);
  const blob = await generarPdfVenta(
    venta,
    datosNegocio,
    cliente,
    tipoDoc,
    'blob',
  );
  const nombre = `${tipoDoc.replace(/ /g, '_')}_${String(venta.id || 'temp').substring(0, 8)}.pdf`;
  const mensaje = construirMensajeComprobante(venta, datosNegocio);

  // Teléfono del cliente normalizado para wa.me (Argentina).
  let tel = String(cliente?.telefono || '').replace(/\D/g, '');
  if (tel && !tel.startsWith('54')) tel = `549${tel}`;
  const waUrl = (texto) =>
    `https://wa.me/${tel}?text=${encodeURIComponent(texto)}`;

  // 1) Compartir nativo con el PDF adjunto.
  try {
    const file = new File([blob], nombre, { type: 'application/pdf' });
    if (
      typeof navigator !== 'undefined' &&
      navigator.canShare &&
      navigator.canShare({ files: [file] })
    ) {
      await navigator.share({ files: [file], text: mensaje, title: nombre });
      return;
    }
  } catch (e) {
    if (e?.name === 'AbortError') return; // el usuario canceló
    // otro error de share -> seguimos a los fallbacks
  }

  // 2) Subir a Storage y mandar el link del PDF.
  try {
    const url = await subirComprobantePdf(venta.userId, blob, nombre);
    window.open(
      waUrl(`${mensaje}\n\nDescargá tu comprobante en PDF:\n${url}`),
      '_blank',
      'noopener,noreferrer',
    );
    return;
  } catch (e) {
    console.warn('No se pudo subir el PDF a Storage; se descarga local:', e);
  }

  // 3) Fallback: descargar el PDF + abrir WhatsApp con el texto.
  const dlUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = dlUrl;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(dlUrl);
  window.open(
    waUrl(`${mensaje}\n\n(Te adjunto el PDF que se descargó)`),
    '_blank',
    'noopener,noreferrer',
  );
};

/**
 * Envía el comprobante por EMAIL: sube el PDF a Storage y abre el cliente de
 * correo (mailto) con el asunto y el link al PDF ya escritos.
 */
export const enviarComprobantePorEmail = async (
  venta,
  datosNegocio,
  cliente,
) => {
  if (!venta) return;
  const tipoDoc = derivarTipoDoc(venta);
  const blob = await generarPdfVenta(
    venta,
    datosNegocio,
    cliente,
    tipoDoc,
    'blob',
  );
  const nombre = `${tipoDoc.replace(/ /g, '_')}_${String(venta.id || 'temp').substring(0, 8)}.pdf`;
  const negocio = datosNegocio?.nombre || 'Mi Negocio';
  const esFactura = !!venta.afipData?.cae;
  const asunto = esFactura
    ? `${negocio} - Factura N° ${venta.afipData.cbteNro || ''}`
    : `${negocio} - Comprobante`;

  let cuerpo =
    `Hola,\n\nTe enviamos tu comprobante de ${negocio}.\n` +
    `Total: $${formatCurrency(venta.total)}\n`;

  try {
    const url = await subirComprobantePdf(venta.userId, blob, nombre);
    cuerpo += `\nDescargá el PDF acá:\n${url}\n`;
  } catch (e) {
    console.warn('No se pudo subir el PDF; se descarga local:', e);
    const dlUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = dlUrl;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(dlUrl);
    cuerpo += `\n(Adjuntá el PDF que se descargó en tu equipo.)\n`;
  }
  cuerpo += `\n¡Gracias por tu compra!`;

  const dest = cliente?.email || '';
  window.location.href = `mailto:${dest}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
};

// ----------------------------------------------------------------------------
// Reporte de caja del día
// ----------------------------------------------------------------------------

/**
 * Arma el movimiento de caja de un día en PDF.
 *
 * Reemplaza al `window.print()` que tenía la pantalla de Caja, que imprimía la
 * aplicación entera —menú, fondo oscuro y el modal encima— porque el proyecto no
 * tiene ningún `@media print`. Acá se genera el documento y se imprime desde un
 * iframe, así sale solo el reporte.
 *
 * @param {object} datos
 *   @param {string} datos.fecha            'DD/MM/YYYY'
 *   @param {number} datos.saldoAnterior
 *   @param {Array}  datos.movimientos      [{hora, tipo, detalle, ingreso, egreso}]
 *   @param {number} datos.totalIngresos
 *   @param {number} datos.totalEgresos
 *   @param {number} datos.saldo
 *   @param {Array}  datos.porMedio         [[metodo, monto], ...]
 * @param {object} datosNegocio
 * @param {'download'|'print'} accion
 */
export const generarPdfCaja = async (datos, datosNegocio, accion = 'print') => {
  const {
    fecha,
    saldoAnterior = 0,
    movimientos = [],
    totalIngresos = 0,
    totalEgresos = 0,
    saldo = 0,
    porMedio = [],
  } = datos || {};

  const doc = new jsPDF('p', 'mm', 'a4');
  const anchoPagina = doc.internal.pageSize.getWidth();
  const margen = 14;
  let y = margen;

  // --- Encabezado: logo y datos del negocio ---
  if (datosNegocio?.logoDataUrl || datosNegocio?.logoUrl) {
    try {
      const logo = await cargarLogoParaPdf(datosNegocio);
      if (logo) {
        const alto = 16;
        const ancho = Math.min(38, (logo.w / logo.h) * alto);
        doc.addImage(logo.dataUrl, logo.format, margen, y, ancho, alto);
      }
    } catch (_) {
      /* si el logo no carga, el reporte sale igual */
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('Movimiento de caja', anchoPagina - margen, y + 6, {
    align: 'right',
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(90);
  doc.text(fecha || '', anchoPagina - margen, y + 12, { align: 'right' });

  const nombreNegocio = datosNegocio?.nombreNegocio || datosNegocio?.nombre;
  if (nombreNegocio) {
    doc.text(String(nombreNegocio), anchoPagina - margen, y + 17, {
      align: 'right',
    });
  }
  doc.setTextColor(0);
  y += 26;

  // --- Tabla de movimientos ---
  const filas = [];
  if (saldoAnterior) {
    filas.push([
      '',
      'SALDO ANTERIOR',
      'Arrastrado de días anteriores',
      saldoAnterior > 0 ? `$${formatCurrency(saldoAnterior)}` : '',
      saldoAnterior < 0 ? `$${formatCurrency(-saldoAnterior)}` : '',
    ]);
  }
  movimientos.forEach((m) => {
    filas.push([
      m.hora || '',
      m.tipo || '',
      m.detalle || '',
      m.ingreso ? `$${formatCurrency(m.ingreso)}` : '',
      m.egreso ? `$${formatCurrency(m.egreso)}` : '',
    ]);
  });

  if (!filas.length) {
    filas.push(['', '', 'No hubo movimientos este día.', '', '']);
  }

  autoTable(doc, {
    startY: y,
    head: [['Hora', 'Movimiento', 'Detalle', 'Ingresos', 'Egresos']],
    body: filas,
    theme: 'plain',
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      cellPadding: 2,
      lineColor: [210, 210, 210],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [235, 235, 235],
      textColor: 40,
      fontStyle: 'bold',
      halign: 'left',
    },
    columnStyles: {
      0: { cellWidth: 16 },
      1: { cellWidth: 32 },
      3: { halign: 'right', cellWidth: 27 },
      4: { halign: 'right', cellWidth: 27 },
    },
    margin: { left: margen, right: margen },
  });

  y = doc.lastAutoTable.finalY + 6;

  // --- Totales ---
  const derecha = anchoPagina - margen;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Total ingresos', derecha - 42, y, { align: 'right' });
  doc.text(`$${formatCurrency(totalIngresos)}`, derecha, y, { align: 'right' });
  y += 5;
  doc.text('Total egresos', derecha - 42, y, { align: 'right' });
  doc.text(`$${formatCurrency(totalEgresos)}`, derecha, y, { align: 'right' });
  y += 6;

  doc.setDrawColor(150);
  doc.line(derecha - 70, y - 3, derecha, y - 3);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Saldo en caja', derecha - 42, y + 2, { align: 'right' });
  doc.text(`$${formatCurrency(saldo)}`, derecha, y + 2, { align: 'right' });
  y += 12;

  // --- Cobrado por medio de pago ---
  // Va en su propio bloque y no sumado al saldo: ese dinero entra a la cuenta,
  // no al cajón. Es la distinción que hace que la caja cuadre.
  if (porMedio.length) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Cobrado por medio de pago', margen, y);
    y += 2;

    autoTable(doc, {
      startY: y,
      body: porMedio.map(([metodo, monto]) => [
        String(metodo).replace(/_/g, ' '),
        `$${formatCurrency(monto)}`,
      ]),
      theme: 'plain',
      styles: { font: 'helvetica', fontSize: 9, cellPadding: 1.6 },
      columnStyles: { 1: { halign: 'right' } },
      margin: { left: margen, right: anchoPagina - margen - 70 },
    });
    y = doc.lastAutoTable.finalY + 6;

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(
      'El saldo en caja cuenta solo el efectivo. Lo cobrado por tarjeta, QR o transferencia entra a la cuenta.',
      margen,
      y,
    );
    doc.setTextColor(0);
  }

  const nombreArchivo = `Caja_${String(fecha || '').replace(/\//g, '-')}.pdf`;

  if (accion === 'print') {
    doc.autoPrint();
    const blobUrl = doc.output('bloburl');
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    iframe.src = blobUrl;
    document.body.appendChild(iframe);
    iframe.onload = function () {
      setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      }, 500);
    };
    return;
  }
  doc.save(nombreArchivo);
};
