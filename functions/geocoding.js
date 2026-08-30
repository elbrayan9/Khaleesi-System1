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

module.exports = {
  normalizarDireccion,
  claveCache,
  recuadroAlrededor,
  coordenadaValida,
  buscarEnNominatim,
};
