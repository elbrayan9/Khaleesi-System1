// Medición de navegación.
//
// El sistema es una SPA: el navegador carga el index.html una sola vez y después
// React cambia el contenido sin recargar. Google Analytics (que ya está activo
// vía Firebase) registra la vista de la PRIMERA pantalla y nada más, así que sin
// esto una visita de diez pantallas cuenta como una sola.
//
// El píxel de Meta, cuando esté configurado, tiene exactamente el mismo problema
// y se resuelve en el mismo lugar.

import { logEvent } from 'firebase/analytics';

// Nombres legibles para las pantallas públicas, que son las que interesan para
// medir campañas. El resto se informa con su ruta.
const NOMBRES = {
  '/': 'Landing',
  '/login': 'Iniciar sesión',
  '/signup': 'Registro',
  '/forgot-password': 'Recuperar contraseña',
  '/verificador': 'Verificador de precios',
  '/terminos': 'Términos y condiciones',
  '/privacidad': 'Privacidad',
};

// Las rutas con identificadores adentro se agrupan: si no, cada tienda y cada
// producto serían una pantalla distinta y el informe queda inservible.
function nombreDePantalla(ruta) {
  if (NOMBRES[ruta]) return NOMBRES[ruta];
  if (ruta.startsWith('/tienda/')) return 'Tienda online';
  if (ruta.startsWith('/product/')) return 'Producto (QR)';
  if (ruta.startsWith('/repartidor/')) return 'App del repartidor';
  if (ruta.startsWith('/admin')) return 'Panel de administrador';
  if (ruta.startsWith('/dashboard')) return 'Sistema' + ruta.replace('/dashboard', '');
  return ruta;
}

/**
 * Informa una vista de pantalla a las herramientas de medición disponibles.
 * Nunca lanza: si la medición falla, la app tiene que seguir andando igual.
 * @param {string} ruta - el pathname actual
 * @param {object} analytics - instancia de Firebase Analytics (puede no estar lista)
 */
export function registrarVista(ruta, analytics) {
  const titulo = nombreDePantalla(ruta);

  try {
    if (analytics) {
      logEvent(analytics, 'page_view', {
        page_path: ruta,
        page_title: titulo,
        page_location: window.location.href,
      });
    }
  } catch (e) {
    console.debug('[medicion] analytics:', e?.message);
  }

  // Píxel de Meta: solo dispara si está instalado (ver index.html).
  try {
    if (typeof window.fbq === 'function') {
      window.fbq('track', 'PageView');
    }
  } catch (e) {
    console.debug('[medicion] pixel:', e?.message);
  }
}
