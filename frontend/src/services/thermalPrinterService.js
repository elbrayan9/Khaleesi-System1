// frontend/src/services/thermalPrinterService.js
//
// Impresión directa a impresoras térmicas 58mm (ESC/POS) vía WebUSB.
// Pensado para la Wags ITER04 y compatibles "Apto comercio" que aceptan
// comandos ESC/POS por USB. Funciona en Chrome/Edge de escritorio y en
// Chrome para Android (USB-OTG). NO funciona en iOS/Safari (no hay WebUSB).
//
// La impresora se vincula UNA sola vez con un gesto del usuario
// (navigator.usb.requestDevice). El navegador recuerda el permiso por origen,
// así que en arranques siguientes la reconectamos sola con getDevices().

import { formatCurrency } from '../utils/helpers';

const AUTOPRINT_KEY = 'thermalAutoPrint';
const PRINTER_WIDTH = 32; // caracteres por línea a 58mm con fuente A

// ----------------------------------------------------------------------------
// Soporte / preferencias
// ----------------------------------------------------------------------------

export const isWebUsbSupported = () =>
  typeof navigator !== 'undefined' && !!navigator.usb;

export const isAutoPrintEnabled = () =>
  localStorage.getItem(AUTOPRINT_KEY) === 'true';

export const setAutoPrintEnabled = (enabled) =>
  localStorage.setItem(AUTOPRINT_KEY, enabled ? 'true' : 'false');

// ----------------------------------------------------------------------------
// Conexión WebUSB
// ----------------------------------------------------------------------------

let cachedDevice = null;

// Si el SO desconecta la impresora (se apaga, se queda sin papel y la apagan,
// o se desenchufa), el objeto USB en memoria queda MUERTO. Escuchamos el evento
// para olvidar esa referencia y volver a tomar el dispositivo "fresco" al
// reconectar, sin necesidad de refrescar la página.
if (typeof navigator !== 'undefined' && navigator.usb) {
  navigator.usb.addEventListener('disconnect', (event) => {
    if (cachedDevice && event.device === cachedDevice) {
      cachedDevice = null;
    }
  });
}

/** Devuelve la impresora ya autorizada (sin pedir gesto), o null. */
export const getPairedPrinter = async () => {
  if (!isWebUsbSupported()) return null;
  // getDevices() siempre devuelve el objeto "vivo" del dispositivo. Tras un
  // desenchufe/reenchufe el objeto viejo queda inservible, así que reconciliamos
  // el cache contra la lista actual en cada llamada.
  const devices = await navigator.usb.getDevices();
  if (devices.length === 0) {
    cachedDevice = null;
    return null;
  }
  if (!cachedDevice || !devices.includes(cachedDevice)) {
    cachedDevice = devices[0];
  }
  return cachedDevice;
};

/** Pide al usuario elegir la impresora. Requiere un gesto (click). */
export const requestPrinter = async () => {
  if (!isWebUsbSupported()) {
    throw new Error(
      'Este navegador no soporta WebUSB. Usá Chrome o Edge de escritorio.',
    );
  }
  // filters: [] permite elegir cualquier dispositivo USB conectado.
  const device = await navigator.usb.requestDevice({ filters: [] });
  cachedDevice = device;
  return device;
};

/** Abre el dispositivo y devuelve { device, interfaceNumber, endpointNumber }. */
const openDevice = async (device) => {
  if (!device.opened) await device.open();
  if (device.configuration === null) await device.selectConfiguration(1);

  // Buscamos una interfaz con un endpoint BULK de salida (OUT).
  let target = null;
  for (const iface of device.configuration.interfaces) {
    for (const alt of iface.alternates) {
      const endpoint = alt.endpoints.find(
        (e) => e.direction === 'out' && e.type === 'bulk',
      );
      if (endpoint) {
        target = {
          interfaceNumber: iface.interfaceNumber,
          endpointNumber: endpoint.endpointNumber,
        };
        break;
      }
    }
    if (target) break;
  }

  if (!target) {
    throw new Error('No se encontró un endpoint de impresión en el dispositivo.');
  }

  try {
    await device.claimInterface(target.interfaceNumber);
  } catch {
    // En algunos equipos el SO toma la interfaz; intentamos liberarla.
    await device.releaseInterface(target.interfaceNumber).catch(() => {});
    await device.claimInterface(target.interfaceNumber);
  }

  return { device, ...target };
};

/** Envía bytes crudos (ESC/POS) a la impresora. */
const sendBytes = async (device, bytes) => {
  const { interfaceNumber, endpointNumber } = await openDevice(device);
  // Enviamos en bloques para no saturar el buffer de impresoras baratas.
  const CHUNK = 4096;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    await device.transferOut(endpointNumber, bytes.slice(i, i + CHUNK));
  }
  await device.releaseInterface(interfaceNumber).catch(() => {});
};

// ----------------------------------------------------------------------------
// Construcción del ticket (ESC/POS)
// ----------------------------------------------------------------------------

const ESC = 0x1b;
const GS = 0x1d;

// Caracteres fuera de Latin-1 que igual queremos soportar (su byte en CP1252).
const CP_MAP = {
  '€': 0x80,
};

/**
 * Convierte un string a bytes para la impresora (code page WPC1252 / Latin-1).
 * Las tildes y la ñ son code points Unicode <= 0xFF, que coinciden con su byte
 * Latin-1 (ej: ñ = U+00F1 = 0xF1), así que los enviamos tal cual.
 */
const encodeText = (text) => {
  const out = [];
  for (const ch of String(text)) {
    const code = ch.charCodeAt(0);
    if (code <= 0xff) {
      out.push(code); // ASCII + Latin-1 (incluye á é í ó ú ñ ü ¿ ¡ °)
    } else if (CP_MAP[ch] !== undefined) {
      out.push(CP_MAP[ch]); // fuera de Latin-1 (€, etc.)
    } else {
      out.push(0x3f); // '?' para lo que no podamos mapear
    }
  }
  return out;
};

/** Línea con etiqueta a la izquierda y valor a la derecha (rellena con espacios). */
const lineLR = (left, right) => {
  const l = String(left);
  const r = String(right);
  const space = Math.max(1, PRINTER_WIDTH - l.length - r.length);
  return l + ' '.repeat(space) + r;
};

const DIVIDER = '-'.repeat(PRINTER_WIDTH);

/**
 * Arma el array de bytes ESC/POS del ticket de una venta.
 * @param {object} venta - objeto de venta (items, total, pagos, fecha, hora...)
 * @param {object} datosNegocio - { nombre, direccion, cuit }
 * @param {object} cliente - { nombre, cuit }
 */
export const buildTicket = (venta, datosNegocio = {}, cliente = null) => {
  const bytes = [];
  const push = (...b) => bytes.push(...b);
  const text = (str) => push(...encodeText(str));
  const newline = () => push(0x0a);
  const line = (str = '') => {
    text(str);
    newline();
  };

  // Init
  push(ESC, 0x40); // ESC @  -> reset
  push(ESC, 0x74, 0x10); // ESC t 16 -> code page WPC1252 (Latin-1). Estas
  // impresoras interpretan los bytes altos como Latin-1/CP1252, no CP437.

  // Encabezado: centrado + negrita + doble alto
  push(ESC, 0x61, 0x01); // ESC a 1 -> centrado
  push(ESC, 0x21, 0x30); // ESC ! 0x30 -> doble ancho/alto
  push(ESC, 0x45, 0x01); // ESC E 1 -> negrita
  line(datosNegocio?.nombre || 'Mi Negocio');
  push(ESC, 0x21, 0x00); // tamaño normal
  push(ESC, 0x45, 0x00); // negrita off

  if (datosNegocio?.direccion) line(datosNegocio.direccion);
  if (datosNegocio?.cuit) line(`CUIT: ${datosNegocio.cuit}`);

  push(ESC, 0x61, 0x00); // ESC a 0 -> izquierda
  line(DIVIDER);

  // Datos de la venta
  if (venta?.fecha || venta?.hora)
    line(`Fecha: ${venta.fecha || ''} ${venta.hora || ''}`.trim());
  if (venta?.id) line(`Comprobante: #${String(venta.id).substring(0, 12)}`);
  const clienteNombre =
    cliente?.nombre || venta?.clienteNombre || 'Consumidor Final';
  line(`Cliente: ${clienteNombre}`);
  const clienteCuit = cliente?.cuit || venta?.clienteCuit;
  if (clienteCuit) line(`CUIT/CUIL: ${clienteCuit}`);
  if (venta?.vendedorNombre) line(`Atendido por: ${venta.vendedorNombre}`);
  line(DIVIDER);

  // Items
  const items = Array.isArray(venta?.items) ? venta.items : [];
  items.forEach((item) => {
    line(item.nombre || 'Item');
    const cant = Number(item.cantidad) || 0;
    // En el carrito, precioFinal es el TOTAL de la línea (precio x cantidad,
    // con descuento). El unitario es precioOriginal; si falta, lo derivamos.
    const totalLinea = Number(item.precioFinal) || 0;
    const precioUnit =
      Number(item.precioOriginal) ||
      (cant > 0 ? totalLinea / cant : totalLinea);
    const izq = `  ${cant} x $${formatCurrency(precioUnit)}`;
    line(lineLR(izq, `$${formatCurrency(totalLinea)}`));
    if (item.descuentoPorcentaje > 0) {
      line(`  (Desc. ${item.descuentoPorcentaje}%)`);
    }
  });
  line(DIVIDER);

  // Total (doble alto, negrita)
  push(ESC, 0x21, 0x10); // doble alto
  push(ESC, 0x45, 0x01);
  line(lineLR('TOTAL:', `$${formatCurrency(venta?.total)}`));
  push(ESC, 0x21, 0x00);
  push(ESC, 0x45, 0x00);

  // Pagos
  const pagos = Array.isArray(venta?.pagos) ? venta.pagos : [];
  if (pagos.length > 0) {
    line('Pagos:');
    pagos.forEach((p) => {
      const metodo = String(p.metodo || '').replace(/_/g, ' ');
      line(lineLR(`  ${metodo}`, `$${formatCurrency(p.monto)}`));
    });
  } else if (venta?.metodoPago) {
    line(`Pago: ${venta.metodoPago}`);
  }
  if (Number(venta?.vuelto) > 0) {
    line(lineLR('Vuelto:', `$${formatCurrency(venta.vuelto)}`));
  }
  if (venta?.tipoFactura) line(`Tipo: ${venta.tipoFactura}`);

  line(DIVIDER);

  // Pie
  push(ESC, 0x61, 0x01); // centrado
  line('Gracias por su compra!');
  line('Documento no valido como factura.');

  // Avance y corte (si la impresora tiene cutter; si no, solo avanza)
  push(0x0a, 0x0a, 0x0a, 0x0a);
  push(GS, 0x56, 0x42, 0x00); // GS V B 0 -> corte parcial con avance

  return new Uint8Array(bytes);
};

// ----------------------------------------------------------------------------
// API de alto nivel
// ----------------------------------------------------------------------------

/**
 * Envía bytes a la impresora con un reintento. Si el primer intento falla
 * porque el dispositivo quedó "muerto" tras apagarlo/desenchufarlo, olvidamos
 * el cache, volvemos a tomar el dispositivo fresco y reintentamos una vez.
 */
const printBytes = async (bytes) => {
  let lastErr = null;
  // Hasta 3 intentos: tras un desenchufe/reenchufe el dispositivo tarda una
  // fracción de segundo en re-aparecer en el sistema. Entre intentos olvidamos
  // el cache y esperamos un poco para tomar el dispositivo ya "fresco".
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) {
      cachedDevice = null;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    const device = await getPairedPrinter();
    if (!device) {
      lastErr = new Error(
        'No hay una impresora térmica vinculada o está desconectada. ' +
          'Revisá que esté encendida y conectada, y volvé a intentar.',
      );
      continue;
    }
    try {
      await sendBytes(device, bytes);
      return; // impreso OK
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
};

/** Imprime un ticket de venta. Lanza error si no hay impresora vinculada. */
export const printVentaTicket = async (venta, datosNegocio, cliente) => {
  const bytes = buildTicket(venta, datosNegocio, cliente);
  await printBytes(bytes);
};

/** Arma el array de bytes ESC/POS del ticket de una Nota de Crédito/Débito. */
export const buildNotaTicket = (nota, datosNegocio = {}, cliente = null) => {
  const bytes = [];
  const push = (...b) => bytes.push(...b);
  const text = (str) => push(...encodeText(str));
  const newline = () => push(0x0a);
  const line = (str = '') => {
    text(str);
    newline();
  };

  push(ESC, 0x40); // reset
  push(ESC, 0x74, 0x10); // code page WPC1252 (Latin-1)

  // Encabezado del negocio (centrado, doble, negrita)
  push(ESC, 0x61, 0x01);
  push(ESC, 0x21, 0x30);
  push(ESC, 0x45, 0x01);
  line(datosNegocio?.nombre || 'Mi Negocio');
  push(ESC, 0x21, 0x00);
  push(ESC, 0x45, 0x00);
  if (datosNegocio?.direccion) line(datosNegocio.direccion);
  if (datosNegocio?.cuit) line(`CUIT: ${datosNegocio.cuit}`);

  // Título del comprobante
  const esDebito = nota?.tipo === 'debito';
  push(ESC, 0x45, 0x01);
  line(esDebito ? 'NOTA DE DEBITO' : 'NOTA DE CREDITO');
  push(ESC, 0x45, 0x00);
  push(ESC, 0x61, 0x00); // izquierda
  line(DIVIDER);

  // Datos
  if (nota?.fecha || nota?.hora)
    line(`Fecha: ${nota.fecha || ''} ${nota.hora || ''}`.trim());
  if (nota?.cbteNro) line(`Comprobante: #${nota.cbteNro}`);
  else if (nota?.id) line(`Comprobante: #${String(nota.id).substring(0, 12)}`);
  const clienteNombre =
    cliente?.nombre || nota?.clienteNombre || 'Consumidor Final';
  line(`Cliente: ${clienteNombre}`);
  const clienteCuit = cliente?.cuit || nota?.clienteCuit;
  if (clienteCuit) line(`CUIT/CUIL: ${clienteCuit}`);
  if (nota?.ventaRelacionadaId)
    line(`Comp. asociado: ${nota.ventaRelacionadaId}`);
  if (nota?.motivo) line(`Motivo: ${nota.motivo}`);
  line(DIVIDER);

  // Ítems devueltos (si hubo devolución)
  const items = Array.isArray(nota?.itemsDevueltos) ? nota.itemsDevueltos : [];
  items.forEach((item) => {
    line(item.nombre || 'Item');
    const cant = Number(item.cantidad) || 0;
    const unit = Number(item.precioOriginal) || 0;
    line(
      lineLR(
        `  ${cant} x $${formatCurrency(unit)}`,
        `$${formatCurrency(unit * cant)}`,
      ),
    );
  });
  if (items.length > 0) line(DIVIDER);

  // Total (doble alto, negrita)
  push(ESC, 0x21, 0x10);
  push(ESC, 0x45, 0x01);
  line(lineLR('TOTAL:', `$${formatCurrency(nota?.monto ?? nota?.total)}`));
  push(ESC, 0x21, 0x00);
  push(ESC, 0x45, 0x00);

  // CAE (si es comprobante fiscal)
  if (nota?.cae) {
    line(DIVIDER);
    line(`CAE: ${nota.cae}`);
    const raw = String(nota.caeFchVto || '');
    if (raw) {
      const vto = /^\d{8}$/.test(raw)
        ? `${raw.slice(6, 8)}/${raw.slice(4, 6)}/${raw.slice(0, 4)}`
        : raw;
      line(`Vto CAE: ${vto}`);
    }
  }

  line(DIVIDER);
  push(ESC, 0x61, 0x01); // centrado
  line(nota?.cae ? 'Comprobante Autorizado' : 'Documento no valido como factura');

  push(0x0a, 0x0a, 0x0a, 0x0a);
  push(GS, 0x56, 0x42, 0x00); // corte parcial

  return new Uint8Array(bytes);
};

/** Imprime el ticket térmico de una Nota de Crédito/Débito. */
export const printNotaTicket = async (nota, datosNegocio, cliente) => {
  const bytes = buildNotaTicket(nota, datosNegocio, cliente);
  await printBytes(bytes);
};

/** Imprime una página de prueba para verificar la conexión. */
export const printTestPage = async (datosNegocio = {}) => {
  const ventaPrueba = {
    id: 'PRUEBA0000',
    fecha: new Date().toLocaleDateString('es-AR'),
    hora: new Date().toLocaleTimeString('es-AR'),
    items: [
      { nombre: 'Prueba de impresion', cantidad: 1, precioFinal: 0 },
      { nombre: 'Acentos: añ é í ó ú', cantidad: 1, precioFinal: 0 },
    ],
    total: 0,
    pagos: [],
    tipoFactura: 'X',
  };
  const bytes = buildTicket(ventaPrueba, datosNegocio, null);
  await printBytes(bytes);
};
