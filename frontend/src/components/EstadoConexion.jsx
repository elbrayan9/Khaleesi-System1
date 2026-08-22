// src/components/EstadoConexion.jsx
//
// Dos cosas en una:
//  1) Avisa cuando se cae internet (los datos siguen andando por la caché de
//     Firestore, pero conviene que el cajero lo sepa).
//  2) Candado de gracia: si el equipo pasa demasiado tiempo sin poder
//     sincronizar, bloquea el sistema hasta que vuelva a conectarse. El control
//     de verdad lo hacen las reglas de Firestore del lado del servidor; esto
//     evita que alguien quede operando indefinidamente sin conexión.

import React, { useCallback, useEffect, useState } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { doc, getDocFromServer } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAppContext } from '../context/AppContext.jsx';

const CLAVE_SYNC = 'ultimaSyncOk';
// Margen sin poder sincronizar antes de bloquear: cubre un corte de internet de
// un día entero, sin dejar margen para operar desconectado a propósito.
const HORAS_GRACIA = 24;

function EstadoConexion() {
  const { datosNegocio, currentUser } = useAppContext();
  const [online, setOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );
  const [bloqueado, setBloqueado] = useState(false);

  // Estado de la conexión (solo para el cartel; el candado no se fía de esto).
  useEffect(() => {
    const subir = () => setOnline(true);
    const bajar = () => setOnline(false);
    window.addEventListener('online', subir);
    window.addEventListener('offline', bajar);
    return () => {
      window.removeEventListener('online', subir);
      window.removeEventListener('offline', bajar);
    };
  }, []);

  // Verificación REAL contra el servidor. No alcanza con que el navegador diga
  // "estoy online": alguien podría tener internet y bloquear Firebase. Acá
  // exigimos una lectura que no salga de la caché local.
  const verificarConServidor = useCallback(async () => {
    if (!currentUser?.uid) return false;
    try {
      await getDocFromServer(doc(db, 'datosNegocio', currentUser.uid));
      try {
        localStorage.setItem(CLAVE_SYNC, String(Date.now()));
      } catch (_) {
        /* modo privado */
      }
      setBloqueado(false);
      return true;
    } catch (_) {
      return false;
    }
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!currentUser?.uid) return undefined;

    const revisar = async () => {
      const ok = await verificarConServidor();
      if (ok) return;

      // No se pudo hablar con el servidor: miramos hace cuánto fue la última vez.
      let ultima = 0;
      try {
        ultima = Number(localStorage.getItem(CLAVE_SYNC)) || 0;
      } catch (_) {
        ultima = 0;
      }
      // Primer arranque sin sello: no bloqueamos todavía.
      if (!ultima) return;
      // Reloj atrasado a mano: lo tomamos como período vencido.
      if (Date.now() < ultima) {
        setBloqueado(true);
        return;
      }
      const horas = (Date.now() - ultima) / 3600000;
      setBloqueado(horas > HORAS_GRACIA);
    };

    revisar();
    const t = setInterval(revisar, 10 * 60 * 1000); // cada 10 minutos
    return () => clearInterval(t);
  }, [currentUser?.uid, verificarConServidor, datosNegocio?.subscriptionStatus]);

  if (bloqueado) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-900 p-6 text-center">
        <div className="max-w-sm">
          <WifiOff className="mx-auto mb-4 h-14 w-14 text-red-400" />
          <h2 className="text-xl font-bold text-white">
            Conectate a internet para seguir
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            El sistema estuvo más de {HORAS_GRACIA} horas sin poder
            sincronizar. Conectate a internet y volvé a intentar: tus datos
            siguen guardados.
          </p>
          <button
            type="button"
            onClick={async () => {
              const ok = await verificarConServidor();
              if (!ok) window.location.reload();
            }}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-500"
          >
            <RefreshCw className="h-4 w-4" /> Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (online) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-[90] -translate-x-1/2 rounded-full border border-amber-500/40 bg-amber-500/15 px-4 py-2 text-xs font-semibold text-amber-200 backdrop-blur">
      <span className="flex items-center gap-2">
        <WifiOff className="h-4 w-4" />
        Sin conexión — podés seguir vendiendo, se sincroniza al volver
      </span>
    </div>
  );
}

export default EstadoConexion;
