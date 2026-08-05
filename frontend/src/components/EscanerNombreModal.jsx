// src/components/EscanerNombreModal.jsx
//
// OCR con la cámara: lee el nombre impreso en el envase (Tesseract.js) para
// cargar productos que no están en las bases por código de barras.

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Camera } from 'lucide-react';
import Tesseract from 'tesseract.js';

function EscanerNombreModal({ onDetected, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [progreso, setProgreso] = useState(0);

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
    setProgreso(0);
    setError('');
    try {
      const canvas = document.createElement('canvas');
      canvas.width = v.videoWidth;
      canvas.height = v.videoHeight;
      canvas.getContext('2d').drawImage(v, 0, 0);
      const { data } = await Tesseract.recognize(canvas, 'spa', {
        logger: (m) => {
          if (m.status === 'recognizing text')
            setProgreso(Math.round((m.progress || 0) * 100));
        },
      });
      const lineas = (data.text || '')
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => s.length >= 3 && /[a-zA-ZáéíóúñÁÉÍÓÚÑ]/.test(s));
      const cand =
        lineas.sort((a, b) => b.length - a.length)[0] ||
        (data.text || '').trim();
      if (cand) {
        // Devolvemos también la foto capturada para usarla como imagen.
        canvas.toBlob(
          (blob) => onDetected?.(cand.slice(0, 80), blob),
          'image/jpeg',
          0.85,
        );
      } else {
        setError('No se pudo leer el texto. Acercá la cámara al nombre.');
        setProcesando(false);
      }
    } catch (e) {
      setError(e?.message || 'Error al leer el texto.');
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
            <Camera className="h-5 w-5 text-indigo-400" /> Escanear nombre
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
            Apuntá al <strong>nombre grande</strong> del envase y capturá.
          </p>
          <button
            type="button"
            onClick={capturar}
            disabled={procesando}
            className="mt-3 w-full rounded-md bg-indigo-600 px-4 py-2.5 font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {procesando ? `Leyendo… ${progreso}%` : 'Capturar nombre'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default EscanerNombreModal;
