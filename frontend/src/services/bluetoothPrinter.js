// frontend/src/services/bluetoothPrinter.js
//
// Impresión de tickets en impresoras térmicas Bluetooth (BLE) usando la Web
// Bluetooth API + comandos ESC/POS. Funciona en Chrome/Edge (Android y desktop).
// Es opcional: si el navegador no soporta Web Bluetooth, se avisa.

// Servicios BLE comunes de impresoras térmicas ESC/POS.
const SERVICIOS = [
  '000018f0-0000-1000-8000-00805f9b34fb',
  '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // Nordic UART
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC
  0x18f0,
  0xff00,
];

let cachedChar = null;

export const soportaBluetooth = () =>
  typeof navigator !== 'undefined' && !!navigator.bluetooth;

// Obtiene (o pide) la característica de escritura de la impresora.
export async function conectarImpresora() {
  if (
    cachedChar &&
    cachedChar.service?.device?.gatt?.connected
  ) {
    return cachedChar;
  }
  if (!soportaBluetooth()) {
    throw new Error(
      'Tu navegador no soporta Bluetooth. Usá Chrome o Edge (Android o PC).',
    );
  }
  const device = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: SERVICIOS,
  });
  const server = await device.gatt.connect();
  const services = await server.getPrimaryServices();
  for (const svc of services) {
    const chars = await svc.getCharacteristics();
    for (const c of chars) {
      if (c.properties.write || c.properties.writeWithoutResponse) {
        cachedChar = c;
        return c;
      }
    }
  }
  throw new Error('No se encontró una impresora compatible.');
}

// Escribe bytes en tandas (los BLE tienen límite de tamaño por paquete).
async function escribir(char, bytes) {
  const data = new Uint8Array(bytes);
  const CHUNK = 180;
  for (let i = 0; i < data.length; i += CHUNK) {
    const slice = data.slice(i, i + CHUNK);
    if (char.properties.writeWithoutResponse) {
      // eslint-disable-next-line no-await-in-loop
      await char.writeValueWithoutResponse(slice);
    } else {
      // eslint-disable-next-line no-await-in-loop
      await char.writeValue(slice);
    }
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, 20));
  }
}

// Codifica texto a bytes latin1, quitando acentos (las térmicas no los manejan).
const enc = (str) => {
  const clean = String(str)
    .normalize('NFD')
    .replace(new RegExp('[\\u0300-\\u036f]', 'g'), '');
  const out = [];
  for (let i = 0; i < clean.length; i += 1) {
    const code = clean.charCodeAt(i);
    out.push(code < 256 ? code : 63); // '?' para caracteres no latin1
  }
  return out;
};

const ANCHO = 32; // columnas típicas de una térmica de 58mm
const linea = (izq, der) => {
  const l = String(izq).slice(0, ANCHO);
  const espacios = ANCHO - l.length - String(der).length;
  return l + (espacios > 0 ? ' '.repeat(espacios) : ' ') + der;
};

// Arma el ticket de una venta en bytes ESC/POS.
export function construirTicketVenta(venta, datosNegocio, cliente, fmt) {
  const b = [];
  const push = (...xs) => xs.forEach((x) => b.push(x));
  const text = (s) => enc(s).forEach((x) => b.push(x));
  const nl = () => b.push(0x0a);
  const sep = () => {
    text('-'.repeat(ANCHO));
    nl();
  };

  push(0x1b, 0x40); // init

  // Encabezado centrado.
  push(0x1b, 0x61, 0x01); // center
  push(0x1b, 0x21, 0x10); // doble alto
  push(0x1b, 0x45, 0x01); // bold
  text(datosNegocio?.nombre || 'Mi Negocio');
  nl();
  push(0x1b, 0x45, 0x00); // bold off
  push(0x1b, 0x21, 0x00); // normal
  if (datosNegocio?.direccion) {
    text(datosNegocio.direccion);
    nl();
  }
  if (datosNegocio?.cuit) {
    text(`CUIT: ${datosNegocio.cuit}`);
    nl();
  }

  // Datos de la venta (alineado izquierda).
  push(0x1b, 0x61, 0x00);
  sep();
  text(`Fecha: ${venta.fecha || ''} ${venta.hora || ''}`.trim());
  nl();
  text(`Comprob: ${String(venta.id || '').slice(0, 12)}`);
  nl();
  text(`Cliente: ${cliente?.nombre || 'Consumidor Final'}`);
  nl();
  sep();

  (venta.items || []).forEach((it) => {
    text(String(it.nombre || '').slice(0, ANCHO));
    nl();
    const unit = fmt(it.precioOriginal ?? it.precioFinal);
    const sub = fmt((it.precioFinal || 0) * (it.cantidad || 1));
    text(linea(`  ${it.cantidad} x ${unit}`, `$${sub}`));
    nl();
  });
  sep();

  // Total a la derecha, doble alto.
  push(0x1b, 0x61, 0x02); // right
  push(0x1b, 0x21, 0x10);
  text(`TOTAL: $${fmt(venta.total)}`);
  nl();
  push(0x1b, 0x21, 0x00);

  // Pie centrado.
  push(0x1b, 0x61, 0x01);
  nl();
  text('Gracias por su compra!');
  nl();
  text('Doc no valido como factura');
  nl();
  nl();
  nl();
  nl();

  push(0x1d, 0x56, 0x00); // corte (si la impresora tiene cutter)
  return b;
}

// Conecta (si hace falta) e imprime el ticket de una venta por Bluetooth.
export async function imprimirTicketBluetooth(
  venta,
  datosNegocio,
  cliente,
  fmt,
) {
  const char = await conectarImpresora();
  const bytes = construirTicketVenta(venta, datosNegocio, cliente, fmt);
  await escribir(char, bytes);
}

// Imprime una línea de prueba (para el botón "Probar impresora").
export async function imprimirPrueba() {
  const char = await conectarImpresora();
  const b = [];
  const text = (s) => enc(s).forEach((x) => b.push(x));
  b.push(0x1b, 0x40, 0x1b, 0x61, 0x01);
  text('*** PRUEBA OK ***');
  b.push(0x0a, 0x0a, 0x0a, 0x0a);
  b.push(0x1d, 0x56, 0x00);
  await escribir(char, b);
}
