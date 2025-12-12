// src/services/authService.js
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  sendEmailVerification,
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
export const signUpWithBusiness = async (
  email,
  password,
  nombreNegocio,
  plan = 'basic',
) => {
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
    subscriptionStatus: 'trial', // Trial por defecto
    plan: plan, // 'basic' o 'premium'
    subscriptionEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días de prueba
    habilitarVentaRapida: true,
    userId: user.uid,
  });

  // Enviar correo de verificación
  try {
    await sendEmailVerification(user);
  } catch (error) {
    console.error('Error enviando email de verificación:', error);
    // No bloqueamos el registro si falla el envío del email, pero lo logueamos
  }

  return userCredential;
};

export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  const userCredential = await signInWithPopup(auth, provider);
  const user = userCredential.user;

  // Check if business data exists, if not create it (similar to signUpWithBusiness but for Google)
  // Note: For simplicity, we might just want to ensure the user document exists.
  // However, the original signUpWithBusiness creates a specific structure.
  // Let's check if the document exists first.
  const negocioRef = doc(db, 'datosNegocio', user.uid);
  // We need to import getDoc to check existence, but for now let's assume
  // we might overwrite or merge. Ideally we check.
  // Let's just return the credential and let the component handle navigation.
  // Actually, to be safe and consistent, we should probably check if it's a new user
  // or if the doc exists. But the prompt didn't specify complex logic.
  // Let's stick to the requested simple auth for now.
  // Wait, if it's a new user via Google, they won't have 'datosNegocio'.
  // We should probably create it if it doesn't exist.

  // Let's import getDoc to be safe.
  const { getDoc } = await import('firebase/firestore');
  const docSnap = await getDoc(negocioRef);

  if (!docSnap.exists()) {
    await setDoc(negocioRef, {
      nombre: user.displayName || 'Mi Negocio',
      direccion: '',
      cuit: '',
      subscriptionStatus: 'trial',
      subscriptionEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      habilitarVentaRapida: true,
      userId: user.uid,
      email: user.email,
    });
  }

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

/**
 * Envía el correo de verificación al usuario actual.
 * @param {User} user - Objeto usuario de Firebase.
 */
export const sendVerificationEmail = async (user) => {
  await sendEmailVerification(user);
};
