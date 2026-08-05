// frontend/src/services/productLookup.js
//
// Busca datos de un producto por su código de barras en varias bases públicas y
// gratuitas (sin API key), en cadena, hasta encontrarlo. Devuelve
// { nombre, imagenUrl } o null.
//
// Fuentes:
//  - Open Food Facts   (alimentos/almacén, muy completa)
//  - Open Products Facts (productos generales)
//  - Open Beauty Facts (cosmética/perfumería)
//  - UPCitemdb (trial)  (general, límite diario)

// Bases de la familia Open*Facts (misma estructura de respuesta).
const OFF_FAMILY = [
  'https://world.openfoodfacts.org',
  'https://world.openproductsfacts.org',
  'https://world.openbeautyfacts.org',
];

async function buscarEnOFF(base, code) {
  try {
    const r = await fetch(
      `${base}/api/v2/product/${code}.json?fields=product_name,product_name_es,brands,image_front_url,image_url,quantity`,
    );
    if (!r.ok) return null;
    const d = await r.json();
    if (d?.status !== 1 || !d.product) return null;
    const p = d.product;
    let nombre = p.product_name_es || p.product_name || '';
    const marca = p.brands ? p.brands.split(',')[0].trim() : '';
    if (marca && nombre && !nombre.toLowerCase().includes(marca.toLowerCase())) {
      nombre = `${nombre} ${marca}`;
    } else if (!nombre) {
      nombre = marca;
    }
    if (p.quantity) nombre = `${nombre} ${p.quantity}`;
    if (!nombre.trim()) return null;
    return {
      nombre: nombre.trim(),
      imagenUrl: p.image_front_url || p.image_url || '',
    };
  } catch (_) {
    return null;
  }
}

async function buscarEnUpcItemDb(code) {
  try {
    const r = await fetch(
      `https://api.upcitemdb.com/prod/trial/lookup?upc=${code}`,
    );
    if (!r.ok) return null;
    const d = await r.json();
    const item = d?.items?.[0];
    if (!item) return null;
    let nombre = item.title || '';
    if (item.brand && nombre && !nombre.toLowerCase().includes(item.brand.toLowerCase())) {
      nombre = `${nombre} ${item.brand}`;
    } else if (!nombre) {
      nombre = item.brand || '';
    }
    if (!nombre.trim()) return null;
    return {
      nombre: nombre.trim(),
      imagenUrl: (item.images && item.images[0]) || '',
    };
  } catch (_) {
    return null;
  }
}

export async function buscarDatosProducto(barcode) {
  const code = String(barcode || '').replace(/\D/g, '');
  if (code.length < 8) return null;

  for (const base of OFF_FAMILY) {
    // eslint-disable-next-line no-await-in-loop
    const res = await buscarEnOFF(base, code);
    if (res) return res;
  }
  return buscarEnUpcItemDb(code);
}
