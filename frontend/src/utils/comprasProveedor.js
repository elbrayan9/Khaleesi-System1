// Qué le compraste a cada proveedor.
//
// El dato ya estaba guardado: cada pedido lleva el proveedorId adentro. Lo que
// faltaba era mostrarlo donde se decide, que es la lista de proveedores. Sin
// esto, para saber cuánto le compraste a alguien había que ir a Pedidos y
// filtrar a ojo.
//
// Solo cuentan los pedidos **recibidos**: un pedido hecho y no entregado no es
// plata gastada, y uno cancelado menos todavía. Mezclarlos daría un número más
// grande que la realidad, que es la peor forma de equivocarse cuando lo que se
// está por decidir es a quién comprarle.

/**
 * Resume las compras a un proveedor.
 *
 * @param {Array} pedidos       Todos los pedidos del comercio.
 * @param {string} proveedorId
 * @param {number} dias         Ventana del total. 30 por defecto.
 * @param {Date} ahora          Para poder probarlo sin depender del reloj.
 * @returns {{ultima: string|null, total: number, cantidad: number}}
 *   `ultima` en formato AAAA-MM-DD, o null si nunca se le compró.
 */
export function comprasDeProveedor(
  pedidos,
  proveedorId,
  dias = 30,
  ahora = new Date(),
) {
  const vacio = { ultima: null, total: 0, cantidad: 0 };
  if (!Array.isArray(pedidos) || !proveedorId) return vacio;

  const recibidos = pedidos.filter(
    (p) => p?.proveedorId === proveedorId && p?.estado === 'recibido',
  );
  if (!recibidos.length) return vacio;

  // La fecha de recepción es cuando la mercadería entró de verdad; la del
  // pedido es cuando se encargó. Para "última compra" vale la primera, y la
  // segunda queda de respaldo para los pedidos viejos que no la tienen.
  const fechaDe = (p) => p.fechaRecepcion || p.fechaPedido || '';

  const desde = new Date(ahora);
  desde.setDate(desde.getDate() - dias);
  const limite = desde.toISOString().split('T')[0];

  const enVentana = recibidos.filter((p) => fechaDe(p) >= limite);

  return {
    // Las fechas son AAAA-MM-DD, así que ordenarlas como texto las ordena bien.
    ultima: recibidos.map(fechaDe).filter(Boolean).sort().pop() || null,
    total: enVentana.reduce((t, p) => t + (Number(p.totalCosto) || 0), 0),
    cantidad: enVentana.length,
  };
}

/** Pasa AAAA-MM-DD a DD/MM/AAAA, que es como se lee acá. */
export function fechaCorta(iso) {
  if (!iso) return null;
  const [a, m, d] = String(iso).split('-');
  return a && m && d ? `${d}/${m}/${a}` : iso;
}

/**
 * Hace cuántos días fue esa fecha. Sirve para el "hace 3 días" que se entiende
 * de un vistazo, sin tener que restar mentalmente contra el calendario.
 */
export function diasDesde(iso, ahora = new Date()) {
  if (!iso) return null;
  const [a, m, d] = String(iso).split('-').map(Number);
  if (!a || !m || !d) return null;
  // Se compara a medianoche de los dos días para que "ayer" sea 1 y no 0,9.
  const cuando = Date.UTC(a, m - 1, d);
  const hoy = Date.UTC(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  return Math.round((hoy - cuando) / 86400000);
}

export default comprasDeProveedor;
