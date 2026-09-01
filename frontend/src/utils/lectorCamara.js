// Leer códigos con la cámara, igual en Android que en iPhone.
//
// Andaba bien en iPhone y mal en Android, que es la mitad larga del mercado.
// Cuatro motivos, todos acá adentro para que las dos pantallas que escanean
// —el celular como pistola y el escáner de la carga— arreglen lo mismo una
// sola vez.
//
// **1. La cámara equivocada.** `facingMode: environment` en un Android con
// varias cámaras traseras suele devolver la gran angular, que no enfoca de
// cerca: las barras finas de un código quedan borrosas y no se leen nunca. El
// iPhone expone una sola cámara trasera lógica, por eso ahí no pasaba.
//
// **2. Muy poca resolución.** Sin pedir tamaño, el navegador da 640×480. Un
// EAN-13 a esa resolución, con la cámara a 20 cm, no tiene píxeles suficientes
// para separar las barras.
//
// **3. Probaba todos los formatos.** Sin decirle qué buscar, la librería
// intenta veinte codificaciones por cuadro. En un teléfono de gama media eso
// baja los cuadros por segundo a la mitad y encima da más falsos negativos.
//
// **4. Enfoque fijo.** Sin pedir enfoque continuo, Android se queda con el que
// tenía y nunca acomoda.

import { BrowserMultiFormatReader } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';

/**
 * Lo que puede aparecer en un comercio argentino, y nada más.
 *
 * EAN-13 es el de los envases; EAN-8 el de los chicos; UPC viene en lo
 * importado; CODE-128 e ITF los usan las balanzas y las cajas de bulto; y QR
 * para las etiquetas que imprime el propio sistema.
 */
const FORMATOS = [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.ITF,
  BarcodeFormat.QR_CODE,
];

function pistas() {
  const h = new Map();
  h.set(DecodeHintType.POSSIBLE_FORMATS, FORMATOS);
  // Insiste más en cada cuadro. Cuesta CPU, pero el cuello de botella real es
  // la cámara, no el procesador.
  h.set(DecodeHintType.TRY_HARDER, true);
  return h;
}

/** Un lector configurado para códigos de comercio. */
export function crearLector() {
  return new BrowserMultiFormatReader(pistas(), {
    // Sin esto intenta decodificar tan seguido como puede y calienta el
    // teléfono sin leer más rápido.
    delayBetweenScanAttempts: 100,
  });
}

/**
 * Las lentes que NO sirven para leer un código de cerca.
 *
 * Android expone la gran angular, la macro y hasta el sensor de profundidad
 * como si fueran cámaras comunes. La gran angular es la que más problemas da:
 * suele ser la que el navegador elige sola y tiene una distancia mínima de
 * enfoque de medio metro.
 */
const LENTES_QUE_NO =
  /wide|ultra|gran ?angular|depth|profundidad|macro|mono|tele/i;

/** ¿Es una cámara trasera? Los navegadores lo escriben de varias formas. */
const ES_TRASERA = /back|rear|environment|trasera|posterior/i;

/**
 * Elige la cámara con la que conviene arrancar.
 *
 * Se queda con la primera trasera que no sea una lente rara: en Android el
 * sensor principal casi siempre es la primera de la lista.
 *
 * Devuelve `undefined` si no hay con qué decidir —los navegadores esconden los
 * nombres hasta que se da permiso—, y entonces se arranca por `facingMode`,
 * que es lo que hacíamos antes.
 *
 * @param {MediaDeviceInfo[]} dispositivos
 * @returns {string|undefined} deviceId
 */
export function elegirCamara(dispositivos) {
  const camaras = (dispositivos || []).filter(
    (d) => d?.kind === 'videoinput' && d?.label,
  );
  if (!camaras.length) return undefined;

  const traseras = camaras.filter((d) => ES_TRASERA.test(d.label));
  const candidatas = traseras.length ? traseras : camaras;

  const buena = candidatas.find((d) => !LENTES_QUE_NO.test(d.label));
  return (buena || candidatas[0]).deviceId;
}

/**
 * Las restricciones de video.
 *
 * 1280×720 no es capricho: es lo mínimo para que un EAN-13 a 20 cm tenga
 * píxeles suficientes por barra. Van como `ideal` y no como `exact` para que
 * un teléfono viejo que no llega igual abra la cámara en vez de fallar.
 */
export function restricciones(deviceId) {
  return {
    video: {
      ...(deviceId
        ? { deviceId: { exact: deviceId } }
        : { facingMode: { ideal: 'environment' } }),
      width: { ideal: 1280 },
      height: { ideal: 720 },
      // Lo que el navegador no entienda de acá lo ignora, no falla.
      advanced: [{ focusMode: 'continuous' }],
    },
  };
}

/** Las cámaras que se le pueden ofrecer a la persona para cambiar a mano. */
export async function listarCamaras() {
  try {
    const todos = await navigator.mediaDevices.enumerateDevices();
    return todos.filter((d) => d.kind === 'videoinput');
  } catch {
    return [];
  }
}

/**
 * Un nombre que se entienda, en vez de "camera2 0, facing back".
 */
export function nombreDeCamara(dispositivo, indice) {
  const etiqueta = String(dispositivo?.label || '').trim();
  if (!etiqueta) return `Cámara ${indice + 1}`;
  if (LENTES_QUE_NO.test(etiqueta)) return `${etiqueta} (no sirve de cerca)`;
  return etiqueta;
}

/**
 * ¿Este stream puede prender la linterna?
 *
 * Va aparte de la de ZXing porque el escáner con IA abre la cámara a mano, con
 * getUserMedia, y ahí no hay controles de la librería: la linterna se pide
 * sobre la pista de video.
 */
export function streamTieneLinterna(stream) {
  try {
    const pista = stream?.getVideoTracks?.()[0];
    return Boolean(pista?.getCapabilities?.().torch);
  } catch {
    return false;
  }
}

/** Prende o apaga la linterna de un stream abierto a mano. */
export async function linternaDeStream(stream, encendida) {
  const pista = stream?.getVideoTracks?.()[0];
  if (!pista) return false;
  try {
    await pista.applyConstraints({ advanced: [{ torch: !!encendida }] });
    return true;
  } catch {
    return false;
  }
}
