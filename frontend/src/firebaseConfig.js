// src/firebaseConfig.js o firebaseConfig.js (depende dónde lo tengas)

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// IMPORTANTE: Añadir la importación de getFirestore
import { getFirestore } from "firebase/firestore";
// getAnalytics es opcional, puedes quitarlo si no lo usas directamente.
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  // TUS CREDENCIALES (Asegúrate que estas sean las correctas de tu proyecto Firebase)
  // Si esta apiKey es de prueba o un ejemplo, REEMPLÁZALA con la tuya real.
  apiKey: "***REDACTED***",
  authDomain: "khaleesy-system.firebaseapp.com",
  projectId: "khaleesy-system",
  storageBucket: "khaleesy-system.firebasestorage.app", // Podría ser .appspot.com, verifica en tu consola Firebase
  messagingSenderId: "1016220561039",
  appId: "1:1016220561039:web:661547e5db672f59f88afa",
  measurementId: "G-K7MQLXY3TD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// IMPORTANTE: Inicializar Firestore
const db = getFirestore(app);

// analytics es opcional
const analytics = getAnalytics(app);

// IMPORTANTE: Exportar la instancia de db para que otros módulos puedan usarla
export { db };