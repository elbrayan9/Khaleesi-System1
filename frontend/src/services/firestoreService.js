// src/services/firestoreService.js
import { db } from '../firebaseConfig'; // Asegúrate que la ruta es correcta
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
  writeBatch,
  serverTimestamp,
  setDoc,
  increment // <-- IMPORTANTE: Añadir increment para actualizaciones atómicas de stock
} from "firebase/firestore";

const DEFAULT_USER_ID = "defaultUser"; // O el ID de tu usuario de prueba por defecto

const getCollectionPathForUser = (userId, collectionName) => {
  // Actualmente, las colecciones son globales pero filtradas/creadas con un campo userId.
  // Si prefieres subcolecciones por usuario, la ruta sería algo como: `users/${userId}/${collectionName}`
  // y las reglas de seguridad cambiarían en consecuencia.
  return collectionName;
};

// --- Funciones CRUD Genéricas (Robustecidas) ---
export const getAllDataForUser = async (userId, collectionName) => {
  if (!userId) {
    // console.warn(`getAllDataForUser: userId no provisto, usando DEFAULT_USER_ID para ${collectionName}.`); // Log opcional
    userId = DEFAULT_USER_ID;
  }
  const collPath = getCollectionPathForUser(userId, collectionName);
  const q = query(collection(db, collPath), where("userId", "==", userId));
  try {
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error(`Error obteniendo datos de ${collectionName} para ${userId}: `, error);
    return []; // Devolver array vacío en caso de error para evitar problemas de iteración
  }
};

export const saveDataForUserBatch = async (userId, collectionName, dataArray) => {
  if (!userId) userId = DEFAULT_USER_ID;
  const collPath = getCollectionPathForUser(userId, collectionName);
  const itemsCollectionRef = collection(db, collPath);
  try {
    const batch = writeBatch(db);
    // Opcional: Borrar documentos existentes para este usuario en esta colección antes de añadir los nuevos.
    // Esto es útil si esta función se usa para una "sincronización completa" desde datos iniciales.
    const q = query(itemsCollectionRef, where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });

    dataArray.forEach(item => {
      const docData = { ...item, userId, lastUpdated: serverTimestamp() };
      if (docData.hasOwnProperty('id') && (typeof docData.id === 'number' || docData.id === null || docData.id === undefined)) {
          delete docData.id; // Permitir que Firestore genere ID si el ID local no es un ID de Firestore
      }
      const newDocRef = doc(itemsCollectionRef); // Firestore genera ID
      batch.set(newDocRef, docData);
    });

    await batch.commit();
    return true;
  } catch (error) {
    console.error(`Error guardando datos (batch) para ${collectionName} para ${userId}: `, error);
    return false;
  }
};

export const addDocument = async (userId, collectionName, data) => {
  if (!userId) userId = DEFAULT_USER_ID;
  const collPath = getCollectionPathForUser(userId, collectionName);
  try {
    const dataToSave = { ...data };
    // Asegurar que no se envíe 'id' si es un placeholder o si queremos que Firestore genere uno.
    if (dataToSave.hasOwnProperty('id') && (dataToSave.id === null || dataToSave.id === undefined || typeof dataToSave.id !== 'string' || dataToSave.id.trim() === '')) {
        delete dataToSave.id;
    } else if (dataToSave.hasOwnProperty('id') && typeof dataToSave.id === 'string' && dataToSave.id.startsWith('local_')) {
        delete dataToSave.id; // También quitar IDs locales temporales
    }

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
  if (!docId || typeof docId !== 'string' || docId.startsWith("local_")) { // No actualizar con ID local
      console.error(`updateDocument: ID de documento inválido: ${docId}`);
      return false;
  }
  const docRef = doc(db, collectionName, docId);
  try {
    const cleanDataToUpdate = { ...dataToUpdate };
    if (cleanDataToUpdate.hasOwnProperty('id')) delete cleanDataToUpdate.id; // No actualizar el campo 'id'
    await updateDoc(docRef, { ...cleanDataToUpdate, lastUpdated: serverTimestamp() });
    return true;
  } catch (error) { console.error(`Error actualizando ${docId} en ${collectionName}:`, error); return false; }
};

export const deleteDocument = async (collectionName, docId) => {
  if (!docId || typeof docId !== 'string' || docId.startsWith("local_")) { // No eliminar con ID local
    console.error(`deleteDocument: ID de documento inválido: ${docId} para ${collectionName}`);
    return false;
  }
  const docRef = doc(db, collectionName, docId);
  try { await deleteDoc(docRef); return true; }
  catch (error) { console.error(`Error eliminando ${docId} de ${collectionName}:`, error); return false; }
};


// --- PRODUCTOS ---
export const getProductos = (userId) => getAllDataForUser(userId, 'productos');
export const addProducto = (userId, productoData) => addDocument(userId, 'productos', productoData);
export const updateProducto = (docId, productoData) => updateDocument('productos', docId, productoData);
export const deleteProducto = (docId) => deleteDocument('productos', docId);
export const saveProductosBatch = (userId, productosArray) => saveDataForUserBatch(userId, 'productos', productosArray);

// --- CLIENTES ---
export const getClientes = (userId) => getAllDataForUser(userId, 'clientes');
export const addCliente = (userId, clienteData) => addDocument(userId, 'clientes', clienteData);
export const updateCliente = (docId, clienteData) => updateDocument('clientes', docId, clienteData);
export const deleteCliente = (docId) => deleteDocument('clientes', docId);
export const saveClientesBatch = (userId, clientesArray) => saveDataForUserBatch(userId, 'clientes', clientesArray);

// --- VENTAS ---
export const getVentas = (userId) => getAllDataForUser(userId, 'ventas');
export const addVenta = async (userId, ventaData) => {
  if (!userId) userId = DEFAULT_USER_ID;
  const batch = writeBatch(db);
  try {
    const ventaCollPath = getCollectionPathForUser(userId, 'ventas');
    const ventaPayload = { ...ventaData, userId, createdAt: serverTimestamp(), lastUpdated: serverTimestamp() };
    if (ventaPayload.hasOwnProperty('id')) delete ventaPayload.id;
    const newVentaRef = doc(collection(db, ventaCollPath));
    batch.set(newVentaRef, ventaPayload);

    const productosCollPath = getCollectionPathForUser(userId, 'productos');
    for (const itemVendido of ventaData.items) {
      if (!itemVendido.id || typeof itemVendido.id !== 'string' || itemVendido.id.startsWith("local_")) {
          console.error(`ID de producto inválido para "${itemVendido.nombre}" en la venta. ID: ${itemVendido.id}`);
          throw new Error(`ID de producto inválido para "${itemVendido.nombre}" en la venta.`);
      }
      const productoRef = doc(db, productosCollPath, itemVendido.id);
      // Usar 'increment' para restar del stock de forma atómica
      // Se necesita leer el stock actual ANTES para verificar si hay suficiente,
      // pero la actualización en sí puede ser con increment.
      const productoDoc = await getDoc(productoRef); // Leer stock actual
      if (!productoDoc.exists()) {
          throw new Error(`Producto ${itemVendido.nombre} (ID: ${itemVendido.id}) no encontrado.`);
      }
      const stockActual = productoDoc.data().stock;
      if (stockActual < itemVendido.cantidad) {
          throw new Error(`Stock insuficiente para ${itemVendido.nombre}. Solicitado: ${itemVendido.cantidad}, Disponible: ${stockActual}`);
      }
      batch.update(productoRef, {
          stock: increment(-Number(itemVendido.cantidad)),
          lastUpdated: serverTimestamp()
      });
    }
    await batch.commit();
    return newVentaRef.id;
  } catch (error) {
    console.error("Error procesando venta y actualizando stock:", error.message);
    throw error; // Relanzar para que App.jsx pueda manejarlo y mostrar mensaje al usuario
  }
};
export const deleteVentaAndRestoreStock = async (userId, ventaId) => {
    if (!userId) userId = DEFAULT_USER_ID;
    if (!ventaId || typeof ventaId !== 'string' || ventaId.startsWith("local_")) {
        console.error(`deleteVentaAndRestoreStock: ID de venta inválido: ${ventaId}`); return false;
    }
    const batch = writeBatch(db);
    const ventaRef = doc(db, getCollectionPathForUser(userId, 'ventas'), ventaId);
    try {
        const ventaDoc = await getDoc(ventaRef);
        if (!ventaDoc.exists()) throw new Error(`Venta ${ventaId} no encontrada para eliminar.`);
        const ventaData = ventaDoc.data();
        batch.delete(ventaRef);

        const productosCollPath = getCollectionPathForUser(userId, 'productos');
        if (ventaData.items && Array.isArray(ventaData.items)) {
            for (const itemVendido of ventaData.items) {
                if (!itemVendido.id || typeof itemVendido.id !== 'string' || itemVendido.id.startsWith("local_")) {
                     console.warn(`ID de producto inválido en items de venta ${ventaId} al restaurar stock: ${itemVendido.id}. Saltando.`); continue;
                }
                const productoRef = doc(db, productosCollPath, itemVendido.id);
                batch.update(productoRef, {
                    stock: increment(Number(itemVendido.cantidad)),
                    lastUpdated: serverTimestamp()
                });
            }
        }
        await batch.commit();
        return true;
    } catch (error) { console.error(`Error eliminando venta ${ventaId} y restaurando stock:`, error); return false; }
};
export const saveVentasBatch = (userId, ventasArray) => saveDataForUserBatch(userId, 'ventas', ventasArray);

// --- EGRESOS ---
export const getEgresos = (userId) => getAllDataForUser(userId, 'egresos');
export const addEgreso = (userId, egresoData) => addDocument(userId, 'egresos', egresoData);
export const deleteEgreso = (docId) => deleteDocument('egresos', docId);
export const saveEgresosBatch = (userId, egresosArray) => saveDataForUserBatch(userId, 'egresos', egresosArray);

// --- INGRESOS MANUALES ---
export const getIngresosManuales = (userId) => getAllDataForUser(userId, 'ingresos_manuales');
export const addIngresoManual = (userId, ingresoData) => addDocument(userId, 'ingresos_manuales', ingresoData);
export const deleteIngresoManual = (docId) => deleteDocument('ingresos_manuales', docId);
export const saveIngresosManualesBatch = (userId, ingresosArray) => saveDataForUserBatch(userId, 'ingresos_manuales', ingresosArray);

// --- NOTAS C/D ---
export const getNotasCD = (userId) => getAllDataForUser(userId, 'notas_cd');

export const addNotaCDSimple = (userId, notaData) => {
    const { itemsDevueltos, ...simpleNotaData } = notaData; // No guardar itemsDevueltos aquí
    return addDocument(userId, 'notas_cd', simpleNotaData);
};

export const addNotaCreditoWithStockUpdate = async (userId, notaData, itemsDevueltos) => {
  if (!userId) userId = DEFAULT_USER_ID;
  const batch = writeBatch(db);
  try {
    const notasCDCollPath = getCollectionPathForUser(userId, 'notas_cd');
    const notaPayload = { ...notaData, itemsDevueltos: itemsDevueltos || [], userId, createdAt: serverTimestamp(), lastUpdated: serverTimestamp() };
    if (notaPayload.hasOwnProperty('id')) delete notaPayload.id;
    const newNotaCDRef = doc(collection(db, notasCDCollPath));
    batch.set(newNotaCDRef, notaPayload);

    if (itemsDevueltos && itemsDevueltos.length > 0) {
        const productosCollPath = getCollectionPathForUser(userId, 'productos');
        for (const itemDevuelto of itemsDevueltos) {
            if (!itemDevuelto.id || typeof itemDevuelto.id !== 'string' || itemDevuelto.id.startsWith("local_")) {
                console.warn(`ID producto inválido en devolución: ${itemDevuelto.id} para "${itemDevuelto.nombre}". Saltando restauración de stock.`); continue;
            }
            const cantidadNum = Number(itemDevuelto.cantidad);
            if (isNaN(cantidadNum) || cantidadNum <= 0) {
                console.warn(`Cantidad inválida en devolución para "${itemDevuelto.nombre}": ${itemDevuelto.cantidad}. Saltando.`); continue;
            }
            const productoRef = doc(db, productosCollPath, itemDevuelto.id);
            batch.update(productoRef, { stock: increment(cantidadNum), lastUpdated: serverTimestamp() });
        }
    }
    await batch.commit();
    return newNotaCDRef.id;
  } catch (error) { console.error("Error en addNotaCreditoWithStockUpdate:", error); return null; }
};

export const deleteNotaCD = (docId) => deleteDocument('notas_cd', docId);
// Si al eliminar una nota de crédito con devolución se debe revertir el stock, necesitarías una función más compleja similar a deleteVentaAndRestoreStock
// export const deleteNotaCDAndAdjustStock = async (userId, notaId) => { /* ... lógica similar ... */ }

export const saveNotasCDBatch = (userId, notasArray) => saveDataForUserBatch(userId, 'notas_cd', notasArray);

// --- DATOS NEGOCIO ---
export const getDatosNegocio = async () => {
  const docRef = doc(db, "configuracionGlobal", "datosNegocio");
  try {
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
  } catch (error) { console.error("Error obteniendo datos del negocio:", error); return null; }
};
export const saveDatosNegocio = async (data) => {
  const docRef = doc(db, "configuracionGlobal", "datosNegocio");
  try {
    await setDoc(docRef, { ...data, lastUpdated: serverTimestamp() }, { merge: true });
    return true;
  } catch (error) { console.error("Error guardando datos del negocio:", error); return false; }
};