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
import {
  crearLector,
  restricciones,
  listarCamaras,
  elegirCamara,
  nombreDeCamara,
} from '../utils/lectorCamara.js';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAppContext } from '../context/AppContext.jsx';
import { ScanLine, Wifi, Flashlight } from 'lucide-react';

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

  // La sucursal y el usuario van por ref y no como dependencias del efecto.
  //
  // Estaban como dependencias, así que cualquier cambio de identidad de esos
  // objetos —y el contexto los rearma seguido— **apagaba y volvía a prender la
  // cámara**. En iPhone se reengancha tan rápido que no se nota; en Android
  // tarda, a veces la cámara queda tomada por el stream anterior y lo que se ve
  // es el fondo negro del contenedor. La cámara tiene que arrancar una vez y
  // apagarse al salir, nada más.
  const datosRef = useRef({ sucursalActual, currentUser });
  datosRef.current = { sucursalActual, currentUser };

  const [camaras, setCamaras] = useState([]);
  const [camaraElegida, setCamaraElegida] = useState(undefined);
  const [tieneLinterna, setTieneLinterna] = useState(false);
  const [linterna, setLinterna] = useState(false);

  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Este dispositivo no tiene cámara disponible.');
      return undefined;
    }

    // `cancelado` cierra una carrera real: si el efecto se rehace antes de que
    // la promesa resuelva, la limpieza no tenía qué apagar —los controles
    // todavía no existían— y quedaban dos streams peleando por la cámara. En
    // Android la cámara es exclusiva: el segundo falla y la pantalla queda
    // negra.
    let cancelado = false;
    let controles = null;

    const lector = crearLector();
    lector
      .decodeFromConstraints(
        restricciones(camaraElegida),
        videoRef.current,
        async (result) => {
          if (!result) return;
          const code = String(result.getText()).trim();
          const now = Date.now();
          // Evita repetir el mismo código dentro de 1,5s.
          if (code === lastRef.current.code && now - lastRef.current.t < 1500)
            return;
          lastRef.current = { code, t: now };
          const { sucursalActual: suc, currentUser: user } = datosRef.current;
          const sucId = suc?.id;
          if (!sucId || !user?.uid) return;
          try {
            await setDoc(doc(db, 'scannerRelay', sucId), {
              userId: user.uid,
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
      .then(async (c) => {
        if (cancelado) {
          c?.stop();
          return;
        }
        controles = c;
        controlsRef.current = c;
        setTieneLinterna(typeof c?.switchTorch === 'function');

        // Los nombres de las cámaras recién existen después de que la persona
        // dio permiso, así que la lista se arma ahora y no antes.
        const encontradas = await listarCamaras();
        if (cancelado) return;
        setCamaras(encontradas);
        // Si el navegador eligió sola una lente que no enfoca de cerca, se
        // corrige acá: el efecto se rehace con la buena.
        if (camaraElegida === undefined) {
          const mejor = elegirCamara(encontradas);
          if (mejor) setCamaraElegida(mejor);
        }
      })
      .catch((e) => {
        if (cancelado) return;
        setError(e?.message || 'No se pudo abrir la cámara.');
      });

    return () => {
      cancelado = true;
      try {
        (controles || controlsRef.current)?.stop();
      } catch {
        /* ignore */
      }
      controlsRef.current = null;
    };
  }, [camaraElegida]);

  // La linterna cambia todo en un local con poca luz: sin ella, un código
  // impreso en cartón oscuro no se lee nunca.
  const alternarLinterna = async () => {
    try {
      await controlsRef.current?.switchTorch?.(!linterna);
      setLinterna((v) => !v);
    } catch {
      setTieneLinterna(false);
    }
  };

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
            {tieneLinterna && (
              <button
                type="button"
                onClick={alternarLinterna}
                aria-label={linterna ? 'Apagar la luz' : 'Prender la luz'}
                className={`absolute right-3 top-3 rounded-full p-2.5 ${
                  linterna
                    ? 'bg-amber-400 text-zinc-900'
                    : 'bg-black/50 text-white'
                }`}
              >
                <Flashlight className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* La salida de emergencia cuando el navegador eligió mal.
              Android expone la gran angular, la macro y hasta el sensor de
              profundidad como si fueran cámaras comunes, y ninguna enfoca a
              20 cm. El sistema trata de esquivarlas solo, pero si igual no lee,
              acá se cambia a mano y se termina el problema. */}
          {camaras.length > 1 && (
            <div className="mt-3">
              <label
                htmlFor="camara-elegida"
                className="mb-1 block text-xs text-zinc-400"
              >
                ¿No lee? Probá con otra cámara
              </label>
              <select
                id="camara-elegida"
                value={camaraElegida || ''}
                onChange={(e) => setCamaraElegida(e.target.value)}
                className="w-full rounded-md border border-zinc-600 bg-zinc-800 p-2 text-sm text-zinc-100"
              >
                {camaras.map((c, i) => (
                  <option key={c.deviceId} value={c.deviceId}>
                    {nombreDeCamara(c, i)}
                  </option>
                ))}
              </select>
            </div>
          )}
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
