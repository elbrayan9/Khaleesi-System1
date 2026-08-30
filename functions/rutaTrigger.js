// Calcular el recorrido del repartidor hasta la casa del cliente.
//
// Se dispara cuando el repartidor manda una posición nueva, y NO cuando el
// cliente consulta el estado. La diferencia importa: esa consulta ocurre cada
// ocho segundos por pedido activo, así que atarla al servicio de rutas serían
// más de mil llamadas por hora con tres pedidos en paralelo, y la cuota diaria
// se agotaría antes del mediodía. Acá se calcula con frenos, se guarda en el
// pedido, y la consulta del cliente solo lee lo que quedó escrito.
//
// Las cuentas —cuándo recalcular, cómo leer la geometría, cuánto tarda de
// verdad— están en ruta.js, con sus pruebas.

const ruta = require('./ruta');

/**
 * Le pide el recorrido a OpenRouteService.
 *
 * Devuelve `{ polilinea, distanciaM, duracionS }` o `null` si no hubo ruta.
 * Lanza si el servicio falla, para distinguir "no hay camino" de "no se pudo
 * preguntar": lo primero es definitivo, lo segundo se reintenta solo en la
 * próxima posición.
 */
async function pedirRuta(desde, hasta, apiKey) {
  const r = await fetch(
    'https://api.openrouteservice.org/v2/directions/driving-car',
    {
      method: 'POST',
      headers: {
        Authorization: apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        // El servicio los quiere al revés de lo que uno diría: longitud, latitud.
        coordinates: [
          [desde.lng, desde.lat],
          [hasta.lng, hasta.lat],
        ],
        // En moto o auto por calles; es lo que hace un reparto urbano.
        instructions: false,
      }),
    },
  );
  if (!r.ok) {
    throw new Error(`OpenRouteService respondió ${r.status}`);
  }
  const datos = await r.json();
  const primera = datos?.routes?.[0];
  if (!primera?.geometry) return null;

  return {
    polilinea: String(primera.geometry),
    distanciaM: Math.round(Number(primera.summary?.distance) || 0),
    duracionS: Math.round(Number(primera.summary?.duration) || 0),
  };
}

/**
 * Decide qué hacer con un pedido cuando su repartidor se movió.
 *
 * Se separó de Firestore a propósito: recibe el estado y devuelve qué habría
 * que guardar, así se puede probar sin emulador ni red.
 *
 * @returns {object|null} lo que hay que escribir en el pedido, o null si no
 */
async function calcularParaPedido(
  pedido,
  posicion,
  apiKey,
  ahora = Date.now(),
) {
  const destino = pedido?.cliente?.geo;
  if (!destino || !Number.isFinite(destino.lat)) return null;

  const guardada = pedido.ruta || null;
  const puntos = guardada?.polilinea
    ? ruta.decodificarPolilinea(guardada.polilinea)
    : [];
  const etaS = pedido.eta?.llegadaTs
    ? (pedido.eta.llegadaTs - ahora) / 1000
    : null;

  if (!ruta.debeRecalcular({ ...guardada, puntos }, posicion, etaS, ahora)) {
    return null;
  }

  try {
    const r = await pedirRuta(posicion, destino, apiKey);
    if (!r) return null;
    return {
      ruta: {
        polilinea: r.polilinea,
        distanciaM: r.distanciaM,
        duracionS: r.duracionS,
        calculadaEn: ahora,
        origen: { lat: posicion.lat, lng: posicion.lng },
      },
      eta: {
        llegadaTs: ruta.llegadaEstimada(r.duracionS, ahora),
        calculadoEn: ahora,
      },
      rutaError: null,
    };
  } catch (e) {
    // Sin ruta se sigue dando un tiempo, calculado por distancia derecha: el
    // cliente quiere saber si son cinco minutos o cuarenta, y quedarse sin
    // ningún número es peor que darle uno aproximado.
    console.warn('[ruta] no se pudo calcular:', e?.message);
    const aprox = ruta.etaAproximada(posicion, destino);
    return {
      rutaError: 'servicio',
      eta:
        aprox === null
          ? null
          : {
              llegadaTs: ruta.llegadaEstimada(aprox, ahora),
              calculadoEn: ahora,
            },
    };
  }
}

module.exports = { pedirRuta, calcularParaPedido };
