// El celular como pistola, del lado de la PC.
//
// El celu escribe cada código escaneado en `scannerRelay/{sucursalId}` y la
// computadora lo escucha en vivo. Empezó sirviendo solo para la venta, pero el
// puente nunca fue de la venta: es un lector de códigos que hoy está en el
// bolsillo en vez de colgado del mostrador.
//
// Por eso vive acá y no adentro de la pantalla de ventas: la carga de
// productos lo necesita igual, y con dos copias del mismo listener la primera
// diferencia entre ellas sería un error que aparece en una sola pantalla.
//
// Quién lo recibe se resuelve solo, sin coordinar nada: Venta y Productos son
// rutas hermanas, así que nunca están montadas las dos a la vez y un escaneo
// llega a una sola.

import { useEffect, useRef } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';

/**
 * @param {string|undefined} sucursalId  Sucursal a escuchar.
 * @param {(codigo: string) => void} alRecibir  Qué hacer con cada código.
 *
 * Solo llegan los códigos escaneados DESPUÉS de abrir la pantalla: al montar se
 * toma la hora y se descarta lo anterior. Si no, entrar a Productos dispararía
 * de nuevo el último código de la venta pasada, que puede ser de ayer.
 */
export function useRelayEscaner(sucursalId, alRecibir) {
  // El callback se rearma en cada render; en una ref para no re-suscribir el
  // listener de Firestore cada vez que la pantalla se dibuja.
  const alRecibirRef = useRef(alRecibir);
  alRecibirRef.current = alRecibir;

  useEffect(() => {
    if (!sucursalId) return undefined;

    const desdeTs = Date.now();
    let ultimoTs = desdeTs;

    const unsub = onSnapshot(doc(db, 'scannerRelay', sucursalId), (snap) => {
      const d = snap.data();
      if (d?.codigo && d?.ts && d.ts > ultimoTs) {
        ultimoTs = d.ts;
        alRecibirRef.current(String(d.codigo));
      }
    });

    return () => unsub();
  }, [sucursalId]);
}

export default useRelayEscaner;
