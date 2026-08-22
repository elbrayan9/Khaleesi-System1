// frontend/src/utils/sonido.js
//
// Avisos sonoros generados con Web Audio API: no hace falta ningún archivo de
// sonido. Ojo: el navegador exige una interacción previa en la pestaña para
// permitir audio; si nadie tocó nada desde que se abrió, el primer aviso puede
// salir mudo (el aviso visual igual aparece).

const tocar = (notas) => {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    notas.forEach(([inicio, frecuencia, tipo = 'square']) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = tipo;
      osc.frequency.value = frecuencia;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + inicio);
      gain.gain.exponentialRampToValueAtTime(
        0.25,
        ctx.currentTime + inicio + 0.02,
      );
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        ctx.currentTime + inicio + 0.28,
      );
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + inicio);
      osc.stop(ctx.currentTime + inicio + 0.3);
    });
    setTimeout(() => ctx.close?.(), 1600);
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
