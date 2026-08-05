// src/components/EscanerNombreModal.jsx
//
// Identifica un producto desde una foto usando la visión de Gemini (Cloud
// Function identificarProductoFoto). Para productos que no están en las bases
// por código de barras. Devuelve el nombre + la foto capturada.

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Camera } from 'lucide-react';

function EscanerNombreModal({ onDetected, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState('');
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (e) {
        setError(
          e?.name === 'NotAllowedError'
            ? 'No diste permiso a la cámara.'
            : e?.message || 'No se pudo abrir la cámara.',
        );
      }
    })();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const capturar = async () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    setProcesando(true);
    setError('');
    try {
      const canvas = document.createElement('canvas');
      canvas.width = v.videoWidth;
      canvas.height = v.videoHeight;
      canvas.getContext('2d').drawImage(v, 0, 0);
      const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];

      const { getFunctions, httpsCallable } = await import(
        'firebase/functions'
      );
      const fn = httpsCallable(getFunctions(), 'identificarProductoFoto');
      const res = await fn({ imageBase64: base64, mimeType: 'image/jpeg' });
      const nombre = res.data?.nombre || '';
      const codigo = res.data?.codigo || '';
      if (nombre) {
        canvas.toBlob(
          (blob) => onDetected?.(nombre, blob, codigo),
          'image/jpeg',
          0.85,
        );
      } else {
        setError('No se pudo identificar. Probá con mejor luz y enfoque.');
        setProcesando(false);
      }
    } catch (e) {
      setError(e?.message || 'No se pudo identificar el producto.');
      setProcesando(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="w-full max-w-md overflow-hidden rounded-lg bg-zinc-800 shadow-xl"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <div className="flex items-center justify-between border-b border-zinc-700 px-4 py-3">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Camera className="h-5 w-5 text-indigo-400" /> Identificar con foto
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-700 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4">
          {error && (
            <p className="mb-2 text-center text-sm text-red-400">{error}</p>
          )}
          <div className="relative overflow-hidden rounded-lg bg-black">
            <video
              ref={videoRef}
              className="h-64 w-full object-cover"
              muted
              playsInline
            />
          </div>
          <p className="mt-2 text-center text-xs text-zinc-400">
            Encuadrá el <strong>frente del producto</strong> y capturá. La IA lo
            identifica.
          </p>
          <button
            type="button"
            onClick={capturar}
            disabled={procesando}
            className="mt-3 w-full rounded-md bg-indigo-600 px-4 py-2.5 font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {procesando ? 'Identificando…' : 'Capturar e identificar'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default EscanerNombreModal;
