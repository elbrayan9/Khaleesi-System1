// src/components/EscanerCamaraModal.jsx
//
// Escáner de códigos de barras / QR con la cámara, usando la API nativa
// BarcodeDetector (Chrome/Edge en desktop y Android). Si no está soportada,
// muestra un aviso. Al detectar un código llama a onDetected(codigo).

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Camera } from 'lucide-react';

function EscanerCamaraModal({ onDetected, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const detenidoRef = useRef(false);
  const [error, setError] = useState('');
  const soportado =
    typeof window !== 'undefined' && 'BarcodeDetector' in window;

  useEffect(() => {
    if (!soportado) {
      setError(
        'Tu navegador no soporta el escáner por cámara. Usá Chrome o Edge (en compu o Android).',
      );
      return undefined;
    }

    let detector;
    const iniciar = async () => {
      try {
        // Formatos comunes de retail.
        const formats = [
          'ean_13',
          'ean_8',
          'code_128',
          'code_39',
          'upc_a',
          'upc_e',
          'qr_code',
          'itf',
        ];
        // eslint-disable-next-line no-undef
        detector = new BarcodeDetector({ formats });

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        const tick = async () => {
          if (detenidoRef.current || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes && codes.length > 0) {
              const value = codes[0].rawValue;
              if (value) {
                detenidoRef.current = true;
                onDetected?.(String(value).trim());
                return;
              }
            }
          } catch (_) {
            /* seguimos intentando */
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch (e) {
        setError(
          e?.name === 'NotAllowedError'
            ? 'No diste permiso a la cámara. Habilitalo en el candado del navegador.'
            : e?.message || 'No se pudo abrir la cámara.',
        );
      }
    };
    iniciar();

    return () => {
      detenidoRef.current = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      const s = streamRef.current;
      if (s) s.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        exit={{ scale: 0.9, opacity: 0 }}
      >
        <div className="flex items-center justify-between border-b border-zinc-700 px-4 py-3">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Camera className="h-5 w-5 text-sky-400" /> Escanear con cámara
          </h3>
          <button
            onClick={onClose}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-700 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4">
          {error ? (
            <p className="py-8 text-center text-sm text-red-400">{error}</p>
          ) : (
            <>
              <div className="relative overflow-hidden rounded-lg bg-black">
                <video
                  ref={videoRef}
                  className="h-64 w-full object-cover"
                  muted
                  playsInline
                />
                {/* Guía visual */}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="h-24 w-4/5 rounded-lg border-2 border-sky-400/80" />
                </div>
              </div>
              <p className="mt-3 text-center text-xs text-zinc-400">
                Apuntá al código de barras o QR. Se agrega solo al detectarlo.
              </p>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default EscanerCamaraModal;
