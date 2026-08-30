// El recorrido del repartidor y cuánto falta para que llegue.
//
// Acá viven las cuentas: cuándo vale la pena volver a pedir la ruta, cuánto se
// tarda de verdad y cómo se lee la geometría que devuelve el servicio. La parte
// que habla con Firestore está en index.js.
//
// La regla que ordena todo: **la ruta NO se calcula cuando el cliente consulta
// el estado**. Esa consulta ocurre cada ocho segundos por pedido activo, así
// que tres pedidos en paralelo durante una hora son más de mil llamadas y se
// comerían la cuota diaria en dos horas. Se calcula cuando se mueve el
// repartidor, con los frenos de acá abajo, y se guarda en el pedido.

// Cada cuánto, como mucho, se vuelve a pedir la ruta.
const MS_ENTRE_CALCULOS = 90 * 1000;
// Si el repartidor se apartó más que esto de la ruta trazada, dobló por otro
// lado y hay que recalcular aunque no haya pasado el tiempo mínimo.
const DESVIO_M = 150;
// Faltando menos que esto, la ruta ya no cambia en nada útil: está por tocar el
// timbre. Se deja de gastar consultas.
const ETA_FINAL_S = 180;

/**
 * Decodifica la geometría que devuelven los servicios de rutas.
 *
 * Es el formato de polilínea codificada de Google, con precisión 5. Son treinta
 * líneas y evita sumar una dependencia entera al backend y otra al navegador.
 */
function decodificarPolilinea(codificada, precision = 5) {
  if (typeof codificada !== 'string' || !codificada) return [];
  const factor = Math.pow(10, precision);
  const puntos = [];
  let indice = 0;
  let lat = 0;
  let lng = 0;

  while (indice < codificada.length) {
    let resultado = 0;
    let desplazamiento = 0;
    let byte;
    do {
      byte = codificada.charCodeAt(indice++) - 63;
      resultado |= (byte & 0x1f) << desplazamiento;
      desplazamiento += 5;
    } while (byte >= 0x20);
    lat += resultado & 1 ? ~(resultado >> 1) : resultado >> 1;

    resultado = 0;
    desplazamiento = 0;
    do {
      byte = codificada.charCodeAt(indice++) - 63;
      resultado |= (byte & 0x1f) << desplazamiento;
      desplazamiento += 5;
    } while (byte >= 0x20);
    lng += resultado & 1 ? ~(resultado >> 1) : resultado >> 1;

    puntos.push({ lat: lat / factor, lng: lng / factor });
  }
  return puntos;
}

/** Distancia aproximada en metros. A escala de reparto alcanza y sobra. */
function metros(a, b) {
  return Math.hypot((a.lat - b.lat) * 111000, (a.lng - b.lng) * 92000);
}

/**
 * Qué tan lejos está un punto de una polilínea, en metros.
 *
 * Se usa para detectar que el repartidor dobló por otro lado. Se calcula acá y
 * no se le pregunta a nadie: es geometría de secundaria y sale gratis, mientras
 * que consultar el servicio de rutas para averiguarlo sería pagar por saber si
 * hay que pagar.
 */
function distanciaAPolilinea(punto, puntos) {
  if (!punto || !Array.isArray(puntos) || puntos.length === 0) return Infinity;
  if (puntos.length === 1) return metros(punto, puntos[0]);

  let minimo = Infinity;
  for (let i = 0; i < puntos.length - 1; i += 1) {
    minimo = Math.min(
      minimo,
      distanciaASegmento(punto, puntos[i], puntos[i + 1]),
    );
  }
  return minimo;
}

/** La distancia de un punto al segmento a-b, proyectándolo sobre él. */
function distanciaASegmento(p, a, b) {
  // Se trabaja en metros planos: a estas distancias la curvatura no cambia nada.
  const ax = 0;
  const ay = 0;
  const bx = (b.lng - a.lng) * 92000;
  const by = (b.lat - a.lat) * 111000;
  const px = (p.lng - a.lng) * 92000;
  const py = (p.lat - a.lat) * 111000;

  const largo2 = bx * bx + by * by;
  if (largo2 === 0) return Math.hypot(px - ax, py - ay);

  // Dónde cae la proyección sobre el segmento, recortada a sus extremos: si el
  // punto quedó "más allá" del final, la distancia es contra el extremo.
  let t = (px * bx + py * by) / largo2;
  t = Math.max(0, Math.min(1, t));

  return Math.hypot(px - bx * t, py - by * t);
}

/**
 * ¿Hay que volver a pedir la ruta?
 *
 * @param {object} ruta       la guardada: { calculadaEn, origen, puntos }
 * @param {object} posicion   dónde está el repartidor ahora
 * @param {number} etaS       segundos que faltarían según lo calculado
 * @param {number} ahora      timestamp, inyectable para poder probarlo
 */
function debeRecalcular(ruta, posicion, etaS, ahora = Date.now()) {
  if (!posicion) return false;
  // Todavía no hay ninguna: hay que calcularla sí o sí.
  if (!ruta || !ruta.calculadaEn) return true;

  // Está por llegar: la ruta ya no va a cambiar en nada que se note.
  if (Number.isFinite(etaS) && etaS <= ETA_FINAL_S) return false;

  // Se apartó del camino trazado: dobló por otro lado.
  const puntos = Array.isArray(ruta.puntos) ? ruta.puntos : [];
  if (puntos.length && distanciaAPolilinea(posicion, puntos) > DESVIO_M) {
    return true;
  }

  return ahora - ruta.calculadaEn >= MS_ENTRE_CALCULOS;
}

/**
 * El tiempo de llegada que se le muestra a la persona.
 *
 * Al número del servicio se le suma un colchón: ese número es tiempo de manejo
 * puro, sin semáforos, sin buscar dónde parar, sin subir hasta el timbre.
 *
 * Y se redondea para arriba a cinco minutos. Prometer quince y llegar en
 * catorce se siente bien; prometer once y llegar en catorce se siente mal, y es
 * el mismo viaje.
 */
function minutosParaMostrar(duracionS) {
  if (!Number.isFinite(duracionS) || duracionS < 0) return null;
  const conColchon = duracionS * 1.15 + 90;
  return Math.max(5, Math.ceil(conColchon / 60 / 5) * 5);
}

/**
 * Cuándo va a llegar, como momento exacto.
 *
 * Se guarda el instante de llegada y no los minutos que faltan. Con minutos, el
 * número quedaría congelado noventa segundos y después pegaría un salto; con un
 * instante, la pantalla resta contra el reloj en cada vuelta y el contador baja
 * solo. Es la diferencia entre un tiempo que se siente vivo y uno que parece
 * trabado.
 */
function llegadaEstimada(duracionS, ahora = Date.now()) {
  const min = minutosParaMostrar(duracionS);
  return min === null ? null : ahora + min * 60 * 1000;
}

/**
 * Cuando no se puede calcular la ruta, una estimación por distancia derecha.
 *
 * Peor que la real, pero siempre es mejor que no decir nada: el cliente quiere
 * saber si son cinco minutos o cuarenta. El factor de 1,4 es porque las calles
 * no van en línea recta.
 */
function etaAproximada(desde, hasta, kmPorHora = 25) {
  if (!desde || !hasta) return null;
  const m = metros(desde, hasta) * 1.4;
  return (m / 1000 / kmPorHora) * 3600 + 180;
}

module.exports = {
  decodificarPolilinea,
  distanciaAPolilinea,
  distanciaASegmento,
  debeRecalcular,
  minutosParaMostrar,
  llegadaEstimada,
  etaAproximada,
  metros,
  MS_ENTRE_CALCULOS,
  DESVIO_M,
  ETA_FINAL_S,
};
