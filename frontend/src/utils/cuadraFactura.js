// ¿La suma de los renglones cierra con el total de la factura?
//
// Sirve para avisar cuando la IA leyó mal un número: si dice 4 unidades donde
// hay 40, el total no da y conviene mirarlo antes de que entren 36 unidades de
// más al stock.
//
// El problema es distinguir ese error de una diferencia que es correcta. Los
// renglones de una factura son el **subtotal**, sin IVA; el total al pie lo
// incluye. En una Factura A eso son 21 puntos de diferencia, así que comparar
// contra el total pelado hace saltar el aviso en TODAS las facturas A —que son
// justamente las que recibe un responsable inscripto—. Un aviso que salta
// siempre no se lee más, y el día que el número está mal de verdad tampoco.
//
// Por eso se prueban las formas en que una factura argentina puede cerrar:
// sin IVA discriminado (monotributista), con el IVA de cada renglón, o con las
// dos alícuotas generales.

/** Alícuotas que se usan en Argentina, además del IVA por renglón. */
const ALICUOTAS = [0, 21, 10.5, 27];

/**
 * @param {Array} items  Renglones con `costo`, `cantidad` y opcionalmente `iva`
 *   (porcentaje) e `incluir`.
 * @param {number} total  El total que dice la factura.
 * @param {number} tolerancia  Margen relativo. 2% por defecto: cubre el
 *   redondeo de centavos y algún descuento chico, sin dejar pasar un renglón
 *   leído mal.
 * @returns {{cuadra: boolean, suma: number, conIva: number|null}}
 *   `suma` es el subtotal de los renglones. `conIva` es la variante que hizo
 *   cerrar la cuenta, o null si ninguna cerró.
 */
export function cuadraFactura(items, total, tolerancia = 0.02) {
  const incluidos = (items || []).filter((it) => it?.incluir !== false);
  const suma = incluidos.reduce(
    (s, it) => s + (Number(it?.costo) || 0) * (Number(it?.cantidad) || 0),
    0,
  );

  // Sin total leído no hay nada contra qué comparar: no se avisa. Callarse es
  // mejor que inventar una alarma sobre un dato que no se tiene.
  const t = Number(total) || 0;
  if (!t || !suma) return { cuadra: true, suma, conIva: null };

  // El IVA renglón por renglón, que es lo más fiel cuando el modelo lo leyó.
  const porRenglon = incluidos.reduce((s, it) => {
    const base = (Number(it?.costo) || 0) * (Number(it?.cantidad) || 0);
    return s + base * (1 + (Number(it?.iva) || 0) / 100);
  }, 0);

  const candidatos = [
    suma,
    porRenglon,
    ...ALICUOTAS.map((a) => suma * (1 + a / 100)),
  ];

  const cerca = candidatos.find((c) => Math.abs(t - c) <= t * tolerancia);

  return {
    cuadra: cerca !== undefined,
    suma,
    // Solo se informa el IVA si fue lo que hizo cerrar la cuenta y no era ya el
    // subtotal pelado: si no, no hay nada que aclarar.
    conIva: cerca !== undefined && Math.abs(cerca - suma) > 0.01 ? cerca : null,
  };
}

export default cuadraFactura;
