// Convertir una dirección escrita en un punto del mapa.
//
// Hace falta para dibujar el local y la casa del cliente en el seguimiento del
// pedido: hasta ahora la única coordenada del sistema era la del repartidor.
//
// **Esto vive en el backend y no en el navegador**, por tres razones que no
// tienen vuelta:
//
// 1. Nominatim exige un User-Agent que identifique a la aplicación, y el
//    navegador NO PUEDE mandar ese encabezado: `fetch` lo tiene prohibido.
//    Consultar desde el browser sería incumplir su política de uso y ganarse un
//    bloqueo por IP, sin aviso.
// 2. El límite es de una consulta por segundo para todos los usuarios juntos.
//    Entre N navegadores no hay forma de coordinarlo.
// 3. La dirección de una persona es un dato suyo. Desde el navegador viajaría a
//    un tercero junto con su IP; desde acá va con la IP de Google y sin nada que
//    la ligue a quien la escribió.
//
// Y de paso habilita lo que realmente salva la cuota: el caché.

const crypto = require('crypto');

/**
 * La misma dirección escrita de diez formas distintas tiene que dar una sola
 * clave de caché: "Av. Córdoba 1234" y "av cordoba 1234" son la misma esquina.
 */
function normalizarDireccion(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // saca las tildes
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** La clave del documento de caché para una dirección. */
function claveCache(texto) {
  return crypto
    .createHash('sha1')
    .update(normalizarDireccion(texto))
    .digest('hex');
}

/**
 * Un recuadro alrededor de un punto, para inclinar la búsqueda hacia esa zona.
 *
 * No es un lujo: en el conurbano hay una "Av. San Martín 1234" por partido, así
 * que sin este sesgo el pin puede caer a treinta kilómetros de donde va.
 *
 * @param {{lat:number, lng:number}} cerca
 * @param {number} grados  medio lado del recuadro (0.35 ≈ 35 km)
 */
function recuadroAlrededor(cerca, grados = 0.35) {
  if (!cerca || !Number.isFinite(cerca.lat) || !Number.isFinite(cerca.lng)) {
    return null;
  }
  const d = grados;
  // Nominatim lo quiere como: izquierda,arriba,derecha,abajo
  return [cerca.lng - d, cerca.lat + d, cerca.lng + d, cerca.lat - d].join(',');
}

/** ¿Sirve como coordenada terrestre? */
function coordenadaValida(lat, lng) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * Busca la dirección en OpenStreetMap.
 *
 * Devuelve `{ lat, lng, label }` o `null` si no encontró nada. Lanza si el
 * servicio falla, para que quien llame distinga "no existe esa dirección" de
 * "no se pudo consultar".
 */
async function buscarEnNominatim(texto, cerca) {
  const params = new URLSearchParams({
    q: texto,
    format: 'json',
    limit: '1',
    countrycodes: 'ar',
    addressdetails: '0',
  });
  const recuadro = recuadroAlrededor(cerca);
  if (recuadro) params.set('viewbox', recuadro);

  const r = await fetch(
    `https://nominatim.openstreetmap.org/search?${params.toString()}`,
    {
      headers: {
        // Identificarse es obligatorio según su política de uso.
        'User-Agent': 'KhaleesiSystem/1.0 (+https://khaleesisystem.com.ar)',
        'Accept-Language': 'es',
      },
    },
  );
  if (!r.ok) throw new Error(`Nominatim respondió ${r.status}`);

  const datos = await r.json();
  const primero = Array.isArray(datos) ? datos[0] : null;
  if (!primero) return null;

  const lat = Number(primero.lat);
  const lng = Number(primero.lon);
  if (!coordenadaValida(lat, lng)) return null;

  return { lat, lng, label: String(primero.display_name || '').slice(0, 200) };
}

/**
 * Busca la dirección con OpenRouteService (motor Pelias).
 *
 * Es el buscador preferido cuando hay clave: entiende mejor las direcciones
 * argentinas que Nominatim, sobre todo la numeración de calles, que es
 * justamente donde el otro falla. Nominatim queda de respaldo.
 *
 * `cerca` acá pesa de verdad: Pelias lo usa para ordenar los resultados por
 * cercanía, así que una calle homónima en otra localidad deja de ganar.
 */
async function buscarEnOrs(texto, cerca, apiKey) {
  const params = new URLSearchParams({
    api_key: apiKey,
    text: texto,
    'boundary.country': 'AR',
    size: '1',
  });
  if (cerca && Number.isFinite(cerca.lat) && Number.isFinite(cerca.lng)) {
    params.set('focus.point.lat', String(cerca.lat));
    params.set('focus.point.lon', String(cerca.lng));
  }

  const r = await fetch(
    `https://api.openrouteservice.org/geocode/search?${params.toString()}`,
    { headers: { Accept: 'application/json' } },
  );
  if (!r.ok) throw new Error(`OpenRouteService respondió ${r.status}`);

  const datos = await r.json();
  const f = datos?.features?.[0];
  if (!f) return null;

  // GeoJSON viene al revés de lo que uno espera: [longitud, latitud].
  const lng = Number(f.geometry?.coordinates?.[0]);
  const lat = Number(f.geometry?.coordinates?.[1]);
  if (!coordenadaValida(lat, lng)) return null;

  return { lat, lng, label: String(f.properties?.label || '').slice(0, 200) };
}

/** Distancia aproximada en km, suficiente para comparar dos candidatos. */
function kmAproximados(a, b) {
  return Math.hypot((a.lat - b.lat) * 111, (a.lng - b.lng) * 92);
}

/**
 * Busca una dirección.
 *
 * Devuelve `{ lat, lng, label, proveedor }` o `null` si ninguno la encontró.
 *
 * **Con un punto de referencia se le pregunta a los dos y gana el más
 * cercano.** No es por las dudas: probando direcciones reales de Córdoba
 * ninguno de los dos resultó confiable solo. OpenRouteService clavó
 * "9 de Julio 500" que el otro mandaba a Saldán, 16 km más allá; y Nominatim
 * clavó "Bv. San Juan 1000" que OpenRouteService mandaba a 47 km. Preferir uno
 * y usar el otro solo de respaldo se comía ese segundo caso, porque el
 * preferido sí contesta, nada más que mal.
 *
 * Sin punto de referencia no hay con qué desempatar, así que se usa el mejor
 * disponible y listo.
 */
async function buscarDireccion(
  texto,
  cerca,
  apiKeyOrs,
  // Los buscadores entran por parámetro para poder probarlos sin salir a
  // internet: una prueba que depende de que un servicio externo conteste no
  // prueba nada, falla sola un martes.
  buscadores = { ors: buscarEnOrs, osm: buscarEnNominatim },
) {
  const intentar = async (fn, proveedor) => {
    try {
      const r = await fn();
      return r ? { ...r, proveedor } : null;
    } catch (e) {
      console.warn(`[geocoding] ${proveedor} falló:`, e?.message);
      return null;
    }
  };

  const conOrs = apiKeyOrs
    ? await intentar(() => buscadores.ors(texto, cerca, apiKeyOrs), 'ors')
    : null;

  const referencia =
    cerca && coordenadaValida(cerca.lat, cerca.lng) ? cerca : null;

  // Sin referencia, el que conteste primero: no hay forma de saber cuál acertó.
  if (!referencia && conOrs) return conOrs;

  const conOsm = await intentar(
    () => buscadores.osm(texto, cerca),
    'nominatim',
  );

  if (!conOrs) return conOsm;
  if (!conOsm) return conOrs;
  if (!referencia) return conOrs;

  return kmAproximados(conOsm, referencia) < kmAproximados(conOrs, referencia)
    ? conOsm
    : conOrs;
}

/**
 * Limpia y valida el punto que marcó el cliente al hacer un pedido.
 *
 * Devuelve `{ lat, lng, fuente, accuracy }` o `null` si no sirve.
 *
 * El control de distancia contra el local no es paranoia: un pin en Madrid es
 * un error de la pantalla o alguien jugando, nunca un delivery. Guardarlo haría
 * que el recorrido y el tiempo estimado salieran disparatados, y el repartidor
 * se enteraría en la calle.
 *
 * @param {object} geo       lo que llegó del navegador
 * @param {object} geoLocal  dónde está el local, si se sabe
 * @param {number} maxKm     hasta dónde se acepta un domicilio
 */
function validarGeoCliente(geo, geoLocal, maxKm = 100) {
  if (!geo) return null;
  const lat = Number(geo.lat);
  const lng = Number(geo.lng);
  if (!coordenadaValida(lat, lng)) return null;

  if (geoLocal && coordenadaValida(geoLocal.lat, geoLocal.lng)) {
    if (kmAproximados({ lat, lng }, geoLocal) > maxKm) return null;
  }

  const fuente = ['gps', 'geocoding', 'manual'].includes(geo.fuente)
    ? geo.fuente
    : 'manual';
  const accuracy = Number(geo.accuracy);

  return {
    lat,
    lng,
    fuente,
    accuracy: Number.isFinite(accuracy) ? Math.round(accuracy) : null,
  };
}

/**
 * Al revés: de un punto del mapa a los datos de la dirección.
 *
 * Devuelve `{ calle, numero, ciudad, provincia }` o `null`.
 *
 * Hace falta para dar de alta la tienda en Mercado Pago, que pide la ubicación
 * por separado —calle, número, ciudad, provincia— y **valida que la ciudad
 * exista y le corresponda a esa provincia**. Mandarle datos inventados es lo
 * que venía rompiendo el alta: con "CABA" en la provincia de Buenos Aires
 * respondía `location.city_name was invalid` y sin tienda no hay caja QR.
 *
 * Se consulta una sola vez en la vida del comercio, cuando se crea su tienda.
 */
async function buscarPorCoordenadas(lat, lng) {
  if (!coordenadaValida(lat, lng)) return null;

  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    format: 'json',
    addressdetails: '1',
    zoom: '18',
  });

  const r = await fetch(
    `https://nominatim.openstreetmap.org/reverse?${params.toString()}`,
    {
      headers: {
        'User-Agent': 'KhaleesiSystem/1.0 (+https://khaleesisystem.com.ar)',
        'Accept-Language': 'es',
      },
    },
  );
  if (!r.ok) throw new Error(`Nominatim respondió ${r.status}`);

  const d = await r.json();
  const a = d?.address;
  if (!a) return null;

  // Los nombres cambian según el lugar: una localidad puede venir como city,
  // town, village o suburb. Se toma el primero que exista.
  const ciudad =
    a.city || a.town || a.village || a.municipality || a.suburb || a.county;

  return {
    calle: a.road || null,
    numero: a.house_number || null,
    ciudad: ciudad || null,
    provincia: a.state || null,
  };
}

module.exports = {
  normalizarDireccion,
  claveCache,
  recuadroAlrededor,
  coordenadaValida,
  buscarEnNominatim,
  buscarEnOrs,
  buscarDireccion,
  kmAproximados,
  validarGeoCliente,
  buscarPorCoordenadas,
};
