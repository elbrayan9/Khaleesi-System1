// src/components/AvisoPedidoOnline.jsx
//
// Avisa en el POS cuando entra un pedido de la tienda online: alarma sonora +
// pop-up. El listener vive en AppContext (colección pedidos_online); acá solo
// detectamos los que llegan DESPUÉS de abrir la pantalla.

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from '../utils/swalTheme.js'; // Swal con el tema del sistema
import { useAppContext } from '../context/AppContext.jsx';
import { formatCurrency } from '../utils/helpers.js';
import { sonarAlarma } from '../utils/sonido.js';

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
    // El nombre del cliente y el detalle vienen de la tienda pública: los
    // escribe cualquiera, sin cuenta. Como esto se inserta como HTML en la
    // pantalla del comercio (que está con la sesión abierta), hay que escaparlo
    // o un "cliente" podría ejecutar código acá poniéndolo como su nombre.
    const esc = (v) =>
      String(v ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const detalle = (p.items || [])
      .map((it) => `${esc(it.cantidad)}x ${esc(it.nombre)}`)
      .join('<br>');
    Swal.fire({
      icon: 'info',
      title: `¡Nuevo pedido #${esc(p.codigo)}!`,
      html:
        `<p style="margin:0 0 6px"><strong>${esc(p.cliente?.nombre)}</strong> · ` +
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
