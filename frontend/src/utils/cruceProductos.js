// Encontrar el producto de un renglón de factura entre los que ya están.
//
// Si no lo encuentra, se crea uno nuevo. Por eso equivocarse acá tiene un costo
// concreto: cargar dos veces la misma factura dejaba el catálogo con cada
// producto duplicado y el stock repartido entre las dos copias.
//
// El cruce se hacía por igualdad exacta del nombre, y eso no aguanta que la
// misma factura se lea dos veces: la IA transcribe "Servidor Blade Rack 2U" una
// vez y "Servidor Blade Rack 2U (Procesador 16-Core, 64GB RAM)" la otra, según
// cuánto de la descripción del renglón haya tomado. Son el mismo producto y el
// sistema veía dos.

/**
 * Deja un nombre en su forma comparable: sin mayúsculas, sin tildes, sin signos
 * y sin espacios de más.
 *
 * "Coca-Cola 2,25L" y "coca cola 2.25 l" quedan casi iguales, que es lo que
 * hace falta para no duplicar un producto por una coma.
 */
export function normalizar(nombre) {
  return String(nombre || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // tildes
    .replace(/[^a-z0-9\s]/g, ' ') // guiones, comas, paréntesis
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Busca el producto de un renglón entre los del comercio.
 *
 * El orden no es caprichoso: primero el código de barras, que es exacto y no se
 * discute; después el nombre normalizado; y por último el caso de la
 * descripción pegada, donde un nombre contiene al otro entero.
 *
 * Ese último paso pide **al menos 12 caracteres** en el nombre más corto. Sin
 * ese piso, un producto llamado "agua" haría juego con "agua oxigenada", y
 * fusionar dos productos distintos es peor que duplicar uno: el stock de los
 * dos termina en una sola ficha y ya no hay forma de separarlos.
 *
 * @param {Array} productos  Los del comercio.
 * @param {{nombre: string, codigo?: string}} renglon
 * @returns {object|undefined}
 */
export function buscarProductoDeRenglon(productos, renglon) {
  const lista = Array.isArray(productos) ? productos : [];

  const cod = String(renglon?.codigo || '').replace(/\D/g, '');
  if (cod) {
    const porCodigo = lista.find(
      (p) => String(p?.codigoBarras || '').replace(/\D/g, '') === cod,
    );
    if (porCodigo) return porCodigo;
  }

  const nombre = normalizar(renglon?.nombre);
  if (!nombre) return undefined;

  const exacto = lista.find((p) => normalizar(p?.nombre) === nombre);
  if (exacto) return exacto;

  // El mismo nombre con la unidad pegada o separada: "2,25L" y "2.25 L". Se
  // comparan sin espacios, lo que une dos escrituras del MISMO texto sin
  // adivinar nada: si sacando los espacios no son iguales, no hay juego.
  const sinEspacios = nombre.replace(/ /g, '');
  const porEspaciado = lista.find(
    (p) => normalizar(p?.nombre).replace(/ /g, '') === sinEspacios,
  );
  if (porEspaciado) return porEspaciado;

  // Uno contiene al otro: pasa cuando una de las dos lecturas se llevó también
  // la descripción del renglón.
  return lista.find((p) => {
    const otro = normalizar(p?.nombre);
    if (!otro) return false;
    const corto = nombre.length <= otro.length ? nombre : otro;
    const largo = corto === nombre ? otro : nombre;
    if (corto.length < 12) return false;
    // El contenido tiene que empezar donde empieza una palabra, para que
    // "rack 2u" no haga juego con el final de cualquier cosa.
    return largo === corto || largo.startsWith(`${corto} `);
  });
}

export default buscarProductoDeRenglon;
