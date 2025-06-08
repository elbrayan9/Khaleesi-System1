// src/services/firestoreService.js
import { db } from '../firebaseConfig';
import {
  collection, doc, addDoc, getDocs, getDoc,
  updateDoc, deleteDoc, query, where, writeBatch,
  serverTimestamp, setDoc, increment
} from "firebase/firestore";

const getCollectionPathForUser = (collectionName) => {
  return collectionName;
};

// --- Funciones CRUD Genéricas ---
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
  const ventaRef = doc(db, getCollectionPathForUser('ventas'), ventaId);
  try {
    const ventaDoc = await getDoc(ventaRef);
    if (!ventaDoc.exists()) throw new Error(`Venta ${ventaId} no encontrada.`);
    const ventaData = ventaDoc.data();
    batch.delete(ventaRef);

    if (ventaData.items && Array.isArray(ventaData.items)) {
      for (const itemVendido of ventaData.items) {
        const esProductoRastreable = itemVendido.id && typeof itemVendido.id === 'string' && !itemVendido.id.startsWith("manual_") && !itemVendido.id.startsWith("local_");
        if (esProductoRastreable) {
          const productoRef = doc(db, getCollectionPathForUser('productos'), itemVendido.id);
          batch.update(productoRef, { stock: increment(Number(itemVendido.cantidad)) });
        }
      }
    }
    await batch.commit();
    return true;
  } catch (error) { console.error(`Error eliminando venta ${ventaId} y restaurando stock:`, error); return false; }
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