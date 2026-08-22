// src/components/VentaPorVozModal.jsx
//
// Dictás la venta ("dos cocas y un pan") y la IA arma los items del carrito.
// Usa Web Speech API para el dictado (Chrome/Edge) y ventaPorVoz para interpretar.

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Mic, Square } from 'lucide-react';
import { useAppContext } from '../context/AppContext.jsx';

export const soportaVoz = () =>
  typeof window !== 'undefined' &&
  (window.SpeechRecognition || window.webkitSpeechRecognition);

function VentaPorVozModal({ onClose }) {
  const { productos = [], handleAddToCart, mostrarMensaje } = useAppContext();
  const recRef = useRef(null);
  const [escuchando, setEscuchando] = useState(false);
  const [texto, setTexto] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setError(
        'Tu navegador no soporta dictado por voz. Usá Chrome o Edge.',
      );
      return undefined;
    }
    const rec = new SR();
    rec.lang = 'es-AR';
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let full = '';
      for (let i = 0; i < e.results.length; i += 1) {
        full += e.results[i][0].transcript;
      }
      setTexto(full);
    };
    rec.onerror = (e) => {
      setError(
        e.error === 'not-allowed'
          ? 'No diste permiso al micrófono.'
          : 'Error al escuchar. Probá de nuevo.',
      );
      setEscuchando(false);
    };
    rec.onend = () => setEscuchando(false);
    recRef.current = rec;

    // Arranca solo.
    try {
      rec.start();
      setEscuchando(true);
    } catch (_) {
      /* ignore */
    }

    return () => {
      try {
        rec.stop();
      } catch (_) {
        /* ignore */
      }
    };
  }, []);

  const alternar = () => {
    const rec = recRef.current;
    if (!rec) return;
    if (escuchando) {
      rec.stop();
      setEscuchando(false);
    } else {
      setError('');
      try {
        rec.start();
        setEscuchando(true);
      } catch (_) {
        /* ignore */
      }
    }
  };

  const agregar = async () => {
    if (!texto.trim()) {
      mostrarMensaje?.('No se escuchó nada todavía.', 'warning');
      return;
    }
    try {
      recRef.current?.stop();
    } catch (_) {
      /* ignore */
    }
    setEscuchando(false);
    setProcesando(true);
    setError('');
    try {
      const { getFunctions, httpsCallable } = await import(
        'firebase/functions'
      );
      const fn = httpsCallable(getFunctions(), 'ventaPorVoz');
      const res = await fn({
        texto,
        productos: productos.map((p) => p.nombre).slice(0, 300),
      });
      const items = res.data?.items || [];
      if (items.length === 0) {
        setError('No se reconoció ningún producto. Probá de nuevo.');
        setProcesando(false);
        return;
      }
      let ok = 0;
      items.forEach((it) => {
        const prod = productos.find(
          (p) =>
            String(p.nombre || '').trim().toLowerCase() ===
            it.producto.trim().toLowerCase(),
        );
        if (prod) {
          handleAddToCart(prod, it.cantidad, 0);
          ok += 1;
        }
      });
      mostrarMensaje?.(
        ok > 0
          ? `${ok} producto(s) agregados al carrito.`
          : 'No se encontraron esos productos.',
        ok > 0 ? 'success' : 'warning',
      );
      onClose?.();
    } catch (e) {
      setError(e?.message || 'No se pudo interpretar el dictado.');
      setProcesando(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="w-full max-w-md rounded-lg bg-zinc-800 shadow-xl"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <div className="flex items-center justify-between border-b border-zinc-700 px-4 py-3">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Mic className="h-5 w-5 text-rose-400" /> Vender por voz
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-700 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 text-center">
          {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

          <button
            type="button"
            onClick={alternar}
            className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full transition-colors ${
              escuchando
                ? 'animate-pulse bg-rose-600 text-white'
                : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
            }`}
            aria-label={escuchando ? 'Detener' : 'Escuchar'}
          >
            {escuchando ? (
              <Square className="h-7 w-7" />
            ) : (
              <Mic className="h-8 w-8" />
            )}
          </button>
          <p className="mt-2 text-xs text-zinc-400">
            {escuchando
              ? 'Escuchando… decí los productos y cantidades.'
              : 'Tocá el micrófono para dictar.'}
          </p>

          <div className="mt-4 min-h-[60px] rounded-lg bg-zinc-900 p-3 text-left text-sm text-zinc-200">
            {texto || (
              <span className="text-zinc-500">
                Ej: “dos coca cola y tres alfajores”
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={agregar}
            disabled={procesando || !texto.trim()}
            className="mt-4 w-full rounded-lg bg-emerald-600 py-2.5 font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {procesando ? 'Interpretando…' : 'Agregar al carrito'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default VentaPorVozModal;
