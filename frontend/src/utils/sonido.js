// frontend/src/utils/sonido.js
//
// Avisos sonoros generados con Web Audio API: no hace falta ningún archivo de
// sonido. Ojo: el navegador exige una interacción previa en la pestaña para
// permitir audio; si nadie tocó nada desde que se abrió, el primer aviso puede
// salir mudo (el aviso visual igual aparece).

// Un solo contexto para toda la sesión.
//
// Antes se creaba uno nuevo en cada aviso y se cerraba a los 1600 ms. Para una
// alarma ocasional daba igual, pero con el beep del escáner —donde alguien pasa
// diez productos en diez segundos— abrir y cerrar un contexto por cada lectura
// es caro y el sonido empieza a llegar tarde.
let ctxCompartido = null;

const obtenerContexto = () => {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!ctxCompartido || ctxCompartido.state === 'closed') {
    ctxCompartido = new Ctx();
  }
  // Si el contexto se creó antes de que el usuario tocara la pantalla, el
  // navegador lo deja suspendido: hay que despertarlo o no suena nada.
  if (ctxCompartido.state === 'suspended') ctxCompartido.resume?.();
  return ctxCompartido;
};

/**
 * @param {Array} notas  Cada nota: [inicio, frecuencia, tipo, duración, volumen]
 *   - inicio y duración en segundos
 *   - tipo: 'square' | 'triangle' | 'sine' | 'sawtooth'
 */
const tocar = (notas) => {
  try {
    const ctx = obtenerContexto();
    if (!ctx) return;
    notas.forEach(
      ([
        inicio,
        frecuencia,
        tipo = 'square',
        duracion = 0.28,
        volumen = 0.25,
      ]) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = tipo;
        osc.frequency.value = frecuencia;
        const t0 = ctx.currentTime + inicio;
        // Rampas exponenciales en vez de cortes secos: un corte abrupto suena
        // como un chasquido.
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(volumen, t0 + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duracion);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t0);
        osc.stop(t0 + duracion + 0.02);
      },
    );
  } catch (_) {
    /* sin audio disponible */
  }
};

/**
 * Despierta el audio aprovechando un gesto del usuario.
 *
 * Los navegadores bloquean el sonido hasta que alguien toca la pantalla. Sin
 * esto, el primer producto escaneado del día sale mudo justo cuando más se
 * necesita la confirmación.
 */
export const prepararSonido = () => {
  try {
    obtenerContexto();
  } catch (_) {
    /* sin audio disponible */
  }
};

// Pedido nuevo: alarma insistente.
export const sonarAlarma = () =>
  tocar([
    [0, 880],
    [0.35, 1170],
    [0.7, 880],
  ]);

// Pago recibido: dos notas ascendentes, tipo "caja registradora".
export const sonarPago = () =>
  tocar([
    [0, 987, 'triangle'],
    [0.16, 1318, 'triangle'],
  ]);

// Producto escaneado: el beep corto y agudo del supermercado.
//
// Dura 90 ms a propósito. Es la señal que deja al cajero sacar la vista de la
// pantalla: escucha el beep y ya sabe que entró, sin mirar. Uno largo se
// pisaría con el siguiente cuando se pasan productos en serie.
export const sonarEscaneo = () => tocar([[0, 2100, 'square', 0.09, 0.2]]);

// No se pudo leer o el producto no existe: dos notas graves y cortas, que se
// distinguen del beep bueno sin necesidad de mirar.
export const sonarErrorEscaneo = () =>
  tocar([
    [0, 320, 'square', 0.12, 0.22],
    [0.14, 240, 'square', 0.16, 0.22],
  ]);
