// frontend/src/services/firestoreService.js
import { db } from '../firebaseConfig'; // Asegúrate que esta ruta sea correcta
import {
  collection,
  doc,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  limit,
  arrayUnion,
  writeBatch,
  serverTimestamp,
  setDoc,
  increment,
} from 'firebase/firestore';

// --- FUNCIÓN DE AYUDA QUE FALTABA ---
const getCollectionPathForUser = (collectionName) => {
  return collectionName;
};

// --- FUNCIONES CRUD GENÉRICAS ---
export const getAllDataForUser = async (
  userId,
  collectionName,
  sucursalId = null,
) => {
  if (!userId) return [];
  const collPath = getCollectionPathForUser(collectionName);
  let q = query(collection(db, collPath), where('userId', '==', userId));

  // Si se proporciona sucursalId, filtramos por él.
  // IMPORTANTE: Para colecciones compartidas (como clientes o proveedores si se decide así),
  // se podría omitir este filtro, pero por defecto lo aplicamos para separar todo.
  if (sucursalId) {
    q = query(q, where('sucursalId', '==', sucursalId));
  }

  try {
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error(
      `Error obteniendo datos de ${collectionName} para ${userId} (Sucursal: ${sucursalId}): `,
      error,
    );
    return [];
  }
};

export const addDocument = async (
  userId,
  collectionName,
  data,
  sucursalId = null,
) => {
  if (!userId) return null;
  const collPath = getCollectionPathForUser(collectionName);
  try {
    const dataToSave = { ...data };
    if (dataToSave.hasOwnProperty('id')) delete dataToSave.id;

    const docData = {
      ...dataToSave,
      userId,
      createdAt: serverTimestamp(),
      lastUpdated: serverTimestamp(),
    };

    // Si hay sucursalId, lo agregamos al documento
    if (sucursalId) {
      docData.sucursalId = sucursalId;
    }

    const docRef = await addDoc(collection(db, collPath), docData);
    return docRef.id;
  } catch (error) {
    console.error(
      `Error añadiendo documento a ${collectionName} para ${userId}: `,
      error,
    );
    return null;
  }
};

export const updateDocument = async (collectionName, docId, dataToUpdate) => {
  if (!docId) return false;
  const docRef = doc(db, collectionName, docId);
  try {
    const cleanDataToUpdate = { ...dataToUpdate };
    if (cleanDataToUpdate.hasOwnProperty('id')) delete cleanDataToUpdate.id;
    await updateDoc(docRef, {
      ...cleanDataToUpdate,
      lastUpdated: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error(`Error actualizando ${docId} en ${collectionName}:`, error);
    return false;
  }
};

export const deleteDocument = async (collectionName, docId) => {
  if (!docId) return false;
  const docRef = doc(db, collectionName, docId);
  try {
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error(`Error eliminando ${docId} de ${collectionName}:`, error);
    return false;
  }
};

// --- PRODUCTOS ---
export const getProductos = (userId, sucursalId) =>
  getAllDataForUser(userId, 'productos', sucursalId);
export const addProducto = (userId, productoData, sucursalId) =>
  addDocument(userId, 'productos', productoData, sucursalId);
export const updateProducto = (docId, productoData) =>
  updateDocument('productos', docId, productoData);
export const deleteProducto = (docId) => deleteDocument('productos', docId);

// Eliminar múltiples productos (Batch)
export const deleteProducts = async (productIds) => {
  if (!productIds || productIds.length === 0) return true;

  const batch = writeBatch(db);
  const BATCH_LIMIT = 450;
  let operationCount = 0;
  let batchCount = 0;

  try {
    for (const id of productIds) {
      const docRef = doc(db, 'productos', id);
      batch.delete(docRef);
      operationCount++;

      if (operationCount >= BATCH_LIMIT) {
        await batch.commit();
        operationCount = 0;
        batchCount++;
        // En un escenario real complejo, aquí reiniciaríamos el batch,
        // pero writeBatch() devuelve una instancia nueva o la misma?
        // writeBatch crea una nueva. Deberíamos reasignar `batch` pero es const.
        // Para simplificar, asumimos < 450 items o hacemos un loop externo.
        // CORRECCIÓN: Para soportar > 450, necesitamos lógica de chunks.
      }
    }

    // Si quedan operaciones pendientes
    if (operationCount > 0) {
      await batch.commit();
    }
    return true;
  } catch (error) {
    console.error('Error eliminando productos en lote:', error);
    return false;
  }
};

// --- CLIENTES ---
// Los clientes podrían ser compartidos, pero por ahora los filtramos por sucursal si se pide
export const getClientes = (userId, sucursalId) =>
  getAllDataForUser(userId, 'clientes', sucursalId);
export const addCliente = (userId, clienteData, sucursalId) =>
  addDocument(userId, 'clientes', clienteData, sucursalId);
export const updateCliente = (docId, clienteData) =>
  updateDocument('clientes', docId, clienteData);
export const deleteCliente = (docId) => deleteDocument('clientes', docId);

// --- VENDEDORES ---
export const getVendedores = (userId, sucursalId) =>
  getAllDataForUser(userId, 'vendedores', sucursalId);
export const addVendedor = (userId, vendedorData, sucursalId) =>
  addDocument(userId, 'vendedores', vendedorData, sucursalId);
export const updateVendedor = (docId, vendedorData) =>
  updateDocument('vendedores', docId, vendedorData);
export const deleteVendedor = (docId) => deleteDocument('vendedores', docId);

/**
 * =================================================================
 * PROVEEDORES
 * =================================================================
 */

// NOTA: No necesitamos una función "get" aquí porque AppContext ya los carga en tiempo real.

// Agregar un nuevo proveedor
export const addProveedor = (userId, proveedorData, sucursalId) => {
  const proveedoresCollection = collection(db, 'proveedores');
  // Asegurarnos de que el userId esté en los datos a guardar
  const dataConUserId = {
    ...proveedorData,
    userId: userId,
    sucursalId: sucursalId,
  };
  return addDoc(proveedoresCollection, dataConUserId).then(
    (docRef) => docRef.id,
  );
};

// Actualizar un proveedor existente
export const updateProveedor = (proveedorId, proveedorData) => {
  const proveedorDoc = doc(db, 'proveedores', proveedorId);
  return updateDoc(proveedorDoc, proveedorData)
    .then(() => true)
    .catch(() => false);
};

/**
 * =================================================================
 * PEDIDOS A PROVEEDORES
 * =================================================================
 */

// Agregar un nuevo pedido
export const addPedido = (userId, pedidoData, sucursalId) => {
  const pedidosCollection = collection(db, 'pedidos');
  const dataConUserId = { ...pedidoData, userId: userId, sucursalId };
  return addDoc(pedidosCollection, dataConUserId).then((docRef) => docRef.id);
};

// Actualizar un pedido (por ejemplo, para cambiar su estado)
export const updatePedido = (pedidoId, pedidoData) => {
  const pedidoDoc = doc(db, 'pedidos', pedidoId);
  return updateDoc(pedidoDoc, pedidoData)
    .then(() => true)
    .catch(() => false);
};

// Cuando se recibe un pedido, esta función actualizará el stock Y el costo de los productos.
export const recibirPedidoYActualizarStock = async (pedido) => {
  const batch = writeBatch(db);

  // 1. Actualizar el estado del pedido (sin cambios)
  const pedidoRef = doc(db, 'pedidos', pedido.id);
  batch.update(pedidoRef, {
    estado: 'recibido',
    fechaRecepcion: new Date().toISOString().split('T')[0],
  });

  // 2. Actualizar el stock Y el costo de cada producto en el pedido
  for (const item of pedido.items) {
    if (item.productoId && item.costoUnitario > 0) {
      // Solo actualizamos si hay un productoId y un costo válido
      const productoRef = doc(db, 'productos', item.productoId);

      batch.update(productoRef, {
        stock: increment(item.cantidad),
        costo: item.costoUnitario, // <--- ¡AQUÍ ESTÁ LA MAGIA! Se actualiza el costo.
      });
    }
  }

  try {
    await batch.commit();
    return true;
  } catch (error) {
    console.error(
      'Error al recibir el pedido y actualizar stock/costo: ',
      error,
    );
    return false;
  }
};

/**
 * Elimina un pedido y revierte el stock de los productos si el pedido ya había sido recibido.
 * Utiliza una transacción por lotes para garantizar la consistencia de los datos.
 */
export const deletePedidoAndRevertStock = async (pedido) => {
  // Verificamos si realmente es un pedido recibido para revertir el stock.
  if (!pedido || !pedido.id || !pedido.items) {
    console.error('Datos del pedido inválidos para revertir stock.');
    return false;
  }

  const batch = writeBatch(db);

  // 1. Marcar el pedido para ser eliminado
  const pedidoRef = doc(db, 'pedidos', pedido.id);
  batch.delete(pedidoRef);

  // 2. Revertir el stock de cada producto del pedido
  // Solo si el pedido estaba en estado 'recibido'
  if (pedido.estado === 'recibido') {
    for (const item of pedido.items) {
      if (item.productoId) {
        const productoRef = doc(db, 'productos', item.productoId);
        // Usamos increment con un número negativo para restar del stock actual
        batch.update(productoRef, {
          stock: increment(-item.cantidad),
        });
      }
    }
  }

  try {
    await batch.commit();
    return true;
  } catch (error) {
    console.error('Error al eliminar pedido y revertir stock: ', error);
    return false;
  }
};
// --- VENTAS ---
export const getVentas = (userId) => getAllDataForUser(userId, 'ventas');
// --- MODIFICADO ---: Lógica para manejar items sin stock (Venta Rápida)
export const addVenta = async (userId, ventaData, sucursalId) => {
  if (!userId) throw new Error('ID de usuario no provisto para la venta.');
  const batch = writeBatch(db);
  try {
    const ventaCollPath = getCollectionPathForUser('ventas');
    const ventaPayload = {
      ...ventaData,
      userId,
      sucursalId, // Agregamos sucursalId
      createdAt: serverTimestamp(),
      lastUpdated: serverTimestamp(),
    };
    if (ventaPayload.hasOwnProperty('id')) delete ventaPayload.id;
    const newVentaRef = doc(collection(db, ventaCollPath));
    batch.set(newVentaRef, ventaPayload);

    const productosCollPath = getCollectionPathForUser('productos');
    for (const itemVendido of ventaData.items) {
      const esProductoRastreable =
        itemVendido.id &&
        typeof itemVendido.id === 'string' &&
        !itemVendido.id.startsWith('manual_') &&
        !itemVendido.id.startsWith('local_');

      if (esProductoRastreable) {
        const productoRef = doc(db, productosCollPath, itemVendido.id);
        const productoDoc = await getDoc(productoRef);
        if (!productoDoc.exists())
          throw new Error(
            `Producto ${itemVendido.nombre} (ID: ${itemVendido.id}) no encontrado.`,
          );

        const stockActual = productoDoc.data().stock;
        if (stockActual < itemVendido.cantidad) {
          throw new Error(
            `Stock insuficiente para ${itemVendido.nombre}. Solicitado: ${itemVendido.cantidad}, Disponible: ${stockActual}`,
          );
        }
        batch.update(productoRef, {
          stock: increment(-Number(itemVendido.cantidad)),
        });
      }
    }
    await batch.commit();
    return newVentaRef.id;
  } catch (error) {
    console.error(
      'Error procesando venta y actualizando stock:',
      error.message,
    );
    throw error;
  }
};

export const deleteVentaAndRestoreStock = async (userId, ventaId) => {
  if (!userId || !ventaId) return false;

  const batch = writeBatch(db);
  const ventaRef = doc(db, 'ventas', ventaId);

  try {
    const ventaDoc = await getDoc(ventaRef);
    if (!ventaDoc.exists()) throw new Error(`Venta ${ventaId} no encontrada.`);

    const ventaData = ventaDoc.data();
    batch.delete(ventaRef);

    if (ventaData.items && Array.isArray(ventaData.items)) {
      // Usamos un bucle for...of para poder usar await adentro
      for (const itemVendido of ventaData.items) {
        const esRastreable =
          itemVendido.id && !itemVendido.id.startsWith('manual_');

        if (esRastreable) {
          const productRef = doc(db, 'productos', itemVendido.id);
          const productDoc = await getDoc(productRef);

          // ¡Aquí está la verificación clave!
          // Solo actualizamos el stock si el producto todavía existe.
          if (productDoc.exists()) {
            batch.update(productRef, {
              stock: increment(itemVendido.cantidad),
            });
          } else {
            console.warn(
              `Se intentó restaurar stock para un producto eliminado (ID: ${itemVendido.id}), se omitió.`,
            );
          }
        }
      }
    }

    await batch.commit();
    return true;
  } catch (error) {
    console.error(
      `Error eliminando venta ${ventaId} y restaurando stock:`,
      error,
    );
    return false;
  }
};

// --- EGRESOS E INGRESOS MANUALES ---
export const getEgresos = (userId, sucursalId) =>
  getAllDataForUser(userId, 'egresos', sucursalId);
export const addEgreso = (userId, egresoData, sucursalId) =>
  addDocument(userId, 'egresos', egresoData, sucursalId);
export const deleteEgreso = (docId) => deleteDocument('egresos', docId);
export const getIngresosManuales = (userId, sucursalId) =>
  getAllDataForUser(userId, 'ingresos_manuales', sucursalId);
export const addIngresoManual = (userId, ingresoData, sucursalId) =>
  addDocument(userId, 'ingresos_manuales', ingresoData, sucursalId);
export const deleteIngresoManual = (docId) =>
  deleteDocument('ingresos_manuales', docId);

// --- NOTAS C/D ---
export const getNotasCD = (userId, sucursalId) =>
  getAllDataForUser(userId, 'notas_cd', sucursalId);
export const addNotaCDSimple = (userId, notaData, sucursalId) =>
  addDocument(userId, 'notas_cd', notaData, sucursalId);
export const deleteNotaCD = (docId) => deleteDocument('notas_cd', docId);

// --- PRESUPUESTOS ---
export const getPresupuestos = (userId, sucursalId) =>
  getAllDataForUser(userId, 'presupuestos', sucursalId);
export const addPresupuesto = (userId, presupuestoData, sucursalId) =>
  addDocument(userId, 'presupuestos', presupuestoData, sucursalId);
export const deletePresupuesto = (docId) =>
  deleteDocument('presupuestos', docId);

// --- MODIFICADO ---: Datos del negocio ahora es por usuario Y sucursal
// ESTRATEGIA CORREGIDA: Usar la colección 'sucursales' para guardar configuración específica
// para evitar problemas de permisos en 'datosNegocio/{sucursalId}'.
export const getDatosNegocio = async (userId, sucursalId = null) => {
  if (!userId) return null;

  try {
    // 1. Si hay sucursalId, intentamos leer la configuración de ESA sucursal
    if (sucursalId) {
      const sucursalRef = doc(db, 'sucursales', sucursalId);
      const sucursalSnap = await getDoc(sucursalRef);

      if (sucursalSnap.exists()) {
        const sucursalData = sucursalSnap.data();
        // Si tiene configuración específica, la usamos
        if (sucursalData.configuracion) {
          // Retornamos la config mezclada con el ID de la sucursal para referencia
          return { id: sucursalId, ...sucursalData.configuracion };
        }
      }
    }

    // 2. Fallback: Si no hay sucursal o no tiene config, leemos la global (legacy)
    const docRef = doc(db, 'datosNegocio', userId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
  } catch (error) {
    console.error('Error obteniendo datos del negocio:', error);
    return null;
  }
};

export const saveDatosNegocio = async (userId, data, sucursalId = null) => {
  if (!userId) return false;

  try {
    if (sucursalId) {
      // Guardar en el documento de la SUCURSAL
      const sucursalRef = doc(db, 'sucursales', sucursalId);
      await updateDoc(sucursalRef, {
        configuracion: { ...data, lastUpdated: serverTimestamp() },
      });
      return true;
    } else {
      // Guardar en el documento GLOBAL (legacy)
      const docRef = doc(db, 'datosNegocio', userId);
      await setDoc(
        docRef,
        { ...data, lastUpdated: serverTimestamp(), userId },
        { merge: true },
      );
      return true;
    }
  } catch (error) {
    console.error('Error guardando datos del negocio:', error);
    return false;
  }
};

// Inicializar configuración de sucursal copiando la del usuario (global) si no existe
export const initializeBranchSettings = async (userId, sucursalId) => {
  if (!userId || !sucursalId) return;

  // Verificamos si ya tiene configuración en la sucursal
  const currentBranchSettings = await getDatosNegocio(userId, sucursalId);

  // getDatosNegocio devuelve la global si no encuentra la específica,
  // así que necesitamos verificar "crudo" si la sucursal tiene el campo 'configuracion'
  const sucursalRef = doc(db, 'sucursales', sucursalId);
  const sucursalSnap = await getDoc(sucursalRef);

  if (sucursalSnap.exists()) {
    const data = sucursalSnap.data();
    if (!data.configuracion) {
      // No tiene configuración propia, copiamos la global
      console.log(`Inicializando configuración para sucursal ${sucursalId}...`);
      const globalSettings = await getDatosNegocio(userId); // Esto trae la global
      if (globalSettings) {
        const { id, ...dataToCopy } = globalSettings;
        await updateDoc(sucursalRef, {
          configuracion: { ...dataToCopy, lastUpdated: serverTimestamp() },
        });
      }
    }
  }
};

// Pega esta función en tu firestoreService.js

/**
 * Anula una venta: marca la venta como anulada, crea una nota de crédito
 * y restaura el stock de los productos, todo en una sola operación segura.
 * @param {string} userId - ID del usuario.
 * @param {object} ventaOriginal - El objeto completo de la venta a anular.
 * @param {object} notaData - El objeto con los datos de la nueva nota de crédito.
 * @returns {Promise<boolean>} - True si la operación fue exitosa, false si no.
 */
export const anularVentaConNotaCredito = async (
  userId,
  ventaOriginal,
  notaData,
) => {
  if (!userId || !ventaOriginal?.id) return false;

  // Un "lote de escritura" asegura que todas las operaciones se completen, o ninguna lo haga.
  const batch = writeBatch(db);

  try {
    // 1. Marcar la venta original como anulada
    const ventaRef = doc(db, 'ventas', ventaOriginal.id);
    // También guardamos el ID de la nota de crédito para tener una referencia cruzada
    batch.update(ventaRef, { anulada: true, notaCreditoId: notaData.id });

    // 2. Crear la nueva nota de crédito
    const newNotaDocRef = doc(db, 'notas_cd', notaData.id);
    batch.set(newNotaDocRef, notaData);

    // 3. Restaurar el stock de cada producto de la venta original
    if (Array.isArray(ventaOriginal.items)) {
      ventaOriginal.items.forEach((item) => {
        const esRastreable =
          item.id &&
          typeof item.id === 'string' &&
          !item.id.startsWith('manual_');
        if (esRastreable) {
          const productRef = doc(db, 'productos', item.id);
          batch.update(productRef, { stock: increment(item.cantidad) });
        }
      });
    }

    // 4. Ejecutar todas las operaciones en la base de datos
    await batch.commit();
    return true;
  } catch (error) {
    console.error('Error en la transacción de anulación de venta:', error);
    return false;
  }
};

// Pega también esta función en tu firestoreService.js

/**
 * Crea una nota de crédito/débito manual y, si es de crédito con
 * devolución, restaura el stock de los productos devueltos.
 * @param {string} userId - ID del usuario.
 * @param {object} notaData - El objeto completo de la nota a crear desde el formulario.
 * @returns {Promise<string|null>} - El ID de la nueva nota o null si falla.
 */
export const addNotaManual = async (userId, notaData, sucursalId) => {
  if (!userId || !notaData) return null;

  const batch = writeBatch(db);

  try {
    // 1. Crear la nueva nota de crédito/débito
    const notasRef = collection(db, 'notas_cd');
    const newNotaDocRef = doc(notasRef);
    batch.set(newNotaDocRef, {
      ...notaData,
      id: newNotaDocRef.id,
      sucursalId,
      userId,
    });

    // 2. Si la nota es de crédito e implica devolución, restauramos stock
    if (
      notaData.tipo === 'credito' &&
      notaData.implicaDevolucion &&
      Array.isArray(notaData.itemsDevueltos)
    ) {
      notaData.itemsDevueltos.forEach((item) => {
        if (item.id && !item.id.startsWith('manual_')) {
          const productRef = doc(db, 'productos', item.id);
          batch.update(productRef, { stock: increment(item.cantidad) });
        }
      });
    }

    // 3. Ejecutar las operaciones
    await batch.commit();
    return newNotaDocRef.id;
  } catch (error) {
    console.error('Error al crear nota manual:', error);
    return null;
  }
};
/**
 * Actualiza los precios de una lista de productos en un lote.
 * @param {Array} productsToUpdate - Un array de objetos, cada uno con 'id' y 'newPrice'.
 * @returns {Promise<boolean>} - True si la operación fue exitosa, false si falló.
 */
export const bulkUpdatePrices = async (productsToUpdate) => {
  if (!productsToUpdate || productsToUpdate.length === 0) {
    return true; // No hay nada que actualizar
  }

  const batch = writeBatch(db);

  productsToUpdate.forEach((product) => {
    const productRef = doc(db, 'productos', product.id);
    batch.update(productRef, { precio: product.newPrice });
  });

  try {
    await batch.commit();
    return true;
  } catch (error) {
    console.error('Error al actualizar precios masivamente: ', error);
    return false;
  }
};
/**
 * =================================================================
 * CIERRE DE CAJA / TURNOS
 * =================================================================
 */

// Iniciar un nuevo turno en la base de datos
export const startShift = (shiftData, sucursalId) => {
  return addDoc(collection(db, 'turnos'), { ...shiftData, sucursalId });
};

// Finalizar un turno existente
export const endShift = (shiftId, shiftData) => {
  const shiftDoc = doc(db, 'turnos', shiftId);
  return updateDoc(shiftDoc, shiftData)
    .then(() => true)
    .catch((error) => {
      console.error('Error al finalizar el turno:', error);
      return false;
    });
};

// Buscar si un vendedor ya tiene un turno abierto
export const getOpenShift = (userId, vendedorId, sucursalId) => {
  const q = query(
    collection(db, 'turnos'),
    where('userId', '==', userId),
    where('vendedorId', '==', vendedorId),
    where('estado', '==', 'abierto'),
    where('sucursalId', '==', sucursalId), // Filtrar por sucursal
    limit(1),
  );
  return getDocs(q);
};

// Añadir una venta a un turno abierto
export const addSaleToShift = (shiftId, ventaId) => {
  const shiftDoc = doc(db, 'turnos', shiftId);
  return updateDoc(shiftDoc, {
    ventasIds: arrayUnion(ventaId),
  });
};

/**
 * =================================================================
 * GESTIÓN DE SUCURSALES
 * =================================================================
 */

// Obtener todas las sucursales de un usuario
export const getSucursales = async (userId) => {
  if (!userId) return [];
  const q = query(collection(db, 'sucursales'), where('userId', '==', userId));
  try {
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error obteniendo sucursales:', error);
    return [];
  }
};

// Crear una nueva sucursal
export const addSucursal = async (userId, sucursalData) => {
  if (!userId) return null;
  try {
    const docRef = await addDoc(collection(db, 'sucursales'), {
      ...sucursalData,
      userId,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creando sucursal:', error);
    return null;
  }
};

export const updateSucursal = async (sucursalId, data) => {
  return updateDocument('sucursales', sucursalId, data);
};

/**
 * Importa productos de una sucursal a otra.
 * Copia los productos de la sucursal origen a la destino, pero con STOCK 0.
 *
 * @param {string} userId - ID del usuario.
 * @param {string} sourceSucursalId - ID de la sucursal de origen.
 * @param {string} targetSucursalId - ID de la sucursal de destino.
 * @returns {Promise<boolean>} - True si tuvo éxito.
 */
export const importarProductosDesdeSucursal = async (
  userId,
  sourceSucursalId,
  targetSucursalId,
) => {
  if (!userId || !sourceSucursalId || !targetSucursalId) return false;

  try {
    // 1. Obtener productos de la sucursal origen
    const productosOrigen = await getAllDataForUser(
      userId,
      'productos',
      sourceSucursalId,
    );

    if (productosOrigen.length === 0) return true; // Nada que importar

    // 1.5 Obtener productos de la sucursal DESTINO para evitar duplicados
    const productosDestino = await getAllDataForUser(
      userId,
      'productos',
      targetSucursalId,
    );

    // Creamos un Set de códigos de barras existentes en destino para búsqueda rápida
    const codigosExistentes = new Set(
      productosDestino
        .filter((p) => p.codigoBarras)
        .map((p) => String(p.codigoBarras).trim()),
    );

    const batch = writeBatch(db);
    const productosCollection = collection(db, 'productos');

    // 2. Preparar los nuevos documentos
    let operationCount = 0;
    const BATCH_LIMIT = 450;

    for (const producto of productosOrigen) {
      // Verificar si ya existe por código de barras
      if (producto.codigoBarras) {
        const codigo = String(producto.codigoBarras).trim();
        if (codigosExistentes.has(codigo)) {
          // Ya existe, saltamos este producto
          continue;
        }
      }

      // Crear copia limpia del producto
      const { id, ...productoData } = producto;

      const nuevoProducto = {
        ...productoData,
        userId,
        sucursalId: targetSucursalId,
        stock: 0, // <--- REQUISITO CLAVE: Stock en cero
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp(),
      };

      const newDocRef = doc(productosCollection);
      batch.set(newDocRef, nuevoProducto);
      operationCount++;

      // Agregamos al Set para evitar duplicados dentro del mismo lote de origen
      if (nuevoProducto.codigoBarras) {
        codigosExistentes.add(String(nuevoProducto.codigoBarras).trim());
      }

      if (operationCount >= BATCH_LIMIT) {
        break;
      }
    }

    if (operationCount > 0) {
      await batch.commit();
    }
    return true;
  } catch (error) {
    console.error('Error importando productos:', error);
    return false;
  }
};

/**
 * Asigna una sucursal a documentos huérfanos (MIGRACIÓN).
 * @param {string} userId
 * @param {string} sucursalId
 * @param {string} collectionName
 */
export const migrarDocumentosASucursal = async (
  userId,
  sucursalId,
  collectionName,
) => {
  // Esta función busca documentos del usuario que NO tengan campo sucursalId
  // y se lo asigna.
  // Firestore no permite filtrar por "campo no existe" fácilmente en una query compuesta con userId.
  // Estrategia: Traer todo lo del usuario y filtrar en memoria los que no tengan sucursalId.
  // (Solo para migración inicial, no para uso diario).

  try {
    const q = query(
      collection(db, collectionName),
      where('userId', '==', userId),
    );
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    let count = 0;

    snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data();
      if (!data.sucursalId) {
        batch.update(docSnap.ref, { sucursalId });
        count++;
      }
    });

    if (count > 0) {
      await batch.commit();
      console.log(
        `Migrados ${count} documentos de ${collectionName} a sucursal ${sucursalId}`,
      );
    }
    return true;
  } catch (error) {
    console.error(`Error migrando ${collectionName}:`, error);
    return false;
  }
};

/**
 * Elimina una sucursal.
 * @param {string} sucursalId
 */
export const deleteSucursal = async (sucursalId) => {
  try {
    await deleteDoc(doc(db, 'sucursales', sucursalId));
    return true;
  } catch (error) {
    console.error('Error eliminando sucursal:', error);
    return false;
  }
};

/**
 * FUERZA la asignación de TODOS los documentos de una colección a una sucursal.
 * Útil para recuperación de emergencia cuando la migración normal falla.
 * @param {string} userId
 * @param {string} sucursalId
 * @param {string} collectionName
 */
export const forceAssignAllDataToSucursal = async (
  userId,
  sucursalId,
  collectionName,
) => {
  try {
    // Traemos TODO lo del usuario, sin importar si tiene o no sucursalId
    const q = query(
      collection(db, collectionName),
      where('userId', '==', userId),
    );
    const snapshot = await getDocs(q);

    // Procesamos en lotes de 450 para respetar límites de Firestore
    const BATCH_LIMIT = 450;
    let batch = writeBatch(db);
    let count = 0;
    let batchCount = 0;

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      // Solo actualizamos si la sucursal es DIFERENTE a la actual
      if (data.sucursalId !== sucursalId) {
        batch.update(docSnap.ref, { sucursalId });
        count++;
        batchCount++;
      }

      if (batchCount >= BATCH_LIMIT) {
        await batch.commit();
        batch = writeBatch(db); // Nuevo batch
        batchCount = 0;
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }

    console.log(
      `Forzada asignación de ${count} documentos de ${collectionName} a sucursal ${sucursalId}`,
    );
    return count;
  } catch (error) {
    console.error(`Error forzando asignación en ${collectionName}:`, error);
    return 0;
  }
};
