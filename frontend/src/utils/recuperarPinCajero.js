// Salir del modo cajero cuando nadie se acuerda del PIN.
//
// El PIN vivía solo en el localStorage de esa computadora. Si se olvidaba, o si
// el dueño abría el sistema en otra máquina, no había salida: la única forma era
// entrar a la consola del navegador, que no es algo que se le pueda pedir a
// alguien atendiendo un kiosco.
//
// La llave de recuperación es la contraseña de la cuenta. No hace falta inventar
// nada mejor: el dueño ya la tiene, es lo que protege TODO lo demás del sistema,
// y no se guarda en ningún lado nuestro. Firebase la verifica contra sus
// servidores, así que ni siquiera pasa por acá.
//
// El PIN además se guarda en la configuración del negocio, para que sea el mismo
// en todas las computadoras del local y el dueño pueda verlo desde
// Configuración, que ya está detrás de su propio PIN.

import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth } from '../firebaseConfig';

/**
 * Comprueba que quien está pidiendo salir sea el dueño de la cuenta.
 *
 * @param {string} password
 * @returns {Promise<{ok: boolean, motivo?: string}>}
 */
export async function verificarDueno(password) {
  const user = auth.currentUser;
  if (!user?.email) {
    return { ok: false, motivo: 'No hay una sesión abierta.' };
  }
  if (!password) {
    return { ok: false, motivo: 'Escribí la contraseña.' };
  }
  try {
    const credencial = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, credencial);
    return { ok: true };
  } catch (e) {
    // Los códigos de Firebase no le dicen nada a nadie; se traducen a lo único
    // que la persona puede hacer al respecto.
    const codigo = e?.code || '';
    if (codigo === 'auth/too-many-requests') {
      return {
        ok: false,
        motivo: 'Demasiados intentos. Esperá unos minutos y probá de nuevo.',
      };
    }
    if (codigo === 'auth/network-request-failed') {
      return {
        ok: false,
        motivo:
          'Sin internet no se puede verificar la contraseña. Conectate y probá de nuevo.',
      };
    }
    return { ok: false, motivo: 'La contraseña no es correcta.' };
  }
}

/** El email de la cuenta, para mostrar de quién es la contraseña que se pide. */
export function emailDeLaCuenta() {
  return auth.currentUser?.email || '';
}

export default verificarDueno;
