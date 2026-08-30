// src/screens/TiendaPublica.jsx
//
// Vitrina pública del comercio: catálogo con fotos y armado de pedido que se
// envía al negocio por WhatsApp. No requiere login (es para sus clientes).

import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { formatCurrency } from '../utils/helpers';
import { ShoppingCart, Search, Plus, Minus, Send } from 'lucide-react';
import TiendaCheckoutModal from '../components/TiendaCheckoutModal.jsx';
import SeguimientoPedido from '../components/SeguimientoPedido.jsx';

function TiendaPublica() {
  const { sucursalId } = useParams();
  const [tienda, setTienda] = useState(null);
  const [productos, setProductos] = useState([]);
  const [estado, setEstado] = useState('cargando'); // cargando | ok | cerrada
  const [motivo, setMotivo] = useState(''); // por qué no publica (para el dueño)
  const [busqueda, setBusqueda] = useState('');
  const [carrito, setCarrito] = useState({}); // { [id]: cantidad }
  const [nombreCliente, setNombreCliente] = useState('');
  const [showCheckout, setShowCheckout] = useState(false);
  // Pedido en curso: se guarda para poder volver al seguimiento.
  const [pedidoActivo, setPedidoActivo] = useState(() => {
    try {
      const g = localStorage.getItem(`pedido_${sucursalId}`);
      return g ? JSON.parse(g) : null;
    } catch (_) {
      return null;
    }
  });

  const onPedidoCreado = (data) => {
    const guardar = {
      pedidoId: data.pedidoId,
      trackingToken: data.trackingToken,
    };
    try {
      localStorage.setItem(`pedido_${sucursalId}`, JSON.stringify(guardar));
    } catch (_) {
      /* modo privado: seguimos igual */
    }
    setPedidoActivo(guardar);
    setShowCheckout(false);
    setCarrito({});
  };

  const nuevoPedido = () => {
    try {
      localStorage.removeItem(`pedido_${sucursalId}`);
    } catch (_) {
      /* ignore */
    }
    setPedidoActivo(null);
  };

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const { getFunctions, httpsCallable } =
          await import('firebase/functions');
        const fn = httpsCallable(getFunctions(), 'getTiendaPublica');
        const res = await fn({ sucursalId });
        if (cancelado) return;
        if (!res.data?.activa) {
          setMotivo(res.data?.motivo || '');
          setEstado('cerrada');
          return;
        }
        setTienda(res.data);

        // El catálogo viene por función, no leyendo `productos` directo: así la
        // colección puede quedar cerrada y no se expone el costo de cada ítem.
        const fnProductos = httpsCallable(getFunctions(), 'getProductosTienda');
        const resProd = await fnProductos({ sucursalId });
        if (cancelado) return;
        setProductos(resProd.data?.productos || []);
        setEstado('ok');
      } catch (_) {
        if (!cancelado) setEstado('cerrada');
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [sucursalId]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return productos;
    return productos.filter((p) => p.nombre?.toLowerCase().includes(q));
  }, [productos, busqueda]);

  const cambiar = (id, delta) =>
    setCarrito((prev) => {
      const n = (prev[id] || 0) + delta;
      const copia = { ...prev };
      if (n <= 0) delete copia[id];
      else copia[id] = n;
      return copia;
    });

  const items = Object.entries(carrito)
    .map(([id, cant]) => {
      const p = productos.find((x) => x.id === id);
      return p ? { ...p, cantidad: cant } : null;
    })
    .filter(Boolean);
  const total = items.reduce((s, it) => s + it.precio * it.cantidad, 0);

  const enviarPedido = () => {
    let tel = String(tienda?.whatsapp || '').replace(/\D/g, '');
    if (tel && !tel.startsWith('54')) tel = `549${tel}`;
    const detalle = items
      .map(
        (it) =>
          `• ${it.cantidad}x ${it.nombre} — $${formatCurrency(it.precio * it.cantidad)}`,
      )
      .join('\n');
    const texto =
      `¡Hola! Quiero hacer un pedido${nombreCliente ? ` (soy ${nombreCliente})` : ''}:\n\n` +
      `${detalle}\n\nTotal: $${formatCurrency(total)}`;
    window.open(
      `https://wa.me/${tel}?text=${encodeURIComponent(texto)}`,
      '_blank',
      'noopener,noreferrer',
    );
  };

  if (estado === 'cargando') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-900 text-zinc-300">
        Cargando tienda…
      </div>
    );
  }

  if (estado === 'cerrada') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-900 px-6 text-center text-zinc-300">
        <div>
          <p className="text-lg font-semibold text-white">
            Esta tienda no está disponible.
          </p>
          <p className="mt-1 text-sm text-zinc-400">
            {{
              sucursal_inexistente:
                'El enlace apunta a un local que ya no existe. Pedile al comercio el link actualizado.',
              tienda_desactivada: 'El comercio todavía no publicó su tienda.',
              suscripcion_vencida: 'La tienda está pausada por el comercio.',
              plan_basico: 'La tienda está pausada por el comercio.',
              sucursal_sin_duenio:
                'El enlace no es correcto. Pedile al comercio el link actualizado.',
            }[motivo] || 'Puede estar desactivada o el enlace no es correcto.'}
          </p>
          {motivo === 'sucursal_inexistente' && (
            <p className="mx-auto mt-4 max-w-sm rounded-md bg-zinc-800 px-3 py-2 text-xs text-zinc-500">
              ¿Sos el dueño? Entrá a Configuración y volvé a copiar el link de
              tu tienda: el que estás usando quedó viejo.
            </p>
          )}
        </div>
      </div>
    );
  }

  if (pedidoActivo) {
    return (
      <div className="min-h-screen bg-zinc-900 text-zinc-200">
        <header className="border-b border-zinc-800 px-4 py-5 text-center">
          {tienda?.logoUrl && (
            <img
              src={tienda.logoUrl}
              alt={tienda.nombre}
              className="mx-auto mb-2 h-14 w-14 rounded-lg bg-white object-contain p-1"
            />
          )}
          <h1 className="text-xl font-bold text-white">{tienda?.nombre}</h1>
        </header>
        <SeguimientoPedido
          pedidoId={pedidoActivo.pedidoId}
          trackingToken={pedidoActivo.trackingToken}
          onNuevoPedido={nuevoPedido}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-900 pb-40 text-zinc-200">
      {/* Encabezado */}
      <header className="border-b border-zinc-800 bg-zinc-900/95 px-4 py-5 text-center backdrop-blur">
        {tienda.logoUrl && (
          <img
            src={tienda.logoUrl}
            alt={tienda.nombre}
            className="mx-auto mb-2 h-16 w-16 rounded-lg bg-white object-contain p-1"
          />
        )}
        <h1 className="text-2xl font-bold text-white">{tienda.nombre}</h1>
        {tienda.direccion && (
          <p className="text-sm text-zinc-400">{tienda.direccion}</p>
        )}
      </header>

      <div className="mx-auto max-w-3xl px-4 py-4">
        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-zinc-500" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar producto…"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2.5 pl-9 pr-3 text-white placeholder-zinc-500"
          />
        </div>

        {filtrados.length === 0 ? (
          <p className="py-16 text-center text-sm text-zinc-500">
            No hay productos disponibles.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {filtrados.map((p) => (
              <div
                key={p.id}
                className="flex flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-800/50"
              >
                {p.imagenUrl ? (
                  <img
                    src={p.imagenUrl}
                    alt={p.nombre}
                    className="h-32 w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-32 w-full items-center justify-center bg-zinc-700 text-3xl font-bold text-zinc-500">
                    {(p.nombre || '?').substring(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="flex flex-1 flex-col p-3">
                  <p className="line-clamp-2 text-sm font-medium text-white">
                    {p.nombre}
                  </p>
                  <p className="mt-1 text-base font-bold text-emerald-400">
                    ${formatCurrency(p.precio)}
                  </p>
                  <div className="mt-auto pt-2">
                    {carrito[p.id] ? (
                      <div className="flex items-center justify-between rounded-lg bg-zinc-700">
                        <button
                          onClick={() => cambiar(p.id, -1)}
                          className="p-2 text-white"
                          aria-label="Quitar uno"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="text-sm font-bold text-white">
                          {carrito[p.id]}
                        </span>
                        <button
                          onClick={() => cambiar(p.id, 1)}
                          className="p-2 text-white"
                          aria-label="Agregar uno"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => cambiar(p.id, 1)}
                        className="w-full rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-500"
                      >
                        Agregar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Barra del pedido */}
      {items.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 border-t border-zinc-700 bg-zinc-900/95 p-4 backdrop-blur">
          <div className="mx-auto max-w-3xl">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-zinc-300">
                <ShoppingCart className="h-4 w-4" />
                {items.reduce((s, i) => s + i.cantidad, 0)} producto(s)
              </span>
              <span className="text-lg font-bold text-white">
                ${formatCurrency(total)}
              </span>
            </div>
            <button
              onClick={() => setShowCheckout(true)}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 py-3 text-sm font-bold text-white hover:bg-green-700"
            >
              <ShoppingCart className="h-4 w-4" /> Confirmar pedido
            </button>
            <button
              onClick={enviarPedido}
              className="mt-2 flex w-full items-center justify-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200"
            >
              <Send className="h-3.5 w-3.5" /> o enviarlo por WhatsApp
            </button>
          </div>
        </div>
      )}
      {showCheckout && (
        <TiendaCheckoutModal
          sucursalId={sucursalId}
          items={items}
          total={total}
          localGeo={tienda?.geo || null}
          onCreado={onPedidoCreado}
          onClose={() => setShowCheckout(false)}
        />
      )}
    </div>
  );
}

export default TiendaPublica;
