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

  // **El nombre lleva un identificador al azar y no la hora.**
  //
  // El comprobante que se le manda a un cliente por WhatsApp lo abre alguien
  // que no tiene cuenta, así que el archivo tiene que poder bajarse sin sesión.
  // Con la hora en milisegundos adelante, el nombre era adivinable: son ochenta
  // y seis millones de posibilidades por día, poco para algo que protege los
  // datos de una persona. Con un identificador al azar deja de serlo.
  //
  // Se le antepone al nombre en vez de reemplazarlo para que, si el comercio lo
  // guarda, siga viendo de qué factura se trata.
  const azar =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}${Math.random().toString(36).slice(2, 10)}`;
  const path = `comprobantes/${userId}/${azar}_${safeName}`;
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

/**
 * Sube el logo del negocio (para la factura) y devuelve su URL de descarga.
 * @param {string} userId - dueño.
 * @param {Blob} blob - la imagen (ya redimensionada).
 * @returns {Promise<string>} URL pública (por token) del logo.
 */
export const subirLogoNegocio = async (userId, blob) => {
  if (!userId) throw new Error('Falta el usuario para subir el logo.');
  if (!blob) throw new Error('No hay logo para subir.');
  const path = `logos/${userId}/${Date.now()}_logo.jpg`;
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, blob, { contentType: blob.type || 'image/jpeg' });
  return getDownloadURL(fileRef);
};
