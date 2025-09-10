// frontend/src/services/firestoreService.js
import { db } from '../firebaseConfig'; // Asegúrate que esta ruta sea correcta
import {
  collection, doc, addDoc, getDocs, getDoc,
  updateDoc, deleteDoc, query, where, writeBatch,
  serverTimestamp, setDoc, increment
} from "firebase/firestore";

// --- FUNCIÓN DE AYUDA QUE FALTABA ---
const getCollectionPathForUser = (collectionName) => {
  return collectionName;
};

// --- FUNCIONES CRUD GENÉRICAS ---
export const getAllDataForUser = async (userId, collectionName) => {
  if (!userId) return [];
  const collPath = getCollectionPathForUser(collectionName);
  const q = query(collection(db, collPath), where("userId", "==", userId));
  try {
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error(`Error obteniendo datos de ${collectionName} para ${userId}: `, error);
    return [];
  }
};

export const addDocument = async (userId, collectionName, data) => {
  if (!userId) return null;
  const collPath = getCollectionPathForUser(collectionName);
  try {
    const dataToSave = { ...data };
    if (dataToSave.hasOwnProperty('id')) delete dataToSave.id;

    const docRef = await addDoc(collection(db, collPath), {
      ...dataToSave,
      userId,
      createdAt: serverTimestamp(),
      lastUpdated: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error(`Error añadiendo documento a ${collectionName} para ${userId}: `, error);
    return null;
  }
};

export const updateDocument = async (collectionName, docId, dataToUpdate) => {
    if (!docId) return false;
    const docRef = doc(db, collectionName, docId);
    try {
        const cleanDataToUpdate = { ...dataToUpdate };
        if (cleanDataToUpdate.hasOwnProperty('id')) delete cleanDataToUpdate.id;
        await updateDoc(docRef, { ...cleanDataToUpdate, lastUpdated: serverTimestamp() });
        return true;
    } catch (error) { console.error(`Error actualizando ${docId} en ${collectionName}:`, error); return false; }
};

export const deleteDocument = async (collectionName, docId) => {
    if (!docId) return false;
    const docRef = doc(db, collectionName, docId);
    try { await deleteDoc(docRef); return true; }
    catch (error) { console.error(`Error eliminando ${docId} de ${collectionName}:`, error); return false; }
};

// --- PRODUCTOS ---
export const getProductos = (userId) => getAllDataForUser(userId, 'productos');
export const addProducto = (userId, productoData) => addDocument(userId, 'productos', productoData);
export const updateProducto = (docId, productoData) => updateDocument('productos', docId, productoData);
export const deleteProducto = (docId) => deleteDocument('productos', docId);

// --- CLIENTES ---
export const getClientes = (userId) => getAllDataForUser(userId, 'clientes');
export const addCliente = (userId, clienteData) => addDocument(userId, 'clientes', clienteData);
export const updateCliente = (docId, clienteData) => updateDocument('clientes', docId, clienteData);
export const deleteCliente = (docId) => deleteDocument('clientes', docId);

// --- VENDEDORES ---
export const getVendedores = (userId) => getAllDataForUser(userId, 'vendedores');
export const addVendedor = (userId, vendedorData) => addDocument(userId, 'vendedores', vendedorData);
export const updateVendedor = (docId, vendedorData) => updateDocument('vendedores', docId, vendedorData);
export const deleteVendedor = (docId) => deleteDocument('vendedores', docId);

/**
 * =================================================================
 * PROVEEDORES
 * =================================================================
 */

// NOTA: No necesitamos una función "get" aquí porque AppContext ya los carga en tiempo real.

// Agregar un nuevo proveedor
export const addProveedor = (userId, proveedorData) => {
  const proveedoresCollection = collection(db, 'proveedores');
  // Asegurarnos de que el userId esté en los datos a guardar
  const dataConUserId = { ...proveedorData, userId: userId };
  return addDoc(proveedoresCollection, dataConUserId).then(docRef => docRef.id);
};

// Actualizar un proveedor existente
export const updateProveedor = (proveedorId, proveedorData) => {
  const proveedorDoc = doc(db, 'proveedores', proveedorId);
  return updateDoc(proveedorDoc, proveedorData).then(() => true).catch(() => false);
};

/**
 * =================================================================
 * PEDIDOS A PROVEEDORES
 * =================================================================
 */

// Agregar un nuevo pedido
export const addPedido = (userId, pedidoData) => {
  const pedidosCollection = collection(db, 'pedidos');
  const dataConUserId = { ...pedidoData, userId: userId };
  return addDoc(pedidosCollection, dataConUserId).then(docRef => docRef.id);
};

// Actualizar un pedido (por ejemplo, para cambiar su estado)
export const updatePedido = (pedidoId, pedidoData) => {
  const pedidoDoc = doc(db, 'pedidos', pedidoId);
  return updateDoc(pedidoDoc, pedidoData).then(() => true).catch(() => false);
};

// Cuando se recibe un pedido, esta función actualizará el stock de los productos.
// Esta es una transacción para asegurar que todas las actualizaciones se hagan o ninguna.
export const recibirPedidoYActualizarStock = async (pedido) => {
  const batch = writeBatch(db);

  // 1. Actualizar el estado del pedido
  const pedidoRef = doc(db, 'pedidos', pedido.id);
  batch.update(pedidoRef, { 
    estado: 'recibido',
    fechaRecepcion: new Date().toISOString().split('T')[0] // Fecha actual
  });

  // 2. Actualizar el stock de cada producto en el pedido
  for (const item of pedido.items) {
    if (item.productoId) {
      const productoRef = doc(db, 'productos', item.productoId);
      // Usamos increment para sumar la cantidad recibida al stock actual de forma segura
      batch.update(productoRef, {
        stock: increment(item.cantidad)
      });
    }
  }

  try {
    await batch.commit();
    return true;
  } catch (error) {
    console.error("Error al recibir el pedido y actualizar el stock: ", error);
    return false;
  }
};
// --- VENTAS ---
export const getVentas = (userId) => getAllDataForUser(userId, 'ventas');
// --- MODIFICADO ---: Lógica para manejar items sin stock (Venta Rápida)
export const addVenta = async (userId, ventaData) => {
  if (!userId) throw new Error("ID de usuario no provisto para la venta.");
  const batch = writeBatch(db);
  try {
    const ventaCollPath = getCollectionPathForUser('ventas');
    const ventaPayload = { ...ventaData, userId, createdAt: serverTimestamp(), lastUpdated: serverTimestamp() };
    if (ventaPayload.hasOwnProperty('id')) delete ventaPayload.id;
    const newVentaRef = doc(collection(db, ventaCollPath));
    batch.set(newVentaRef, ventaPayload);

    const productosCollPath = getCollectionPathForUser('productos');
    for (const itemVendido of ventaData.items) {
      const esProductoRastreable = itemVendido.id && typeof itemVendido.id === 'string' && !itemVendido.id.startsWith("manual_") && !itemVendido.id.startsWith("local_");
      
      if (esProductoRastreable) {
        const productoRef = doc(db, productosCollPath, itemVendido.id);
        const productoDoc = await getDoc(productoRef);
        if (!productoDoc.exists()) throw new Error(`Producto ${itemVendido.nombre} (ID: ${itemVendido.id}) no encontrado.`);
        
        const stockActual = productoDoc.data().stock;
        if (stockActual < itemVendido.cantidad) {
          throw new Error(`Stock insuficiente para ${itemVendido.nombre}. Solicitado: ${itemVendido.cantidad}, Disponible: ${stockActual}`);
        }
        batch.update(productoRef, { stock: increment(-Number(itemVendido.cantidad)) });
      }
    }
    await batch.commit();
    return newVentaRef.id;
  } catch (error) {
    console.error("Error procesando venta y actualizando stock:", error.message);
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
                const esRastreable = itemVendido.id && !itemVendido.id.startsWith("manual_");

                if (esRastreable) {
                    const productRef = doc(db, "productos", itemVendido.id);
                    const productDoc = await getDoc(productRef);

                    // ¡Aquí está la verificación clave!
                    // Solo actualizamos el stock si el producto todavía existe.
                    if (productDoc.exists()) {
                        batch.update(productRef, { stock: increment(itemVendido.cantidad) });
                    } else {
                        console.warn(`Se intentó restaurar stock para un producto eliminado (ID: ${itemVendido.id}), se omitió.`);
                    }
                }
            }
        }

        await batch.commit();
        return true;
    } catch (error) { 
        console.error(`Error eliminando venta ${ventaId} y restaurando stock:`, error); 
        return false; 
    }
};

// --- EGRESOS E INGRESOS MANUALES ---
export const getEgresos = (userId) => getAllDataForUser(userId, 'egresos');
export const addEgreso = (userId, egresoData) => addDocument(userId, 'egresos', egresoData);
export const deleteEgreso = (docId) => deleteDocument('egresos', docId);
export const getIngresosManuales = (userId) => getAllDataForUser(userId, 'ingresos_manuales');
export const addIngresoManual = (userId, ingresoData) => addDocument(userId, 'ingresos_manuales', ingresoData);
export const deleteIngresoManual = (docId) => deleteDocument('ingresos_manuales', docId);

// --- NOTAS C/D ---
export const getNotasCD = (userId) => getAllDataForUser(userId, 'notas_cd');
export const addNotaCDSimple = (userId, notaData) => addDocument(userId, 'notas_cd', notaData);
export const deleteNotaCD = (docId) => deleteDocument('notas_cd', docId);

// --- MODIFICADO ---: Datos del negocio ahora es por usuario
export const getDatosNegocio = async (userId) => {
  if (!userId) return null;
  const docRef = doc(db, "datosNegocio", userId);
  try {
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
  } catch (error) { console.error("Error obteniendo datos del negocio:", error); return null; }
};

export const saveDatosNegocio = async (userId, data) => {
  if (!userId) return false;
  const docRef = doc(db, "datosNegocio", userId);
  try {
    await setDoc(docRef, { ...data, lastUpdated: serverTimestamp() }, { merge: true });
    return true;
  } catch (error) { console.error("Error guardando datos del negocio:", error); return false; }
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
export const anularVentaConNotaCredito = async (userId, ventaOriginal, notaData) => {
    if (!userId || !ventaOriginal?.id) return false;
    
    // Un "lote de escritura" asegura que todas las operaciones se completen, o ninguna lo haga.
    const batch = writeBatch(db);

    try {
        // 1. Marcar la venta original como anulada
        const ventaRef = doc(db, "ventas", ventaOriginal.id);
        // También guardamos el ID de la nota de crédito para tener una referencia cruzada
        batch.update(ventaRef, { anulada: true, notaCreditoId: notaData.id });

        // 2. Crear la nueva nota de crédito
        const newNotaDocRef = doc(db, "notas_cd", notaData.id);
        batch.set(newNotaDocRef, notaData);

        // 3. Restaurar el stock de cada producto de la venta original
        if (Array.isArray(ventaOriginal.items)) {
            ventaOriginal.items.forEach(item => {
                const esRastreable = item.id && typeof item.id === 'string' && !item.id.startsWith("manual_");
                if (esRastreable) {
                    const productRef = doc(db, "productos", item.id);
                    batch.update(productRef, { stock: increment(item.cantidad) });
                }
            });
        }
        
        // 4. Ejecutar todas las operaciones en la base de datos
        await batch.commit();
        return true;
    } catch (error) {
        console.error("Error en la transacción de anulación de venta:", error);
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
export const addNotaManual = async (userId, notaData) => {
    if (!userId || !notaData) return null;
    
    const batch = writeBatch(db);

    try {
        // 1. Crear la nueva nota de crédito/débito
        const notasRef = collection(db, "notas_cd");
        const newNotaDocRef = doc(notasRef);
        batch.set(newNotaDocRef, { ...notaData, id: newNotaDocRef.id });

        // 2. Si la nota es de crédito e implica devolución, restauramos stock
        if (notaData.tipo === 'credito' && notaData.implicaDevolucion && Array.isArray(notaData.itemsDevueltos)) {
            notaData.itemsDevueltos.forEach(item => {
                if (item.id && !item.id.startsWith('manual_')) {
                    const productRef = doc(db, "productos", item.id);
                    batch.update(productRef, { stock: increment(item.cantidad) });
                }
            });
        }
        
        // 3. Ejecutar las operaciones
        await batch.commit();
        return newNotaDocRef.id;
    } catch(error) {
        console.error("Error al crear nota manual:", error);
        return null;
    }
};