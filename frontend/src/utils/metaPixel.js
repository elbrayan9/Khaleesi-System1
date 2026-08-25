// Píxel de Meta.
//
// El fragmento que da Meta para copiar y pegar es un <script> inline en el
// index.html. Acá no sirve: la CSP de firebase.json usa script-src 'self' sin
// 'unsafe-inline', así que el navegador lo bloquearía en silencio. Cargarlo como
// módulo del bundle evita tener que abrir la CSP a scripts inline.
//
// El ID no es un secreto: viaja en cada pedido del navegador y cualquiera que
// abra las herramientas de desarrollo lo ve. Por eso va acá y no en una variable
// de entorno.
const PIXEL_ID = '1665564851206471';

const FBEVENTS = 'https://connect.facebook.net/en_US/fbevents.js';

// En desarrollo no medimos: si no, las pruebas locales ensucian los públicos de
// retargeting y los informes de campaña.
function esEntornoReal() {
  const host = window.location.hostname;
  return host !== 'localhost' && host !== '127.0.0.1' && !host.endsWith('.local');
}

// Cola que acepta llamadas a fbq() antes de que termine de bajar fbevents.js.
// Es la misma mecánica del fragmento oficial, escrita para poder leerse.
function prepararCola() {
  if (window.fbq) return;

  const fbq = function () {
    if (fbq.callMethod) {
      fbq.callMethod.apply(fbq, arguments);
    } else {
      fbq.queue.push(arguments);
    }
  };

  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = '2.0';
  fbq.queue = [];

  window.fbq = fbq;
  if (!window._fbq) window._fbq = fbq;
}

/**
 * Deja el píxel listo. Se llama una sola vez, al arrancar la app.
 * No dispara PageView: de eso se encarga registrarVista() en medicion.js, que
 * corre en cada cambio de ruta y ya cubre la primera pantalla. Dispararlo acá
 * también contaría la visita inicial dos veces.
 */
export function iniciarPixel() {
  if (!esEntornoReal()) return;

  try {
    prepararCola();

    if (!document.querySelector(`script[src="${FBEVENTS}"]`)) {
      const script = document.createElement('script');
      script.async = true;
      script.src = FBEVENTS;
      document.head.appendChild(script);
    }

    window.fbq('init', PIXEL_ID);
  } catch (e) {
    // La medición nunca puede tumbar la app.
    console.debug('[pixel] no se pudo iniciar:', e?.message);
  }
}
