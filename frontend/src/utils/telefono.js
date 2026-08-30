// El número de teléfono, como lo quiere WhatsApp.
//
// wa.me no acepta un número escrito como lo escribe la gente: quiere solo
// dígitos, con código de país, y para un celular argentino con el 9 después del
// 54. Un número mal armado no da error — abre WhatsApp con un contacto
// inexistente, o peor, con otro número. El comprobante nunca llega y nadie se
// entera.
//
// Un cliente carga su teléfono como se lo dictaron, y en Argentina eso es
// cualquiera de estas formas para el MISMO celular de Córdoba:
//
//   3517694103          como lo pide el campo del formulario
//   0351 15 6941030     como está en la agenda de casi todo el mundo
//   +54 9 351 769-4103  como lo copia de un contacto del teléfono
//   54 351 7694103      copiado de algún sistema, sin el 9
//
// El 0 de larga distancia y el 15 son prefijos para llamar DENTRO del país: en
// formato internacional no van, y dejarlos hace que el número no exista.
//
// Vive acá porque la misma cuenta estaba copiada en cinco pantallas —clientes,
// cobros, repartidores, insights, comprobantes—: cinco lugares donde arreglar
// el mismo error, o donde uno queda sin arreglar.

/**
 * Deja un teléfono argentino listo para un enlace de wa.me.
 *
 * @param {string} crudo  Lo que escribió la persona, con espacios y guiones.
 * @returns {string|null} Solo dígitos, con 549 adelante. `null` si no hay
 *   número: quien llama tiene que avisar, no armar un enlace vacío.
 */
export function telefonoWhatsapp(crudo) {
  let n = String(crudo || '').replace(/\D/g, '');
  if (!n) return null;

  // Ya viene en formato internacional.
  if (n.startsWith('549')) return n;

  // Con código de país pero sin el 9 del celular. Se lo agregamos: los
  // comprobantes van a un teléfono, no a una línea fija.
  if (n.startsWith('54')) return `549${n.slice(2)}`;

  // El 0 de larga distancia no va en formato internacional.
  if (n.startsWith('0')) n = n.slice(1);

  // El 15 tampoco. Va pegado después de la característica, que puede tener 2
  // dígitos (11), 3 (351) o 4 (2954), así que se lo busca en esas tres
  // posiciones. Un número con 15 tiene 12 dígitos y sin él queda en 10, que es
  // lo que mide un número argentino completo: si la cuenta no da 10, ese "15"
  // era parte del número y no se toca.
  if (n.length === 12) {
    for (const pos of [2, 3, 4]) {
      if (n.slice(pos, pos + 2) === '15') {
        n = n.slice(0, pos) + n.slice(pos + 2);
        break;
      }
    }
  }

  return `549${n}`;
}

export default telefonoWhatsapp;
