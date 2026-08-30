// Qué se compró, según el pago y no según quien avisa.
//
// El aviso de Mercado Pago llega a una dirección de internet abierta, con
// datos en la propia URL. Antes el plan y el ciclo se leían de ahí, y eso
// alcanzaba para pagar el plan más barato por un mes y darse el más caro por un
// año: bastaba con volver a llamar al aviso, a mano, cambiando dos palabras de
// la dirección.
//
// Lo único confiable es el pago, que se consulta contra Mercado Pago. Por eso
// la referencia del pago lleva adentro qué se compró, y de ahí sale todo.

// Los dos únicos planes y los dos únicos ciclos que existen.
const PLANES = ['basic', 'premium'];
const CICLOS = ['mensual', 'anual'];

/**
 * Arma la referencia que viaja con el pago.
 *
 * El uid va primero porque el aviso comprueba que el pago sea de quien dice
 * ser; el resto describe la compra.
 */
function referenciaDeSuscripcion(uid, plan, ciclo, ahora = Date.now()) {
  const p = PLANES.includes(plan) ? plan : 'basic';
  const c = CICLOS.includes(ciclo) ? ciclo : 'mensual';
  return `sub_${uid}_${p}_${c}_${ahora}`;
}

/**
 * Lee qué se compró a partir de la referencia del pago.
 *
 * Devuelve `{ uid, plan, ciclo }` o `null` si la referencia no es de una
 * suscripción.
 *
 * Contempla el formato viejo `sub_<uid>_<plan>_<ts>`, que no llevaba el ciclo:
 * esas quedan como mensual, que es lo menos que se le puede dar a alguien. Un
 * error acá no puede regalar un año.
 */
function datosDeLaReferencia(extRef) {
  const partes = String(extRef || '').split('_');
  if (partes.length < 4 || partes[0] !== 'sub') return null;

  const uid = partes[1];
  const plan = PLANES.includes(partes[2]) ? partes[2] : null;
  if (!uid || !plan) return null;

  // El formato nuevo trae el ciclo en la cuarta posición; el viejo, la marca de
  // tiempo. Solo se acepta 'anual' escrito tal cual.
  const ciclo = partes[3] === 'anual' ? 'anual' : 'mensual';

  return { uid, plan, ciclo };
}

/** Cuántos días dura lo que se pagó. */
function diasDelCiclo(ciclo) {
  return ciclo === 'anual' ? 365 : 30;
}

module.exports = {
  PLANES,
  CICLOS,
  referenciaDeSuscripcion,
  datosDeLaReferencia,
  diasDelCiclo,
};
