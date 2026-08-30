// src/components/TiendaCheckoutModal.jsx
//
// Paso final del pedido en la tienda pública: datos del cliente, retiro o
// envío y forma de pago. Crea el pedido con la Cloud Function crearPedidoTienda
// (el visitante no puede escribir en Firestore).

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Send } from 'lucide-react';
import { formatCurrency } from '../utils/helpers';
import SelectorUbicacion from './SelectorUbicacion.jsx';

function TiendaCheckoutModal({
  sucursalId,
  items,
  total,
  onCreado,
  onClose,
  // Dónde está el local, para centrar el mapa y para inclinar la búsqueda
  // hacia el barrio en vez de a otra localidad con la misma calle.
  localGeo = null,
}) {
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [tipo, setTipo] = useState('retiro'); // retiro | delivery
  const [direccion, setDireccion] = useState('');
  const [metodoPago, setMetodoPago] = useState('efectivo');
  // Dónde queda la casa. Es opcional: sin esto el pedido entra igual, solo que
  // el seguimiento no puede mostrar el recorrido ni cuánto falta.
  const [geo, setGeo] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const confirmar = async () => {
    setError('');
    if (!nombre.trim()) return setError('Necesitamos tu nombre.');
    if (String(telefono).replace(/\D/g, '').length < 6) {
      return setError('Ingresá un teléfono válido.');
    }
    if (tipo === 'delivery' && !direccion.trim()) {
      return setError('Ingresá la dirección de envío.');
    }
    setEnviando(true);
    try {
      const { getFunctions, httpsCallable } =
        await import('firebase/functions');
      const fn = httpsCallable(getFunctions(), 'crearPedidoTienda');
      const res = await fn({
        sucursalId,
        // Al backend solo le mandamos qué y cuánto: el precio lo pone él.
        items: items.map((it) => ({
          productoId: it.id,
          cantidad: it.cantidad,
        })),
        cliente: { nombre, telefono, direccion, geo },
        tipo,
        metodoPago,
      });
      onCreado?.(res.data);
    } catch (e) {
      setError(e?.message || 'No se pudo enviar el pedido.');
      setEnviando(false);
    }
  };

  const inputCls =
    'w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white placeholder-zinc-500';

  return (
    <motion.div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 sm:items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-zinc-900 sm:rounded-2xl"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <h3 className="text-lg font-bold text-white">Confirmar pedido</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="rounded-lg bg-zinc-800/60 p-3 text-sm">
            {items.map((it) => (
              <div key={it.id} className="flex justify-between text-zinc-300">
                <span className="truncate pr-2">
                  {it.cantidad}x {it.nombre}
                </span>
                <span>${formatCurrency(it.precio * it.cantidad)}</span>
              </div>
            ))}
            <div className="mt-2 flex justify-between border-t border-zinc-700 pt-2 font-bold text-white">
              <span>Total</span>
              <span>${formatCurrency(total)}</span>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-zinc-400">
              Tu nombre
            </label>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className={inputCls}
              placeholder="Nombre y apellido"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-zinc-400">Teléfono</label>
            <input
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className={inputCls}
              inputMode="tel"
              placeholder="Para avisarte del pedido"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-zinc-400">
              ¿Cómo lo recibís?
            </label>
            <div className="flex gap-2">
              {[
                ['retiro', 'Retiro en el local'],
                ['delivery', 'Envío a domicilio'],
              ].map(([val, lbl]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setTipo(val)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold ${
                    tipo === val
                      ? 'border-blue-500 bg-blue-600/15 text-white'
                      : 'border-zinc-700 bg-zinc-800 text-zinc-300'
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          {tipo === 'delivery' && (
            <div>
              <label className="mb-1 block text-xs text-zinc-400">
                Dirección
              </label>
              <input
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                className={inputCls}
                placeholder="Calle, número, piso/depto"
              />

              <div className="mt-3">
                <label className="mb-1 block text-xs text-zinc-400">
                  Marcá dónde entregarlo
                </label>
                <SelectorUbicacion
                  valor={geo}
                  direccion={direccion}
                  cerca={localGeo}
                  onCambio={(p) => setGeo(p)}
                  alto={200}
                  conBotonGps
                />
                {!geo && (
                  <p className="mt-1 text-xs text-zinc-500">
                    Es opcional, pero con el punto marcado vas a poder ver al
                    repartidor acercándose y cuánto falta.
                  </p>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs text-zinc-400">
              Forma de pago
            </label>
            <div className="flex gap-2">
              {[
                ['efectivo', 'Efectivo'],
                ['qr_local', 'QR / tarjeta al recibir'],
              ].map(([val, lbl]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setMetodoPago(val)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold ${
                    metodoPago === val
                      ? 'border-blue-500 bg-blue-600/15 text-white'
                      : 'border-zinc-700 bg-zinc-800 text-zinc-300'
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-zinc-500">
              El pago se hace al recibir el pedido.
            </p>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="button"
            onClick={confirmar}
            disabled={enviando}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 py-3 font-bold text-white hover:bg-green-700 disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            {enviando ? 'Enviando…' : 'Enviar pedido al local'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default TiendaCheckoutModal;
