// src/screens/AppRepartidor.jsx
//
// App del repartidor. Entra por un link con token (sin usuario ni contraseña) y
// todo pasa por Cloud Functions que validan ese token. Se instala como app
// porque el sitio ya es PWA.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Bike,
  Car,
  MapPin,
  Phone,
  Power,
  Package,
  Navigation,
  Check,
} from 'lucide-react';
import { formatCurrency } from '../utils/helpers';

const llamar = async (nombre, datos) => {
  const { getFunctions, httpsCallable } = await import('firebase/functions');
  const fn = httpsCallable(getFunctions(), nombre);
  const res = await fn(datos);
  return res.data;
};

function AppRepartidor() {
  const { token } = useParams();
  const [sesion, setSesion] = useState(null);
  const [estado, setEstado] = useState('cargando'); // cargando | ok | invalido
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const watchId = useRef(null);

  const cargar = useCallback(
    async (silencioso = false) => {
      try {
        const data = await llamar('sesionRepartidor', { token });
        setSesion(data);
        setEstado('ok');
        setError('');
      } catch (e) {
        if (!silencioso) setEstado('invalido');
      }
    },
    [token],
  );

  useEffect(() => {
    cargar();
    const t = setInterval(() => cargar(true), 10000);
    return () => clearInterval(t);
  }, [cargar]);

  const enViaje = (sesion?.enCurso || []).length > 0;

  // Mientras está online mandamos la posición; al salir, se corta.
  useEffect(() => {
    const debeSeguir = sesion?.repartidor?.online;
    if (!debeSeguir || !navigator.geolocation) {
      if (watchId.current != null) {
        navigator.geolocation?.clearWatch(watchId.current);
        watchId.current = null;
      }
      return undefined;
    }
    if (watchId.current != null) return undefined;

    let ultimoEnvio = 0;
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const ahora = Date.now();
        if (ahora - ultimoEnvio < 15000) return; // como mucho cada 15 s
        ultimoEnvio = ahora;
        llamar('ubicacionRepartidor', {
          token,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }).catch(() => {});
      },
      (err) => {
        setError(
          err.code === err.PERMISSION_DENIED
            ? 'Activá la ubicación para que el cliente pueda seguirte.'
            : 'No se pudo obtener tu ubicación.',
        );
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 },
    );

    return () => {
      if (watchId.current != null) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
    };
  }, [sesion?.repartidor?.online, token]);

  const accion = async (fn, datos, msgError) => {
    setOcupado(true);
    setError('');
    try {
      await llamar(fn, { token, ...datos });
      await cargar(true);
    } catch (e) {
      setError(e?.message || msgError);
    } finally {
      setOcupado(false);
    }
  };

  if (estado === 'cargando') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-900 text-zinc-400">
        Cargando…
      </div>
    );
  }

  if (estado === 'invalido') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-900 px-6 text-center">
        <div>
          <p className="text-lg font-semibold text-white">Enlace no válido</p>
          <p className="mt-1 text-sm text-zinc-400">
            Pedile al comercio que te vuelva a enviar tu link de repartidor.
          </p>
        </div>
      </div>
    );
  }

  const { repartidor, enCurso = [], disponibles = [] } = sesion;

  return (
    <div className="min-h-screen bg-zinc-900 pb-10 text-zinc-200">
      {/* Encabezado con el switch de disponibilidad */}
      <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-900/95 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <div>
            <p className="text-lg font-bold text-white">
              Hola, {repartidor.nombre || 'repartidor'}
            </p>
            <p
              className={`text-xs font-semibold ${
                repartidor.online ? 'text-green-400' : 'text-zinc-500'
              }`}
            >
              {repartidor.online ? 'Disponible' : 'No disponible'}
            </p>
          </div>
          <button
            type="button"
            disabled={ocupado || enViaje}
            onClick={() =>
              accion(
                'repartidorOnline',
                { online: !repartidor.online, vehiculo: repartidor.vehiculo },
                'No se pudo cambiar el estado.',
              )
            }
            title={enViaje ? 'Terminá la entrega en curso' : ''}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-colors disabled:opacity-50 ${
              repartidor.online
                ? 'bg-green-600 text-white'
                : 'bg-zinc-700 text-zinc-200'
            }`}
          >
            <Power className="h-4 w-4" />
            {repartidor.online ? 'Online' : 'Offline'}
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-md space-y-4 px-4 py-4">
        {error && (
          <p className="rounded-lg bg-red-900/30 p-3 text-sm text-red-300">
            {error}
          </p>
        )}

        {/* Elegir vehículo si todavía no lo hizo */}
        {!repartidor.vehiculo && (
          <div className="rounded-xl border border-zinc-700 bg-zinc-800 p-4">
            <p className="mb-2 text-sm font-medium text-white">
              ¿Con qué vas a repartir?
            </p>
            <div className="flex gap-2">
              {[
                ['moto', 'Moto', Bike],
                ['auto', 'Auto', Car],
                ['bici', 'Bici', Bike],
              ].map(([val, lbl, Icono]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() =>
                    accion(
                      'repartidorOnline',
                      { online: repartidor.online, vehiculo: val },
                      'No se pudo guardar.',
                    )
                  }
                  className="flex flex-1 flex-col items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-xs font-semibold text-zinc-200 hover:border-blue-500"
                >
                  <Icono className="h-5 w-5" />
                  {lbl}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Entrega en curso */}
        {enCurso.map((p) => (
          <div
            key={p.id}
            className="rounded-xl border border-blue-500/40 bg-blue-500/10 p-4"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-300">
              Tu entrega
            </p>
            <p className="text-xl font-bold text-white">#{p.codigo}</p>
            <p className="mt-1 text-sm text-zinc-200">{p.cliente?.nombre}</p>

            {p.cliente?.direccion && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  p.cliente.direccion,
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 flex items-center gap-2 rounded-lg bg-zinc-800 p-2.5 text-sm text-white"
              >
                <MapPin className="h-4 w-4 flex-none text-blue-400" />
                <span className="flex-1">{p.cliente.direccion}</span>
                <Navigation className="h-4 w-4 flex-none text-blue-400" />
              </a>
            )}

            {p.cliente?.telefono && (
              <a
                href={`https://wa.me/${
                  String(p.cliente.telefono).startsWith('54')
                    ? p.cliente.telefono
                    : `549${p.cliente.telefono}`
                }`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 flex items-center gap-2 text-sm text-zinc-300"
              >
                <Phone className="h-4 w-4 text-green-400" />
                {p.cliente.telefono}
              </a>
            )}

            <div className="mt-3 border-t border-blue-500/20 pt-2 text-sm">
              {(p.items || []).map((it, i) => (
                <p key={i} className="text-zinc-300">
                  {it.cantidad}x {it.nombre}
                </p>
              ))}
              <p className="mt-1 font-bold text-white">
                A cobrar: ${formatCurrency(p.total)}{' '}
                <span className="text-xs font-normal text-zinc-400">
                  ({p.metodoPago === 'qr_local' ? 'QR/tarjeta' : 'efectivo'})
                </span>
              </p>
            </div>

            <div className="mt-3 flex gap-2">
              {p.estado !== 'en_camino' ? (
                <button
                  type="button"
                  disabled={ocupado}
                  onClick={() =>
                    accion(
                      'estadoEntrega',
                      { pedidoId: p.id, estado: 'en_camino' },
                      'No se pudo actualizar.',
                    )
                  }
                  className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                >
                  Salí a entregar
                </button>
              ) : (
                <button
                  type="button"
                  disabled={ocupado}
                  onClick={() =>
                    accion(
                      'estadoEntrega',
                      { pedidoId: p.id, estado: 'entregado' },
                      'No se pudo actualizar.',
                    )
                  }
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                >
                  <Check className="h-4 w-4" /> Entregado
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Pedidos para tomar */}
        {!repartidor.online && enCurso.length === 0 && (
          <p className="py-16 text-center text-sm text-zinc-500">
            Ponete <strong className="text-zinc-300">Online</strong> para recibir
            pedidos.
          </p>
        )}

        {repartidor.online && enCurso.length === 0 && (
          <>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Pedidos disponibles
            </p>
            {disponibles.length === 0 ? (
              <div className="py-14 text-center">
                <Package className="mx-auto mb-2 h-10 w-10 text-zinc-700" />
                <p className="text-sm text-zinc-500">Esperando pedidos…</p>
              </div>
            ) : (
              disponibles.map((p) => (
                <div
                  key={p.id}
                  className="rounded-xl border border-zinc-700 bg-zinc-800 p-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-white">#{p.codigo}</p>
                      <p className="text-sm text-zinc-400">
                        {p.cliente?.direccion || 'Sin dirección'}
                      </p>
                    </div>
                    <p className="font-bold text-white">
                      ${formatCurrency(p.total)}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={ocupado}
                    onClick={() =>
                      accion(
                        'tomarPedido',
                        { pedidoId: p.id },
                        'No se pudo tomar el pedido.',
                      )
                    }
                    className="mt-3 w-full rounded-lg bg-green-600 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                  >
                    Aceptar
                  </button>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default AppRepartidor;
