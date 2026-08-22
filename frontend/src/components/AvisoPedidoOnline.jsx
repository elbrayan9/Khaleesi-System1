// src/components/AvisoPedidoOnline.jsx
//
// Avisa en el POS cuando entra un pedido de la tienda online: alarma sonora +
// pop-up. El listener vive en AppContext (colección pedidos_online); acá solo
// detectamos los que llegan DESPUÉS de abrir la pantalla.

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { useAppContext } from '../context/AppContext.jsx';
import { formatCurrency } from '../utils/helpers.js';

// Pitidos generados con Web Audio API: no hace falta ningún archivo de sonido.
// Ojo: el navegador exige una interacción previa en la pestaña para permitir
// audio; si nadie tocó nada desde que se abrió, el primer aviso puede ser mudo.
function sonarAlarma() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const pitido = (inicio, frecuencia) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = frecuencia;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + inicio);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + inicio + 0.02);
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        ctx.currentTime + inicio + 0.28,
      );
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + inicio);
      osc.stop(ctx.currentTime + inicio + 0.3);
    };
    pitido(0, 880);
    pitido(0.35, 1170);
    pitido(0.7, 880);
    setTimeout(() => ctx.close?.(), 1500);
  } catch (_) {
    /* sin audio disponible: el pop-up igual aparece */
  }
}

function AvisoPedidoOnline() {
  const { pedidosOnline = [] } = useAppContext();
  const navigate = useNavigate();
  // Los pedidos que ya estaban al montar no deben disparar la alarma.
  const vistos = useRef(null);

  useEffect(() => {
    const nuevos = pedidosOnline.filter((p) => p.estado === 'nuevo');

    if (vistos.current === null) {
      vistos.current = new Set(nuevos.map((p) => p.id));
      return;
    }

    const recien = nuevos.filter((p) => !vistos.current.has(p.id));
    if (recien.length === 0) {
      vistos.current = new Set(nuevos.map((p) => p.id));
      return;
    }
    vistos.current = new Set(nuevos.map((p) => p.id));

    sonarAlarma();
    const p = recien[0];
    const detalle = (p.items || [])
      .map((it) => `${it.cantidad}x ${it.nombre}`)
      .join('<br>');
    Swal.fire({
      icon: 'info',
      title: `¡Nuevo pedido #${p.codigo}!`,
      html:
        `<p style="margin:0 0 6px"><strong>${p.cliente?.nombre || ''}</strong> · ` +
        `${p.tipo === 'delivery' ? 'Envío' : 'Retiro'}</p>` +
        `<p style="margin:0 0 6px">${detalle}</p>` +
        `<p style="margin:0"><strong>Total $${formatCurrency(p.total)}</strong></p>` +
        (recien.length > 1
          ? `<p style="margin:8px 0 0;font-size:12px">y ${recien.length - 1} pedido(s) más</p>`
          : ''),
      confirmButtonText: 'Ver pedidos',
      showCancelButton: true,
      cancelButtonText: 'Después',
    }).then((r) => {
      if (r.isConfirmed) navigate('/dashboard/pedidos-online');
    });
  }, [pedidosOnline, navigate]);

  return null;
}

export default AvisoPedidoOnline;
