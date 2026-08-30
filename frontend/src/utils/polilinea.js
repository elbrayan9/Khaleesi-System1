// Leer la geometría de un recorrido.
//
// Es el formato de polilínea codificada de Google, con precisión 5, que es el
// que devuelven los servicios de rutas. Son treinta líneas: sumar una
// dependencia entera para esto sería pagar mucho más de lo que vale.
//
// El backend tiene su copia en functions/ruta.js, porque allá se usa para medir
// desvíos y acá para dibujar. Los dos leen exactamente el mismo formato.

/**
 * Decodifica la geometría que devuelven los servicios de rutas.
 *
 * Es el formato de polilínea codificada de Google, con precisión 5. Son treinta
 * líneas y evita sumar una dependencia entera al backend y otra al navegador.
 */
export function decodificarPolilinea(codificada, precision = 5) {
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
