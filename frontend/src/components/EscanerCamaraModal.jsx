// src/components/EscanerCamaraModal.jsx
//
// Escáner de códigos de barras / QR con la cámara, usando ZXing (funciona en
// cualquier navegador con cámara: PC, Android, iOS). Al detectar un código
// llama a onDetected(codigo).

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Camera } from 'lucide-react';
import {
  crearLector,
  restricciones,
  listarCamaras,
  elegirCamara,
} from '../utils/lectorCamara.js';

function EscanerCamaraModal({ onDetected, onClose }) {
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const doneRef = useRef(false);
  const [error, setError] = useState('');
  const [camaraElegida, setCamaraElegida] = useState(undefined);

  useEffect(() => {
    const hasCamera =
      typeof navigator !== 'undefined' &&
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia;
    if (!hasCamera) {
      setError(
        'Este dispositivo no tiene cámara disponible o el navegador no la permite.',
      );
      return undefined;
    }

    // El lector común: formatos de comercio, 1280x720 y enfoque continuo. Sin
    // eso, en Android el navegador abre la gran angular en 640x480 y las barras
    // de un código no se resuelven nunca. Ver utils/lectorCamara.js.
    const reader = crearLector();
    reader
      .decodeFromConstraints(
        restricciones(camaraElegida),
        videoRef.current,
        (result, err, controls) => {
          controlsRef.current = controls;
          if (result && !doneRef.current) {
            doneRef.current = true;
            try {
              controls.stop();
            } catch (_) {
              /* ignore */
            }
            onDetected?.(String(result.getText()).trim());
          }
        },
      )
      .then(async (controls) => {
        controlsRef.current = controls;
        // Los nombres de las cámaras recién existen después del permiso. Si el
        // navegador agarró una lente que no enfoca de cerca, se corrige acá.
        if (camaraElegida === undefined) {
          const mejor = elegirCamara(await listarCamaras());
          if (mejor) setCamaraElegida(mejor);
        }
      })
      .catch((e) => {
        setError(
          e?.name === 'NotAllowedError'
            ? 'No diste permiso a la cámara. Habilitalo en el candado del navegador y recargá.'
            : e?.message || 'No se pudo abrir la cámara.',
        );
      });

    return () => {
      // No se marca como terminado al cambiar de cámara, solo al cerrar: si no,
      // el segundo intento arranca sordo y no lee nunca.
      if (camaraElegida !== undefined) doneRef.current = false;
      try {
        controlsRef.current?.stop();
      } catch (_) {
        /* ignore */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camaraElegida]);

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
            type="button"
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
