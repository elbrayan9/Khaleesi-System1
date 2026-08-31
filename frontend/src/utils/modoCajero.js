// El modo cajero, en un solo lugar.
//
// Vivía como estado local de Layout más un dato en localStorage, y eso alcanza
// mientras el único que lo mira sea el menú. Deja de alcanzar en cuanto una
// pantalla necesita saberlo para esconder los importes: si Reportes lo lee por
// su cuenta, se entera al montarse y no cuando el modo cambia, y queda
// mostrando plata en una pantalla que debería estar tapada.
//
// Se guarda en localStorage a propósito: sobrevive a recargar la página, que es
// lo que hace falta si alguien intenta salirse del modo apretando F5.
//
// Esto NO es una medida de seguridad y no pretende serlo: cualquiera con la
// consola del navegador lo apaga. Es para que el que atiende no tenga a la vista
// los números del negocio ni botones que borran cosas. Lo que de verdad no puede
// pasar está cerrado en las reglas de Firestore y en las Cloud Functions, que no
// dependen de nada de esto.

const CLAVE = 'modoCajero';
const CLAVE_PIN = 'cajeroPin';
const EVENTO = 'khaleesi:modo-cajero';

/** ¿Está activo? */
export function estaEnModoCajero() {
  try {
    return localStorage.getItem(CLAVE) === '1';
  } catch {
    // Navegador con el almacenamiento bloqueado: se asume que no.
    return false;
  }
}

/** Prende o apaga el modo y avisa a quien esté escuchando. */
export function setModoCajero(activo) {
  try {
    localStorage.setItem(CLAVE, activo ? '1' : '0');
  } catch {
    /* sin almacenamiento, el modo dura lo que la pantalla */
  }
  // `storage` solo se dispara en OTRAS pestañas, así que hace falta un evento
  // propio para que las pantallas de ESTA se enteren.
  window.dispatchEvent(new CustomEvent(EVENTO, { detail: activo }));
}

export function getPinCajero() {
  try {
    return localStorage.getItem(CLAVE_PIN) || '';
  } catch {
    return '';
  }
}

export function setPinCajero(pin) {
  try {
    localStorage.setItem(CLAVE_PIN, pin);
  } catch {
    /* ignore */
  }
}

/** Suscribe a los cambios. Devuelve la función para desuscribirse. */
export function alCambiarModoCajero(fn) {
  const propio = () => fn(estaEnModoCajero());
  window.addEventListener(EVENTO, propio);
  // `storage` cubre el caso de dos pestañas abiertas del sistema.
  window.addEventListener('storage', propio);
  return () => {
    window.removeEventListener(EVENTO, propio);
    window.removeEventListener('storage', propio);
  };
}

export default estaEnModoCajero;
