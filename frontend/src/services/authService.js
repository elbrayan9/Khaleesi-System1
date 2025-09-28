// src/services/authService.js
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
} from 'firebase/auth';
import { db } from '../firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';

const auth = getAuth();

/**
 * Registra un nuevo usuario y crea su perfil de negocio inicial.
 * @param {string} email - Email del usuario.
 * @param {string} password - Contraseña del usuario.
 * @param {string} nombreNegocio - Nombre del negocio.
 * @returns {Promise<UserCredential>}
 */
export const signUpWithBusiness = async (email, password, nombreNegocio) => {
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    password,
  );
  const user = userCredential.user;

  // Al registrarse, crea el documento del negocio con valores por defecto.
  const negocioRef = doc(db, 'datosNegocio', user.uid);
  await setDoc(negocioRef, {
    nombre: nombreNegocio,
    direccion: '',
    cuit: '',
    subscriptionStatus: 'trial', // o 'active' si quieres
    subscriptionEndDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // Ejemplo: 15 días de prueba
    habilitarVentaRapida: true, // Habilitado por defecto para nuevos negocios
    userId: user.uid,
  });

  return userCredential;
};

export const signIn = (email, password) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const logOut = () => {
  return signOut(auth);
};

export const monitorAuthState = (callback) => {
  return onAuthStateChanged(auth, callback);
};

// Agrega esta función al final de tu authService.js

/**
 * Envía un correo electrónico para restablecer la contraseña de un usuario.
 * @param {string} email - El correo electrónico del usuario que solicita el restablecimiento.
 * @returns {Promise<void>}
 */
export const sendPasswordReset = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    // Firebase se encarga de enviar el email. No necesitamos devolver nada.
  } catch (error) {
    // Si hay un error (ej: el email no existe), lo lanzamos para manejarlo en la pantalla.
    console.error('Error al enviar email de restablecimiento:', error);
    throw error;
  }
};
