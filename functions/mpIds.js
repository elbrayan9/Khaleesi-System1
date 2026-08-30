// Los identificadores de la caja QR de Mercado Pago.
//
// Mercado Pago exige que el `external_id` de una tienda o una caja sea
// ALFANUMÉRICO: solo letras y números. Ni guiones bajos, ni guiones, ni puntos.
// Acá se armaban como `khaleesi_store_<id>`, y encima el filtro dejaba pasar el
// guion bajo porque \w lo incluye. La API respondía "external_id must be
// alphanumeric" y la caja no se creaba nunca: el QR fallaba siempre, con ese
// mismo mensaje en pantalla.
//
// Vive en su propio archivo para poder probarlo: es una regla de un proveedor
// externo, no se puede deducir leyendo el código, y equivocarse deja al
// comercio sin cobrar.

// Se recorta a 24 para que el identificador completo quede holgado: los uid de
// Firebase son de 28 caracteres.
const LARGO_BASE = 24;

const soloAlfanumerico = (valor) =>
  String(valor || '')
    .replace(/[^A-Za-z0-9]/g, '')
    .slice(0, LARGO_BASE);

/**
 * Arma los external_id de la tienda y la caja para una sucursal.
 * @param {string} sucursalId  puede venir vacío
 * @param {string} uid         dueño; es el respaldo
 */
function idsDeCajaQr(sucursalId, uid) {
  const base = soloAlfanumerico(sucursalId) || soloAlfanumerico(uid);
  return {
    storeExternalId: `KHALEESISTORE${base}`,
    posExternalId: `KHALEESIPOS${base}`,
  };
}

module.exports = { idsDeCajaQr, soloAlfanumerico };
