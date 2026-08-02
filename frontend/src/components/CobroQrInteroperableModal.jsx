// src/components/CobroQrInteroperableModal.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, CheckCircle, Smartphone } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAppContext } from '../context/AppContext.jsx';
import { formatCurrency } from '../utils/helpers.js';

function CobroQrInteroperableModal({ monto, descripcion, onClose, onPagado }) {
  const { sucursalActual, mostrarMensaje } = useAppContext();
  const [estado, setEstado] = useState('cargando'); // cargando | listo | error
  const [qrImage, setQrImage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [externalReference, setExternalReference] = useState(null);
  const [pagado, setPagado] = useState(false);

  useEffect(() => {
    let cancelado = false;
    const generar = async () => {
      setEstado('cargando');
      try {
        const { getFunctions, httpsCallable } = await import(
          'firebase/functions'
        );
        const functions = getFunctions();
        const crearQrInteroperable = httpsCallable(
          functions,
          'crearQrInteroperable',
        );
        const res = await crearQrInteroperable({
          monto,
          descripcion: descripcion || 'Venta',
          sucursalId: sucursalActual?.id || null,
        });
        if (cancelado) return;
        if (!res.data?.qrImage) {
          throw new Error(
            'La caja QR no devolvió imagen. Revisá que tu cuenta MP tenga QR habilitado.',
          );
        }
        setExternalReference(res.data?.externalReference || null);
        setQrImage(res.data.qrImage);
        setEstado('listo');
      } catch (e) {
        if (cancelado) return;
        setErrorMsg(e?.message || 'No se pudo generar el QR interoperable.');
        setEstado('error');
      }
    };
    generar();
    return () => {
      cancelado = true;
    };
  }, [monto, descripcion, sucursalActual]);

  // Escucha la confirmación en tiempo real (mismo flujo que el QR de MP).
  useEffect(() => {
    if (!externalReference) return undefined;
    const unsub = onSnapshot(
      doc(db, 'cobros_mp', externalReference),
      (snap) => {
        if (snap.data()?.estado === 'pagado') setPagado(true);
      },
    );
    return () => unsub();
  }, [externalReference]);

  useEffect(() => {
    if (pagado) {
      mostrarMensaje?.('¡Pago recibido por QR!', 'success');
      onPagado?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagado]);

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
            <Smartphone className="h-5 w-5 text-sky-400" /> QR — todas las
            billeteras
          </h3>
          <button
            onClick={onClose}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-700 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-3 text-2xl font-bold text-white">
          ${formatCurrency(monto)}
        </p>

        {pagado && (
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

        {!pagado && estado === 'cargando' && (
          <p className="py-10 text-sm text-zinc-400">Generando QR…</p>
        )}

        {!pagado && estado === 'error' && (
          <p className="py-6 text-sm text-red-400">{errorMsg}</p>
        )}

        {!pagado && estado === 'listo' && (
          <>
            <div className="mx-auto mb-3 inline-block rounded-lg bg-white p-3">
              <img
                src={qrImage}
                alt="QR de pago interoperable"
                width={220}
                height={220}
              />
            </div>
            <p className="mb-1 text-sm text-zinc-300">
              El cliente escanea con <strong>cualquier</strong> billetera o app
              del banco (Mercado Pago, MODO, etc.).
            </p>
            <p className="text-xs text-zinc-500">
              Esperando la confirmación del pago…
            </p>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

export default CobroQrInteroperableModal;
