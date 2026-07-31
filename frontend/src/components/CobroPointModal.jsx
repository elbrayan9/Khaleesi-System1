// src/components/CobroPointModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, CheckCircle, Loader2, Smartphone } from 'lucide-react';
import { useAppContext } from '../context/AppContext.jsx';
import { formatCurrency } from '../utils/helpers.js';

// Helper para cargar las Cloud Functions bajo demanda.
const getFns = async () => {
  const { getFunctions, httpsCallable } = await import('firebase/functions');
  return { functions: getFunctions(), httpsCallable };
};

function CobroPointModal({ monto, descripcion, devices = [], onClose, onPagado }) {
  const { sucursalActual, mostrarMensaje } = useAppContext();
  const sucursalId = sucursalActual?.id || null;

  const [deviceId, setDeviceId] = useState(
    devices.length === 1 ? devices[0].id : '',
  );
  // fase: elegir | enviando | esperando | pagado | error
  const [fase, setFase] = useState(devices.length === 1 ? 'enviando' : 'elegir');
  const [errorMsg, setErrorMsg] = useState('');
  const refPago = useRef({ paymentIntentId: null, externalReference: null });

  // Envía el cobro al posnet.
  const enviarAlPosnet = async (devId) => {
    if (!devId) return;
    setFase('enviando');
    setErrorMsg('');
    try {
      const { functions, httpsCallable } = await getFns();
      const crearPagoPoint = httpsCallable(functions, 'crearPagoPoint');
      const res = await crearPagoPoint({
        deviceId: devId,
        monto,
        descripcion: descripcion || 'Venta',
        sucursalId,
      });
      refPago.current = {
        paymentIntentId: res.data?.paymentIntentId || null,
        externalReference: res.data?.externalReference || null,
      };
      if (!refPago.current.paymentIntentId) {
        throw new Error('El posnet no aceptó el cobro.');
      }
      setFase('esperando');
    } catch (e) {
      setErrorMsg(e?.message || 'No se pudo enviar el cobro al posnet.');
      setFase('error');
    }
  };

  // Auto-envío si hay un solo posnet.
  useEffect(() => {
    if (devices.length === 1) enviarAlPosnet(devices[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Polling del estado mientras esperamos que el cliente pague en el aparato.
  useEffect(() => {
    if (fase !== 'esperando') return undefined;
    let intervalo;
    let intentos = 0;
    const MAX = 80; // ~4 min a 3s
    const consultar = async () => {
      intentos += 1;
      try {
        const { functions, httpsCallable } = await getFns();
        const consultarPagoPoint = httpsCallable(
          functions,
          'consultarPagoPoint',
        );
        const res = await consultarPagoPoint({
          paymentIntentId: refPago.current.paymentIntentId,
          externalReference: refPago.current.externalReference,
          sucursalId,
        });
        const st = res.data?.state;
        if (res.data?.aprobado) {
          clearInterval(intervalo);
          setFase('pagado');
        } else if (['CANCELED', 'ERROR', 'ABANDONED'].includes(st)) {
          clearInterval(intervalo);
          setErrorMsg('El pago se canceló o falló en el posnet.');
          setFase('error');
        } else if (intentos >= MAX) {
          clearInterval(intervalo);
          setErrorMsg('Se agotó el tiempo de espera. Volvé a intentar.');
          setFase('error');
        }
      } catch (_) {
        // Errores transitorios de red: seguimos intentando.
      }
    };
    intervalo = setInterval(consultar, 3000);
    consultar();
    return () => clearInterval(intervalo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase]);

  // Al quedar pagado, avisamos al modal de pago (una sola vez).
  useEffect(() => {
    if (fase === 'pagado') {
      mostrarMensaje?.('¡Pago recibido por el posnet!', 'success');
      onPagado?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase]);

  // Cancela la intención en el posnet y cierra.
  const cancelarYcerrar = async () => {
    const { paymentIntentId, externalReference } = refPago.current;
    if (paymentIntentId && deviceId) {
      try {
        const { functions, httpsCallable } = await getFns();
        const cancelarPagoPoint = httpsCallable(functions, 'cancelarPagoPoint');
        await cancelarPagoPoint({
          deviceId,
          paymentIntentId,
          externalReference,
          sucursalId,
        });
      } catch (_) {
        /* ignoramos: igual cerramos */
      }
    }
    onClose?.();
  };

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="w-full max-w-md rounded-lg bg-zinc-800 p-5 text-center shadow-xl"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Smartphone className="h-5 w-5 text-indigo-400" /> Cobro con posnet
          </h3>
          <button
            onClick={fase === 'esperando' ? cancelarYcerrar : onClose}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-700 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-4 text-2xl font-bold text-white">
          ${formatCurrency(monto)}
        </p>

        {fase === 'elegir' && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-zinc-400">Elegí el posnet a usar:</p>
            <select
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              className="rounded-md border border-zinc-600 bg-zinc-900 px-3 py-2 text-white"
            >
              <option value="">Seleccioná un posnet…</option>
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.id}
                </option>
              ))}
            </select>
            <button
              onClick={() => enviarAlPosnet(deviceId)}
              disabled={!deviceId}
              className="rounded-md bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              Enviar al posnet
            </button>
          </div>
        )}

        {fase === 'enviando' && (
          <div className="flex flex-col items-center gap-2 py-8 text-zinc-300">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
            <p className="text-sm">Enviando el cobro al posnet…</p>
          </div>
        )}

        {fase === 'esperando' && (
          <div className="flex flex-col items-center gap-3 py-6">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-400" />
            <p className="font-semibold text-white">Pagá en el posnet</p>
            <p className="text-sm text-zinc-400">
              El aparato muestra el monto. El cliente pasa o apoya la tarjeta.
              Esperando la confirmación…
            </p>
            <button
              onClick={cancelarYcerrar}
              className="mt-2 rounded-md bg-zinc-600 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-500"
            >
              Cancelar cobro
            </button>
          </div>
        )}

        {fase === 'pagado' && (
          <div className="py-8">
            <CheckCircle className="mx-auto mb-2 h-16 w-16 text-green-400" />
            <p className="text-xl font-bold text-green-400">¡Pago recibido!</p>
            <button
              onClick={onClose}
              className="mt-4 rounded-md bg-green-600 px-6 py-2 font-semibold text-white hover:bg-green-700"
            >
              Cerrar
            </button>
          </div>
        )}

        {fase === 'error' && (
          <div className="flex flex-col gap-3 py-6">
            <p className="text-sm text-red-400">{errorMsg}</p>
            <div className="flex gap-2">
              <button
                onClick={() => enviarAlPosnet(deviceId || devices[0]?.id)}
                className="flex-1 rounded-md bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-500"
              >
                Reintentar
              </button>
              <button
                onClick={onClose}
                className="flex-1 rounded-md bg-zinc-600 px-4 py-2 font-semibold text-white hover:bg-zinc-500"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

export default CobroPointModal;
