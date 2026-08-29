// El aspecto de todas las alertas del sistema, en un solo lugar.
//
// Antes cada llamada repetía sus colores a mano: `background: '#27272a'` aparecía
// en diez archivos distintos, y las que usaban la forma corta
// `Swal.fire('Error', msg, 'error')` —que no acepta opciones de estilo— salían
// con el tema blanco de fábrica, en un sistema que es oscuro.
//
// Acá se exporta un Swal ya vestido. Importar `swal` de este módulo en vez de
// 'sweetalert2' alcanza: las llamadas no cambian y heredan el tema.

import Swal from 'sweetalert2';

// Los colores salen de la misma paleta de Tailwind que usa el resto del sistema,
// escritos en hexadecimal porque SweetAlert no ve las clases de Tailwind.
const COLORES = {
  fondo: '#18181b', // zinc-900, igual que el fondo de la app
  texto: '#e4e4e7', // zinc-200
  azul: '#2563eb', // blue-600
  rojo: '#dc2626', // red-600
  gris: '#3f3f46', // zinc-700
};

// Un ícono por tipo. SweetAlert los dibuja con su propio color por defecto, que
// desentona con la app; se pisan con los tonos claros que se leen sobre oscuro.
const ICONO = {
  error: '!text-red-400 !border-red-400',
  success: '!text-green-400 !border-green-400',
  warning: '!text-amber-400 !border-amber-400',
  info: '!text-blue-400 !border-blue-400',
  question: '!text-blue-400 !border-blue-400',
};

const claseDeIcono = (icono) => ICONO[icono] || ICONO.info;

const BASE = {
  background: COLORES.fondo,
  color: COLORES.texto,
  confirmButtonColor: COLORES.azul,
  cancelButtonColor: COLORES.gris,
  // Sin esto SweetAlert le toca el alto al body y la página salta al abrir y
  // cerrar cada alerta.
  heightAuto: false,
  buttonsStyling: false, // los botones se visten con Tailwind, más abajo
  customClass: {
    popup:
      'rounded-2xl border border-white/10 shadow-2xl shadow-black/60 text-sm',
    title: '!text-zinc-100 !text-xl !font-semibold',
    htmlContainer: '!text-zinc-400 !text-[15px]',
    actions: 'gap-2',
    confirmButton:
      'px-5 py-2.5 rounded-lg bg-blue-600 text-white font-semibold ' +
      'hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/60 transition-colors',
    denyButton:
      'px-5 py-2.5 rounded-lg bg-red-600 text-white font-semibold ' +
      'hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/60 transition-colors',
    cancelButton:
      'px-5 py-2.5 rounded-lg bg-zinc-700 text-zinc-200 font-semibold ' +
      'hover:bg-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-500/60 transition-colors',
    input:
      '!bg-zinc-800 !text-zinc-100 !border !border-zinc-700 !rounded-lg ' +
      '!shadow-none focus:!border-blue-500',
    validationMessage: '!bg-red-950/60 !text-red-300 !rounded-lg',
  },
};

/** Swal con el tema del sistema puesto. Se usa igual que el original. */
export const swal = Swal.mixin(BASE);

/**
 * Aviso breve en una esquina, sin tapar la pantalla ni pedir un clic.
 * Para lo que no exige decisión: "Guardado", "Copiado", "Stock actualizado".
 * En una caja con gente esperando, un modal por cada confirmación es un estorbo.
 */
export const toast = Swal.mixin({
  ...BASE,
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 2600,
  timerProgressBar: true,
  customClass: {
    ...BASE.customClass,
    popup:
      'rounded-xl border border-white/10 shadow-lg shadow-black/50 text-sm !p-3',
    title: '!text-zinc-100 !text-sm !font-medium',
    timerProgressBar: '!bg-blue-500/60',
  },
  didOpen: (el) => {
    el.addEventListener('mouseenter', Swal.stopTimer);
    el.addEventListener('mouseleave', Swal.resumeTimer);
  },
});

const TITULO = {
  error: 'Error',
  success: 'Listo',
  warning: 'Atención',
  info: 'Información',
};

/**
 * El aviso estándar del sistema. Lo que salió bien va como toast en la esquina;
 * lo que falló o requiere atención va como modal, porque conviene que frene al
 * usuario.
 */
export const mostrarMensaje = (texto, tipo = 'info') => {
  if (tipo === 'success') {
    return toast.fire({ icon: 'success', title: texto });
  }
  return swal.fire({
    title: TITULO[tipo] || TITULO.info,
    text: texto,
    icon: tipo,
    confirmButtonText: 'Aceptar',
    customClass: { ...BASE.customClass, icon: claseDeIcono(tipo) },
  });
};

/** Pregunta de sí o no. Devuelve true solo si se confirmó. */
export const confirmarAccion = async (
  titulo,
  texto,
  icono = 'warning',
  confirmButtonText = 'Sí, continuar',
) => {
  // Cuando la acción borra algo, el botón va en rojo: el color es la última
  // advertencia antes de un clic que no se puede deshacer.
  const esDestructiva = /elimin|borr|vaciar|quitar/i.test(confirmButtonText);
  const { isConfirmed } = await swal.fire({
    title: titulo,
    text: texto,
    icon: icono,
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText: 'Cancelar',
    reverseButtons: true, // Cancelar a la izquierda: se confirma con el pulgar
    focusCancel: esDestructiva, // el foco arranca en Cancelar si se va a borrar
    customClass: {
      ...BASE.customClass,
      icon: claseDeIcono(icono),
      confirmButton: esDestructiva
        ? BASE.customClass.denyButton
        : BASE.customClass.confirmButton,
    },
  });
  return isConfirmed;
};

export default swal;
