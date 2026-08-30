// Encontrar productos repetidos en el catálogo.
//
// Se agrupaba solo por código de barras, y con `if (p.codigoBarras)` los que no
// tienen código quedaban afuera del todo. Justo esos son los que más se
// duplican: una factura de proveedor que factura con su código interno no deja
// ningún EAN, así que sus productos se crean sin código, y si esa factura se
// carga dos veces quedan dos fichas de cada cosa. El botón las miraba y decía
// "no se encontraron productos duplicados".
//
// Ahora los sin código se agrupan por nombre normalizado. Es más flojo que un
// EAN, pero dos productos del MISMO comercio con el mismo nombre exacto son el
// mismo producto: no hay una lectura razonable en la que no lo sean.

import { normalizar } from './cruceProductos.js';

/**
 * Qué productos sobran y cuáles se conservan.
 *
 * De cada grupo gana el de mayor stock y, a igual stock, el más reciente. Se
 * conserva el máximo y no la suma a propósito: el caso típico es una factura
 * cargada dos veces, donde las dos fichas dicen lo mismo porque la entrega fue
 * una sola. Sumarlas inflaría el stock justo cuando se lo está por arreglar.
 *
 * @param {Array} productos
 * @returns {{aEliminar: string[], grupos: Array<{conserva: object, borra: object[], por: 'codigo'|'nombre'}>}}
 */
export function buscarDuplicados(productos) {
  const lista = Array.isArray(productos) ? productos : [];
  const porCodigo = new Map();
  const porNombre = new Map();

  lista.forEach((p) => {
    if (!p?.id) return;
    const codigo = String(p.codigoBarras || '').trim();
    if (codigo) {
      if (!porCodigo.has(codigo)) porCodigo.set(codigo, []);
      porCodigo.get(codigo).push(p);
      return;
    }
    // Sin código: el nombre es lo único que queda.
    const nombre = normalizar(p.nombre);
    if (!nombre) return; // sin nombre ni código no se puede afirmar nada
    if (!porNombre.has(nombre)) porNombre.set(nombre, []);
    porNombre.get(nombre).push(p);
  });

  const masStockPrimero = (a, b) => {
    const sa = Number(a.stock) || 0;
    const sb = Number(b.stock) || 0;
    if (sb !== sa) return sb - sa;
    return (b.lastUpdated?.seconds || 0) - (a.lastUpdated?.seconds || 0);
  };

  const grupos = [];
  const juntar = (mapa, por) => {
    mapa.forEach((grupo) => {
      if (grupo.length < 2) return;
      const [conserva, ...borra] = [...grupo].sort(masStockPrimero);
      grupos.push({ conserva, borra, por });
    });
  };
  juntar(porCodigo, 'codigo');
  juntar(porNombre, 'nombre');

  return {
    aEliminar: grupos.flatMap((g) => g.borra.map((p) => p.id)),
    grupos,
  };
}

/**
 * El texto que se le muestra a la persona antes de borrar.
 *
 * Se nombran los productos y no solo se cuentan: borrar fichas del catálogo no
 * se deshace, y un número suelto no alcanza para decidir. Se listan hasta seis
 * para que el cartel siga entrando en pantalla.
 */
export function resumenDuplicados(grupos, tope = 6) {
  const nombres = grupos.map(
    (g) => `${g.conserva.nombre} (${g.borra.length + 1} fichas)`,
  );
  const muestra = nombres.slice(0, tope).join('\n');
  const resto = nombres.length - tope;
  return resto > 0 ? `${muestra}\n…y ${resto} más` : muestra;
}

export default buscarDuplicados;
