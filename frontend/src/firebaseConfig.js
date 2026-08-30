// src/firebaseConfig.js
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentSingleTabManager,
  setLogLevel,
} from 'firebase/firestore';
import {
  getAnalytics,
  isSupported as analyticsIsSupported,
} from 'firebase/analytics';
import { getStorage } from 'firebase/storage';

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
 * 🛡️ Firebase App Check:
 * Verifica que las solicitudes a Firebase vengan de tu app real,
 * no de scripts o bots externos. Usa reCAPTCHA v3 (invisible, sin captcha visible).
 *
 * En modo desarrollo (localhost), se activa el debug token para que
 * puedas seguir probando sin problemas.
 */
//
// Arrancarlo cuesta 345 KB: reCAPTCHA es el segundo archivo más pesado que
// bajaba la landing, y ahí no hace falta. Quien llega de un anuncio está
// leyendo precios, no llamando a Firebase.
//
// Pero no se puede posponer sin más: Auth y Storage tienen enforcement, o sea
// que sin token de App Check el login falla. Así que la landing lo arranca
// cuando el navegador queda libre, y cualquier otra pantalla lo arranca ya.
let promesaAppCheck = null;

// La marca que dice que en este navegador ya se inició sesión alguna vez.
export const MARCA_SESION = 'khaleesi:tuvo-sesion';

/** Arranca App Check una sola vez. Devuelve la misma promesa siempre. */
export function asegurarAppCheck() {
  if (promesaAppCheck) return promesaAppCheck;
  if (typeof window === 'undefined') return Promise.resolve(null);

  const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
  if (!recaptchaSiteKey) return Promise.resolve(null);

  promesaAppCheck = import('firebase/app-check').then(
    ({ initializeAppCheck, ReCaptchaV3Provider }) =>
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(recaptchaSiteKey),
        isTokenAutoRefreshEnabled: true,
      }),
  );
  return promesaAppCheck;
}

if (typeof window !== 'undefined') {
  // En desarrollo: habilitar debug token (aparecerá en la consola del navegador)
  if (import.meta.env.DEV) {
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }

  // La landing y las páginas legales son las únicas que pueden esperar: no
  // hacen ninguna llamada que el enforcement rechace. En todo lo demás
  // —incluido el login— se arranca de entrada.
  const RUTAS_QUE_PUEDEN_ESPERAR = ['/', '/legal', '/terminos', '/privacidad'];
  const puedeEsperar = RUTAS_QUE_PUEDEN_ESPERAR.includes(
    window.location.pathname,
  );

  // Salvo que este navegador ya haya tenido sesión.
  //
  // Un dueño con la sesión abierta que entra por la landing es el caso
  // peligroso: al restaurar la sesión, Firebase renueva su token contra Auth,
  // y Auth tiene enforcement. Si App Check todavía no arrancó, esa renovación
  // se rechaza y la persona aparece deslogueada. Por eso, si hay rastro de una
  // sesión anterior, se arranca de entrada aunque sea la landing.
  //
  // La marca la deja el propio sistema al iniciar sesión: no se consulta el
  // almacenamiento interno de Firebase, que no es contrato público.
  const tuvoSesion = (() => {
    try {
      return localStorage.getItem(MARCA_SESION) === '1';
    } catch (e) {
      return true; // sin acceso al almacenamiento, se asume lo más seguro
    }
  })();

  if (puedeEsperar && !tuvoSesion) {
    // Espera a que la persona haga algo. Quien entra desde un anuncio, lee y
    // se va, no llega a bajar los 345 KB de reCAPTCHA nunca; quien va a entrar
    // al sistema toca algo mucho antes de llegar al login, y para entonces ya
    // está en marcha. El plazo de gracia es el piso, por si alguien deja la
    // pestaña abierta y vuelve mucho después.
    const señales = ['pointerdown', 'keydown', 'scroll', 'touchstart'];
    let arrancado = false;
    const arrancar = () => {
      if (arrancado) return;
      arrancado = true;
      señales.forEach((s) => window.removeEventListener(s, arrancar));
      asegurarAppCheck();
    };
    señales.forEach((s) =>
      window.addEventListener(s, arrancar, { once: true, passive: true }),
    );
    setTimeout(arrancar, 8000);
  } else {
    asegurarAppCheck();
  }
}

/**
 * 🔧 Resiliencia de transporte y caché:
 * - persistentLocalCache + persistentSingleTabManager: IndexedDB bien administrado (1 sola pestaña “líder”)
 * - experimentalAutoDetectLongPolling: cae a long-polling si la red rompe WebChannel/HTTP2
 * - useFetchStreams: false para compatibilidad en redes/ISPs exigentes
 */
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentSingleTabManager(),
  }),
  experimentalForceLongPolling: true,
  useFetchStreams: false,
});

// (Opcional) bajar verbosidad del SDK para no ensuciar la consola
setLogLevel('error');

// Analytics (opcional y seguro en SSR)
export let analytics;
if (typeof window !== 'undefined') {
  analyticsIsSupported().then((ok) => {
    if (ok) analytics = getAnalytics(app);
  });
}
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const storage = getStorage(app);
