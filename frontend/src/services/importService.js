import * as XLSX from 'xlsx';
import { db } from '../firebaseConfig';
import {
  writeBatch,
  doc,
  collection,
  serverTimestamp,
} from 'firebase/firestore';

// --- CONFIGURACIÓN DE COLUMNAS REQUERIDAS ---
const REQUIRED_COLUMNS = {
  productos: ['nombre', 'precio', 'stock'], // Mínimo requerido
  clientes: ['nombre'],
  proveedores: ['nombre'],
  ventas: ['fecha', 'total'], // Para historial
};

// --- PLANTILLAS DE EJEMPLO ---
const TEMPLATES = {
  productos: [
    {
      nombre: 'Ej: Coca Cola 1.5L',
      precio: 1500,
      costo: 1000,
      stock: 50,
      codigoBarras: '779123456789',
      categoria: 'Bebidas',
      descripcion: 'Gaseosa cola',
    },
  ],
  clientes: [
    {
      nombre: 'Juan Pérez',
      email: 'juan@ejemplo.com',
      telefono: '1122334455',
      direccion: 'Calle Falsa 123',
      dni: '12345678',
    },
  ],
  proveedores: [
    {
      nombre: 'Distribuidora S.A.',
      email: 'contacto@distribuidora.com',
      telefono: '1144556677',
      contacto: 'Roberto',
      cuit: '30-12345678-9',
    },
  ],
  ventas: [
    {
      fecha: '2023-10-25', // Formato YYYY-MM-DD
      total: 5000,
      clienteNombre: 'Consumidor Final', // Opcional
      metodoPago: 'Efectivo', // Opcional
    },
  ],
};

// --- GENERAR PLANTILLA ---
export const generateTemplate = (type) => {
  const data = TEMPLATES[type] || [];
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Plantilla');
  XLSX.writeFile(workbook, `plantilla_${type}.xlsx`);
};

// --- PARSEAR ARCHIVO ---
export const parseExcelFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};

// --- VALIDAR DATOS ---
export const validateData = (data, type) => {
  const required = REQUIRED_COLUMNS[type];
  if (!required) return { valid: true }; // Si no hay requisitos estrictos

  const errors = [];
  if (!data || data.length === 0) {
    return { valid: false, errors: ['El archivo está vacío.'] };
  }

  // Verificar columnas en la primera fila
  const firstRow = data[0];
  const missingColumns = required.filter(
    (col) => !Object.keys(firstRow).includes(col),
  );

  if (missingColumns.length > 0) {
    return {
      valid: false,
      errors: [`Faltan columnas requeridas: ${missingColumns.join(', ')}`],
    };
  }

  return { valid: true, errors: [] };
};

// --- PROCESAR LOTE (BATCH IMPORT) ---
export const processBatchImport = async (
  data,
  collectionName,
  userId,
  sucursalId,
  onProgress,
) => {
  if (!userId || !sucursalId)
    throw new Error('Faltan datos de usuario o sucursal.');

  const BATCH_SIZE = 450; // Firestore límite es 500, dejamos margen
  const total = data.length;
  let processed = 0;

  // Dividir en chunks
  for (let i = 0; i < total; i += BATCH_SIZE) {
    const chunk = data.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);

    chunk.forEach((item) => {
      const docRef = doc(collection(db, collectionName)); // ID automático

      // Preparar datos comunes
      let docData = {
        ...item,
        userId,
        sucursalId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Lógica específica por tipo
      if (collectionName === 'productos') {
        docData.precio = Number(item.precio) || 0;
        docData.costo = Number(item.costo) || 0;
        docData.stock = Number(item.stock) || 0;
        // Asegurar que codigoBarras sea string si existe
        if (docData.codigoBarras)
          docData.codigoBarras = String(docData.codigoBarras);
      } else if (collectionName === 'ventas') {
        // Para ventas históricas
        docData.esHistorial = true; // Marca para diferenciar
        docData.total = Number(item.total) || 0;
        // Intentar parsear fecha, si falla usar fecha actual
        const fechaDate = new Date(item.fecha);
        docData.fecha = !isNaN(fechaDate)
          ? item.fecha
          : new Date().toISOString().split('T')[0];
        docData.timestamp = !isNaN(fechaDate) ? fechaDate : new Date();
      }

      batch.set(docRef, docData);
    });

    await batch.commit();
    processed += chunk.length;
    if (onProgress) onProgress(Math.round((processed / total) * 100));
  }

  return { success: true, count: processed };
};
