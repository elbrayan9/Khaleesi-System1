/**
 * Este archivo es el punto de entrada para tus Cloud Functions.
 * Aquí defines el código que se ejecutará en los servidores de Google.
 */

// Importa los módulos necesarios de Firebase
const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Inicializa la conexión con los servicios de Firebase a nivel de administrador
admin.initializeApp();

/**
 * Cloud Function de tipo 'onCall' para asignar un rol de administrador a un usuario.
 * 'onCall' significa que se puede llamar de forma segura desde tu aplicación frontend.
 *
 * @param {object} data - El objeto enviado desde el frontend. Debe contener el email del usuario.
 * @param {object} context - Información de autenticación de la persona que llama a la función.
 */
exports.addAdminRole = functions.https.onCall(async (data, context) => {
  
  // --- ¡ESTA ES LA PARTE QUE CAMBIÓ! ---
  // Ahora esta sección está activa. La función verificará si la persona
  // que la llama ya es un administrador.
  if (context.auth.token.admin !== true) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Solo un administrador puede realizar esta acción.'
    );
  }

  const email = data.email;

  // Verifica que el email fue enviado
  if (!email || typeof email !== 'string') {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'El email debe ser proporcionado y ser un texto válido.'
    );
  }

  try {
    // Busca al usuario en Firebase Authentication usando su email
    const user = await admin.auth().getUserByEmail(email);

    // Asigna el "Custom Claim" (rol personalizado) de 'admin' a ese usuario.
    // Esto es lo que luego leeremos en el frontend y en las reglas de seguridad.
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });
    
    // Devuelve un mensaje de éxito si todo salió bien
    const successMessage = `Éxito! El usuario ${email} ahora es administrador.`;
    console.log(successMessage);
    return { message: successMessage };

  } catch (err) {
    // Si ocurre un error (ej: el email no existe), lo registra y devuelve un error
    console.error("Error al asignar rol de admin:", err);
    throw new functions.https.HttpsError(
      'internal',
      'Ocurrió un error al intentar asignar el rol de administrador.'
    );
  }
});