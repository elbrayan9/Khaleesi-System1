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

/** Devuelve la impresora ya autorizada (sin pedir gesto), o null. */
export const getPairedPrinter = async () => {
  if (!isWebUsbSupported()) return null;
  if (cachedDevice) return cachedDevice;
  const devices = await navigator.usb.getDevices();
  cachedDevice = devices[0] || null;
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

// Mapa mínimo de caracteres latinos a CP437/CP850 (los que usan estas impresoras).
const CP_MAP = {
  á: 0xa0, é: 0x82, í: 0xa1, ó: 0xa2, ú: 0xa3, ñ: 0xa4, Ñ: 0xa5,
  ü: 0x81, Á: 0x41, É: 0x90, Í: 0x49, Ó: 0x4f, Ú: 0x55, '¿': 0xa8,
  '¡': 0xad, '°': 0xf8, '€': 0x45,
};

/** Convierte un string a bytes usando el code page de la impresora. */
const encodeText = (text) => {
  const out = [];
  for (const ch of String(text)) {
    const code = ch.charCodeAt(0);
    if (code < 128) {
      out.push(code);
    } else if (CP_MAP[ch] !== undefined) {
      out.push(CP_MAP[ch]);
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
  push(ESC, 0x74, 0x00); // ESC t 0 -> code page CP437

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
    const precioUnit = Number(item.precioFinal ?? item.precioOriginal) || 0;
    const subtotal = precioUnit * cant;
    const izq = `  ${cant} x $${formatCurrency(precioUnit)}`;
    line(lineLR(izq, `$${formatCurrency(subtotal)}`));
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

/** Imprime un ticket de venta. Lanza error si no hay impresora vinculada. */
export const printVentaTicket = async (venta, datosNegocio, cliente) => {
  const device = await getPairedPrinter();
  if (!device) {
    throw new Error(
      'No hay una impresora térmica vinculada. Conectala desde Configuración.',
    );
  }
  const bytes = buildTicket(venta, datosNegocio, cliente);
  await sendBytes(device, bytes);
};

/** Imprime una página de prueba para verificar la conexión. */
export const printTestPage = async (datosNegocio = {}) => {
  const device = await getPairedPrinter();
  if (!device) {
    throw new Error('No hay una impresora térmica vinculada.');
  }
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
  await sendBytes(device, bytes);
};
