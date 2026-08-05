// frontend/src/services/productLookup.js
//
// Busca datos de un producto por su código de barras en Open Food Facts
// (base pública y gratuita, muy completa para alimentos/almacén). Devuelve
// { nombre, imagenUrl } o null si no lo encuentra.

export async function buscarDatosProducto(barcode) {
  const code = String(barcode || '').replace(/\D/g, '');
  if (code.length < 8) return null;
  try {
    const r = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=product_name,product_name_es,brands,image_front_url,image_url,quantity`,
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

    return {
      nombre: nombre.trim(),
      imagenUrl: p.image_front_url || p.image_url || '',
    };
  } catch (_) {
    return null;
  }
}
