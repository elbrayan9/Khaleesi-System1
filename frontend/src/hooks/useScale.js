// frontend/src/hooks/useScale.js
//
// Lee el peso de una balanza conectada por USB/serie usando la Web Serial API.
// Funciona en Chrome/Edge de escritorio sobre HTTPS. Es opcional y no afecta
// nada si el navegador no lo soporta.

import { useState, useRef, useCallback, useEffect } from 'react';

// Extrae un número de peso de una línea del stream (ej: "ST,GS,+  0.350 kg").
// Toma el último número con decimales que aparezca en la línea.
const parseWeight = (line) => {
  const matches = String(line).replace(',', '.').match(/-?\d+\.\d+|-?\d+/g);
  if (!matches || matches.length === 0) return null;
  const val = parseFloat(matches[matches.length - 1]);
  return Number.isFinite(val) ? val : null;
};

export function useScale(baudRate = 9600) {
  const soportado =
    typeof navigator !== 'undefined' && 'serial' in navigator;
  const [conectado, setConectado] = useState(false);
  const [peso, setPeso] = useState(0);
  const [error, setError] = useState('');
  const portRef = useRef(null);
  const readerRef = useRef(null);
  const keepReading = useRef(false);

  const desconectar = useCallback(async () => {
    keepReading.current = false;
    try {
      await readerRef.current?.cancel();
    } catch (_) {
      /* ignore */
    }
    try {
      readerRef.current?.releaseLock();
    } catch (_) {
      /* ignore */
    }
    try {
      await portRef.current?.close();
    } catch (_) {
      /* ignore */
    }
    readerRef.current = null;
    portRef.current = null;
    setConectado(false);
  }, []);

  const conectar = useCallback(async () => {
    if (!soportado) {
      setError(
        'Tu navegador no soporta conexión a balanza. Usá Chrome o Edge en una computadora.',
      );
      return;
    }
    setError('');
    try {
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate });
      portRef.current = port;
      setConectado(true);
      keepReading.current = true;

      const reader = port.readable.getReader();
      readerRef.current = reader;
      const decoder = new TextDecoder();
      let buffer = '';

      while (keepReading.current) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split(/[\r\n]+/);
          buffer = lines.pop() || '';
          for (const line of lines) {
            const w = parseWeight(line);
            if (w !== null) setPeso(w);
          }
        }
      }
      try {
        reader.releaseLock();
      } catch (_) {
        /* ignore */
      }
    } catch (e) {
      if (e?.name !== 'AbortError' && e?.name !== 'NotFoundError') {
        setError(e?.message || 'No se pudo conectar a la balanza.');
      }
      setConectado(false);
    }
  }, [soportado, baudRate]);

  // Limpieza al desmontar.
  useEffect(() => {
    return () => {
      keepReading.current = false;
      try {
        readerRef.current?.cancel();
      } catch (_) {
        /* ignore */
      }
      try {
        portRef.current?.close();
      } catch (_) {
        /* ignore */
      }
    };
  }, []);

  return { soportado, conectado, peso, error, conectar, desconectar };
}
