// src/firebaseConfig.js
import { getAuth } from "firebase/auth";
import { initializeApp } from "firebase/app";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentSingleTabManager,
  setLogLevel,
} from "firebase/firestore";
import { getAnalytics, isSupported as analyticsIsSupported } from "firebase/analytics";

// Config desde Vite (.env)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: import.meta.env.VITE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_APP_ID,
  measurementId: import.meta.env.VITE_MEASUREMENT_ID,
};

export const app = initializeApp(firebaseConfig);

/**
 * 🔧 Resiliencia de transporte y caché:
 * - persistentLocalCache + persistentSingleTabManager: IndexedDB bien administrado (1 sola pestaña “líder”)
 * - experimentalAutoDetectLongPolling: cae a long-polling si la red rompe WebChannel/HTTP2
 * - useFetchStreams: false para compatibilidad en redes/ISPs exigentes
 */
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentSingleTabManager() }),
  experimentalForceLongPolling: true,
  useFetchStreams: false,
});

// (Opcional) bajar verbosidad del SDK para no ensuciar la consola
setLogLevel("error");

// Analytics (opcional y seguro en SSR)
export let analytics;
if (typeof window !== "undefined") {
  analyticsIsSupported().then((ok) => {
    if (ok) analytics = getAnalytics(app);
  });
}
export const auth = getAuth(app);
