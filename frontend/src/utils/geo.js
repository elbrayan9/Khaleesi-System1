// Cuentas de geografía para el mapa del pedido.
//
// Son funciones puras y sin dependencias: se prueban solas y sirven igual en el
// navegador que en una Cloud Function.

// Radio medio de la Tierra, en metros.
const RADIO_TIERRA = 6371000;

const aRadianes = (grados) => (grados * Math.PI) / 180;
const aGrados = (radianes) => (radianes * 180) / Math.PI;

/**
 * Distancia en metros entre dos puntos {lat, lng}.
 *
 * Fórmula del haversine. A escala de un reparto —pocos kilómetros— el error
 * frente a una elipsoide es de centímetros, así que no hace falta nada más
 * pesado.
 */
export function distanciaMetros(a, b) {
  if (!esPunto(a) || !esPunto(b)) return 0;
  const dLat = aRadianes(b.lat - a.lat);
  const dLng = aRadianes(b.lng - a.lng);
  const lat1 = aRadianes(a.lat);
  const lat2 = aRadianes(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * RADIO_TIERRA * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Rumbo de `a` hacia `b`, en grados desde el norte (0 = norte, 90 = este).
 *
 * Se usa para saber si el vehículo va hacia la izquierda o la derecha de la
 * pantalla y espejar el ícono.
 */
export function bearing(a, b) {
  if (!esPunto(a) || !esPunto(b)) return 0;
  const lat1 = aRadianes(a.lat);
  const lat2 = aRadianes(b.lat);
  const dLng = aRadianes(b.lng - a.lng);

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (aGrados(Math.atan2(y, x)) + 360) % 360;
}

/**
 * Un punto entre `a` y `b`, con `t` de 0 a 1.
 *
 * Interpolación lineal a secas. En distancias de reparto la diferencia con
 * seguir el arco real de la esfera es de milímetros.
 */
export function interpolar(a, b, t) {
  const p = Math.max(0, Math.min(1, Number(t) || 0));
  return {
    lat: a.lat + (b.lat - a.lat) * p,
    lng: a.lng + (b.lng - a.lng) * p,
  };
}

// Cuánto puede durar como mínimo y como máximo la animación de un tramo.
export const INTERVALO_MIN = 3000;
export const INTERVALO_MAX = 20000;
const INTERVALO_POR_DEFECTO = 12000;

/**
 * Cuánto tarda en llegar la próxima posición, estimado a partir de las
 * anteriores.
 *
 * Es el número que decide cuánto dura la animación de un tramo, y de él depende
 * que el marcador se vea vivo. Las posiciones llegan cada 15-23 segundos: si el
 * tramo se animara en un segundo, el marcador quedaría quieto veinte de cada
 * veintidós y se leería como colgado. Estirando la animación hasta que llegue
 * el dato siguiente, siempre está en movimiento.
 *
 * Se usa la mediana y no el promedio: un solo dato tardío —un túnel, la
 * pantalla apagada— no tiene que inflar la duración de todas las animaciones
 * que vengan después.
 *
 * @param {number[]} gaps  milisegundos entre posiciones consecutivas
 */
export function estimarIntervalo(gaps) {
  const validos = (Array.isArray(gaps) ? gaps : [])
    .map(Number)
    .filter((n) => Number.isFinite(n) && n > 0)
    .slice(-3);

  if (validos.length === 0) return INTERVALO_POR_DEFECTO;

  const ordenados = [...validos].sort((a, b) => a - b);
  const medio = Math.floor(ordenados.length / 2);
  const mediana =
    ordenados.length % 2 === 0
      ? (ordenados[medio - 1] + ordenados[medio]) / 2
      : ordenados[medio];

  return Math.max(INTERVALO_MIN, Math.min(INTERVALO_MAX, mediana));
}

/** ¿Es un {lat, lng} usable? */
export function esPunto(p) {
  return Boolean(p) && Number.isFinite(p.lat) && Number.isFinite(p.lng);
}
