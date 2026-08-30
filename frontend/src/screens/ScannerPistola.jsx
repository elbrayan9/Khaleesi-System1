// src/screens/ScannerPistola.jsx
import {
  sonarEscaneo,
  sonarErrorEscaneo,
  prepararSonido,
} from '../utils/sonido.js';
//
// "Celu como pistola": escanea códigos con la cámara del celular y los envía en
// tiempo real (Firestore) a la venta abierta en la PC. Reusa la cuenta actual.

import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAppContext } from '../context/AppContext.jsx';
import { ScanLine, Wifi } from 'lucide-react';

/**
 * Qué mostrar del último código escaneado.
 *
 * Un QR del sistema es una URL entera —`https://khaleesisystem.com.ar/product/
 * <id>`— que no entra en el ancho del celular y, peor, no le dice nada a quien
 * está atendiendo: lo único que le importa es que ese disparo salió. De la URL
 * se muestra el id, que es lo que la PC usa para encontrar el producto.
 *
 * Un código de barras común se muestra tal cual: ahí el número sí es el dato.
 */
function paraMostrar(codigo) {
  if (!codigo) return '—';
  const esProducto = codigo.match(/\/product\/([^/?#\s]+)/);
  if (esProducto) return `Producto ${esProducto[1]}`;
  return codigo;
}

function ScannerPistola() {
  const { sucursalActual, currentUser } = useAppContext();
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const lastRef = useRef({ code: '', t: 0 });
  const [error, setError] = useState('');
  const [ultimo, setUltimo] = useState('');
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Este dispositivo no tiene cámara disponible.');
      return undefined;
    }
    const reader = new BrowserMultiFormatReader();
    reader
      .decodeFromConstraints(
        { video: { facingMode: { ideal: 'environment' } } },
        videoRef.current,
        async (result) => {
          if (!result) return;
          const code = String(result.getText()).trim();
          const now = Date.now();
          // Evita repetir el mismo código dentro de 1,5s.
          if (code === lastRef.current.code && now - lastRef.current.t < 1500)
            return;
          lastRef.current = { code, t: now };
          const sucId = sucursalActual?.id;
          if (!sucId || !currentUser?.uid) return;
          try {
            await setDoc(doc(db, 'scannerRelay', sucId), {
              userId: currentUser.uid,
              codigo: code,
              ts: now,
            });
            setUltimo(code);
            setCount((c) => c + 1);
            // Suena y vibra recién acá, después de que el código viajó: es la
            // señal de que llegó a la caja, no de que la cámara vio algo.
            sonarEscaneo();
            if (navigator.vibrate) navigator.vibrate(80);
          } catch (e) {
            sonarErrorEscaneo();
            setError(e?.message || 'No se pudo enviar el código.');
          }
        },
      )
      .then((c) => {
        controlsRef.current = c;
      })
      .catch((e) => setError(e?.message || 'No se pudo abrir la cámara.'));
    return () => {
      try {
        controlsRef.current?.stop();
      } catch (_) {
        /* ignore */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sucursalActual, currentUser]);

  return (
    <div className="mx-auto max-w-md text-white" onPointerDown={prepararSonido}>
      <h2 className="mb-1 flex items-center gap-2 text-xl font-bold">
        <ScanLine className="h-6 w-6 text-sky-400" /> Modo pistola
      </h2>
      <p className="mb-3 flex items-center gap-1 text-sm text-zinc-400">
        <Wifi className="h-4 w-4 text-green-400" /> Los códigos se agregan a la
        venta abierta en la PC.
      </p>

      {error ? (
        <p className="rounded-md bg-red-900/40 p-3 text-sm text-red-300">
          {error}
        </p>
      ) : (
        <>
          <div className="relative overflow-hidden rounded-lg bg-black">
            <video
              ref={videoRef}
              className="h-72 w-full object-cover"
              muted
              playsInline
            />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-24 w-4/5 rounded-lg border-2 border-sky-400/80" />
            </div>
          </div>
          <div className="mt-3 rounded-lg bg-zinc-800 p-3 text-center">
            <p className="text-xs uppercase tracking-wider text-zinc-500">
              Último enviado
            </p>
            <p className="break-all font-mono text-base leading-snug text-white">
              {paraMostrar(ultimo)}
            </p>
            <p className="mt-1 text-xs text-zinc-400">
              {count} código{count === 1 ? '' : 's'} enviados
            </p>
          </div>
        </>
      )}
    </div>
  );
}

export default ScannerPistola;
