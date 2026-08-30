// src/components/SeguimientoPedido.jsx
//
// Seguimiento del pedido para el cliente de la tienda (sin login). Consulta el
// estado con getEstadoPedido cada 8s: el visitante no puede leer Firestore, así
// que no hay listener en vivo, es sondeo.

import React, { Suspense, lazy, useEffect, useState } from 'react';
import { Check, Clock, XCircle } from 'lucide-react';
import { formatCurrency } from '../utils/helpers';
// El mapa se carga aparte: no tiene sentido que pese en el arranque de la
// tienda si el pedido todavía no salió con un repartidor.
const MapaEnVivo = lazy(() => import('./MapaEnVivo.jsx'));

const PASOS = [
  { estado: 'nuevo', label: 'Pedido recibido' },
  { estado: 'confirmado', label: 'El local está preparando tu pedido' },
  { estado: 'listo', label: 'Listo' },
  { estado: 'en_camino', label: 'En camino' },
  { estado: 'entregado', label: 'Entregado' },
];

function SeguimientoPedido({ pedidoId, trackingToken, onNuevoPedido }) {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let vivo = true;
    let timer;

    const consultar = async () => {
      try {
        const { getFunctions, httpsCallable } =
          await import('firebase/functions');
        const fn = httpsCallable(getFunctions(), 'getEstadoPedido');
        const res = await fn({ pedidoId, trackingToken });
        if (!vivo) return;
        setDatos(res.data);
        setError('');
        // Al terminar el pedido dejamos de consultar.
        if (!['entregado', 'rechazado'].includes(res.data?.estado)) {
          timer = setTimeout(consultar, 8000);
        }
      } catch (e) {
        if (!vivo) return;
        setError('No pudimos consultar el pedido.');
        timer = setTimeout(consultar, 15000);
      }
    };
    consultar();

    return () => {
      vivo = false;
      if (timer) clearTimeout(timer);
    };
  }, [pedidoId, trackingToken]);

  if (!datos) {
    return (
      <div className="mx-auto max-w-md p-6 text-center text-sm text-zinc-400">
        {error || 'Cargando tu pedido…'}
      </div>
    );
  }

  const rechazado = datos.estado === 'rechazado';
  const indiceActual = PASOS.findIndex((p) => p.estado === datos.estado);
  // El contador de llegada corre contra el reloj y no contra lo que trae el
  // servidor. El servidor manda el MOMENTO de llegada, así que restando acá el
  // número baja solo, segundo a segundo, en vez de quedarse clavado hasta el
  // próximo cálculo y después pegar un salto.
  const [ahora, setAhora] = useState(Date.now());
  useEffect(() => {
    if (!datos?.llegadaTs) return undefined;
    const t = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(t);
  }, [datos?.llegadaTs]);

  const faltanMin = datos?.llegadaTs
    ? Math.ceil((datos.llegadaTs - ahora) / 60000)
    : null;

  const hayRepartidor =
    Number.isFinite(datos?.repartidor?.lat) &&
    Number.isFinite(datos?.repartidor?.lng);

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-800/50 p-5">
        <p className="text-xs uppercase tracking-wider text-zinc-500">
          Tu pedido
        </p>
        <p className="text-2xl font-bold text-white">#{datos.codigo}</p>
        <p className="mt-1 text-sm text-zinc-400">
          {datos.tipo === 'delivery'
            ? 'Envío a domicilio'
            : 'Retiro en el local'}
          {' · '}Total ${formatCurrency(datos.total)}
        </p>

        {rechazado ? (
          <div className="mt-5 flex items-center gap-2 rounded-lg bg-red-900/30 p-3 text-sm text-red-300">
            <XCircle className="h-5 w-5 flex-none" />
            El local no pudo tomar este pedido. Escribiles para más información.
          </div>
        ) : (
          <>
            {datos.tiempoEstimado > 0 && datos.estado === 'confirmado' && (
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-blue-500/10 p-3 text-sm text-blue-300">
                <Clock className="h-4 w-4 flex-none" />
                Estará listo en aproximadamente {datos.tiempoEstimado} minutos.
              </div>
            )}

            {datos.repartidor?.nombre && (
              <div className="mt-4 rounded-lg bg-zinc-900/60 p-3">
                <p className="text-sm text-white">
                  🛵 <strong>{datos.repartidor.nombre}</strong> lleva tu pedido
                </p>
                {/* El mapa aparece con el repartidor, y también sin él si se
                    sabe de dónde sale y a dónde va: que tenga el GPS apagado no
                    es motivo para dejar la pantalla vacía. */}
                {faltanMin !== null && (
                  <p className="mt-1 text-lg font-semibold text-emerald-400">
                    {faltanMin > 3
                      ? `Llega en ~${faltanMin} min`
                      : faltanMin > 0
                        ? 'Está llegando'
                        : 'Ya debería estar ahí'}
                  </p>
                )}
                {(hayRepartidor || (datos.local && datos.destino)) && (
                  <div className="mt-2">
                    <Suspense
                      fallback={
                        <div className="h-[220px] w-full animate-pulse rounded-xl bg-zinc-800" />
                      }
                    >
                      <MapaEnVivo
                        repartidor={
                          hayRepartidor
                            ? {
                                lat: datos.repartidor.lat,
                                lng: datos.repartidor.lng,
                              }
                            : null
                        }
                        local={datos.local}
                        destino={datos.destino}
                        ruta={datos.ruta?.polilinea || null}
                        etiqueta={datos.repartidor.nombre}
                      />
                    </Suspense>
                    {!hayRepartidor && (
                      <p className="mt-1 text-xs text-zinc-500">
                        Todavía no llega su ubicación. Mientras tanto, este es
                        el camino que tiene que hacer.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            <ol className="mt-5 space-y-4">
              {PASOS.map((paso, i) => {
                const hecho = i <= indiceActual;
                return (
                  <li key={paso.estado} className="flex items-center gap-3">
                    <span
                      className={`flex h-7 w-7 flex-none items-center justify-center rounded-full ${
                        hecho
                          ? 'bg-green-600 text-white'
                          : 'bg-zinc-700 text-zinc-500'
                      }`}
                    >
                      {hecho ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <span className="text-xs">{i + 1}</span>
                      )}
                    </span>
                    <span
                      className={
                        hecho ? 'text-sm text-white' : 'text-sm text-zinc-500'
                      }
                    >
                      {paso.label}
                    </span>
                  </li>
                );
              })}
            </ol>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={onNuevoPedido}
        className="mt-4 w-full rounded-lg bg-zinc-700 py-2.5 text-sm font-semibold text-white hover:bg-zinc-600"
      >
        Hacer otro pedido
      </button>
    </div>
  );
}

export default SeguimientoPedido;
