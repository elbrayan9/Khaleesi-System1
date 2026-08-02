// frontend/src/services/storageService.js
//
// Subida de comprobantes (PDF) a Firebase Storage para compartir por link.

import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebaseConfig';

/**
 * Sube un PDF de comprobante y devuelve su URL de descarga (con token).
 * @param {string} userId - dueño (para la regla de Storage y la carpeta).
 * @param {Blob} blob - el PDF.
 * @param {string} nombre - nombre de archivo (ej: Factura_C_abc123.pdf).
 * @returns {Promise<string>} URL pública (por token) del PDF.
 */
export const subirComprobantePdf = async (userId, blob, nombre) => {
  if (!userId) throw new Error('Falta el usuario para subir el comprobante.');
  const safeName = String(nombre || 'comprobante.pdf').replace(/[^\w.-]/g, '_');
  const path = `comprobantes/${userId}/${Date.now()}_${safeName}`;
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, blob, { contentType: 'application/pdf' });
  return getDownloadURL(fileRef);
};

/**
 * Sube la imagen de un producto y devuelve su URL de descarga.
 * @param {string} userId - dueño (para la regla de Storage y la carpeta).
 * @param {Blob} blob - la imagen (ya redimensionada/comprimida).
 * @param {string} nombre - nombre base del archivo.
 * @returns {Promise<string>} URL pública (por token) de la imagen.
 */
export const subirImagenProducto = async (userId, blob, nombre) => {
  if (!userId) throw new Error('Falta el usuario para subir la imagen.');
  if (!blob) throw new Error('No hay imagen para subir.');
  const base = String(nombre || 'producto').replace(/[^\w.-]/g, '_');
  const path = `productos/${userId}/${Date.now()}_${base}.jpg`;
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, blob, { contentType: blob.type || 'image/jpeg' });
  return getDownloadURL(fileRef);
};
