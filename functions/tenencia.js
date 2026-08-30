// De quién es cada sucursal.
//
// El sistema es multi-comercio: cada uno tiene su uid y sus sucursales. Varias
// funciones reciben un `sucursalId` que manda el navegador y lo usan para
// buscar datos —entre ellos el Access Token de Mercado Pago, que permite cobrar
// y hacer devoluciones—. Sin comprobar de quién es esa sucursal, alcanza con
// cambiar un identificador en el pedido para operar con la cuenta de otro.
//
// Y ese identificador no hay que adivinarlo: **es público por diseño**, viaja
// en la URL de la tienda online (`/tienda/:sucursalId`) que cada comercio le
// pasa a sus clientes.
//
// Vive en su propio archivo para poder probarlo contra el emulador: es la
// clase de control que, si se rompe, no se nota hasta que alguien cobra con la
// cuenta ajena.

/**
 * ¿La sucursal es de este comercio?
 *
 * Devuelve un booleano en vez de lanzar, para que sirva igual en una función
 * llamada desde la app —donde conviene un error— y en un webhook, donde hay que
 * contestar 200 igual o el proveedor reintenta para siempre.
 *
 * Una sucursal que no existe devuelve false: no se puede afirmar que sea de
 * quien pregunta.
 */
async function esDuenoDeSucursal(db, uid, sucursalId) {
  if (!uid || !sucursalId) return false;
  try {
    const doc = await db.collection('sucursales').doc(String(sucursalId)).get();
    return doc.exists && doc.data()?.userId === uid;
  } catch (e) {
    // Ante la duda, no. Un error de lectura no puede volverse un permiso.
    console.error('[tenencia] no se pudo verificar la sucursal:', e?.message);
    return false;
  }
}

module.exports = { esDuenoDeSucursal };
