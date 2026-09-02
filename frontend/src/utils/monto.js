// La plata, como la escribe la gente en Argentina.
//
// El sistema MUESTRA los importes en formato argentino —`formatCurrency` da
// "105.000,00"—, así que el punto es el separador de miles y la coma la de
// decimales. Después le pedimos a la misma persona que escriba un monto, y lo
// leíamos con `Number()`, que es JavaScript y por lo tanto lee al revés: para
// él el punto ES la coma decimal.
//
//   lo que escribe        lo que quiere decir     lo que entendía Number()
//   ────────────────      ───────────────────     ────────────────────────
//   28.000                veintiocho mil                              28
//   1.000                 mil                                          1
//   2.500                 dos mil quinientos                         2,5
//   1.234.567             un millón y pico                             1   (NaN en realidad)
//
// Y no falla ruidosamente: cobra 28 pesos donde iban 28.000 y sigue como si
// nada. Lo encontró un cliente cobrando por venta rápida, y el mismo campo
// existe en el pago, en los movimientos de caja y en el monto inicial del
// turno, donde el error se lleva la diferencia de la caja del día.
//
// La coma tampoco alcanzaba: en un `<input type="number">` el navegador
// RECHAZA la coma y deja el campo vacío, así que quien escribía "28,50" veía
// desaparecer lo que tipeó. Por eso estos campos pasan a `type="text"` con
// `inputMode="decimal"`, que abre el teclado numérico igual pero deja escribir
// las dos formas.

/**
 * Convierte un monto escrito por una persona en un número.
 *
 * Acepta las dos convenciones, porque las dos llegan: la argentina que muestra
 * el propio sistema (1.234,56) y la que sale de cualquier teclado o de copiar
 * de otro lado (1234.56).
 *
 * La única ambigüedad real es un punto sin coma. Se resuelve por la cantidad
 * de dígitos que lo siguen, que es como lo desambigua cualquiera al leerlo:
 *
 *   "550.50"   → 550.5     dos decimales: es un precio
 *   "28.000"   → 28000     tres dígitos justos: son miles
 *   "1.234.567"→ 1234567   varios grupos de tres: son miles
 *
 * Nadie escribe pesos con tres decimales, así que el grupo de tres gana. Es la
 * misma regla que usa una persona mirando el número.
 *
 * @param {string|number} crudo Lo que se escribió en el campo.
 * @returns {number|null} El número, o `null` si no hay un monto válido.
 *   Devuelve `null` y no 0 a propósito: 0 es un monto que alguien puede haber
 *   querido escribir, y quien llama tiene que poder distinguirlo de "vacío".
 */
export const parseMonto = (crudo) => {
  if (typeof crudo === 'number') {
    return Number.isFinite(crudo) ? crudo : null;
  }
  if (typeof crudo !== 'string') return null;

  // Se saca todo lo que no sea dígito, separador o signo: el símbolo $, los
  // espacios finos que arrastra un copiar/pegar, un "ARS" adelante.
  const limpio = crudo.replace(/[^\d.,-]/g, '').trim();
  if (!limpio || !/\d/.test(limpio)) return null;

  const negativo = limpio.startsWith('-');
  const cuerpo = limpio.replace(/-/g, '');

  const tieneComa = cuerpo.includes(',');
  const tienePunto = cuerpo.includes('.');

  let normalizado;
  if (tieneComa && tienePunto) {
    // Los dos: manda el ÚLTIMO que aparece. "1.234,56" es argentino;
    // "1,234.56" viene de un sistema en inglés y también hay que aceptarlo.
    const decimal = cuerpo.lastIndexOf(',') > cuerpo.lastIndexOf('.') ? ',' : '.';
    const miles = decimal === ',' ? '.' : ',';
    normalizado = cuerpo.split(miles).join('').replace(decimal, '.');
  } else if (tieneComa) {
    // Solo coma: en el formato que muestra el sistema, la coma es decimal.
    // Varias comas serían separador de miles a la inglesa ("1,234,567").
    const comas = cuerpo.split(',').length - 1;
    normalizado = comas > 1 ? cuerpo.split(',').join('') : cuerpo.replace(',', '.');
  } else if (tienePunto) {
    // Solo punto: acá está el error que rompía las ventas.
    const partes = cuerpo.split('.');
    const ultima = partes[partes.length - 1];
    // Miles si hay más de un punto, o si el único grupo final tiene 3 dígitos
    // justos ("28.000"). Cualquier otra cosa —"550.5", "550.50"— es decimal.
    const sonMiles = partes.length > 2 || (partes.length === 2 && ultima.length === 3);
    normalizado = sonMiles ? partes.join('') : cuerpo;
  } else {
    normalizado = cuerpo;
  }

  const n = Number(normalizado);
  if (!Number.isFinite(n)) return null;
  return negativo ? -n : n;
};

/**
 * Lo mismo, pero para el caso más común: un monto que tiene que ser positivo.
 *
 * @param {string|number} crudo
 * @returns {number|null} `null` si no es un número o si no es mayor que cero.
 */
export const parseMontoPositivo = (crudo) => {
  const n = parseMonto(crudo);
  return n !== null && n > 0 ? n : null;
};
