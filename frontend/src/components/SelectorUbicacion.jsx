// src/components/SelectorUbicacion.jsx
//
// Un mapa con un pin que se arrastra, para fijar un punto exacto.
//
// Lo usa el dueño en Configuración para marcar dónde está el local, y el
// cliente en el checkout para marcar dónde vive. La búsqueda por dirección da
// el punto de partida; el arrastre lo corrige, que en Argentina hace falta
// seguido: la numeración de muchas calles no está cargada en el mapa y el
// resultado puede caer a varias cuadras.
//
// El buscador vive en una Cloud Function, no acá: ver functions/geocoding.js.

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, LocateFixed, Loader2 } from 'lucide-react';
import { esPunto } from '../utils/geo.js';

// Si no hay nada mejor, el mapa abre acá. No es para acertar, es para que se
// vea un mapa y no un rectángulo gris.
const CENTRO_POR_DEFECTO = { lat: -34.6037, lng: -58.3816 };

const pinIcono = L.divIcon({
  className: '',
  html: `<div style="font-size:30px;line-height:1;filter:drop-shadow(0 2px 3px rgba(0,0,0,.5))">📍</div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 28],
});

function SelectorUbicacion({
  valor = null, // { lat, lng } ya guardado, si hay
  direccion = '', // el texto para buscar
  cerca = null, // punto de referencia que inclina la búsqueda
  onCambio, // (punto | null) => void
  alto = 260,
  conBotonGps = false, // el cliente sí; el dueño del local no lo necesita
}) {
  const contenedor = useRef(null);
  const mapa = useRef(null);
  const pin = useRef(null);

  // El texto que se busca arranca en la dirección guardada pero se puede
  // editar. Importa: la dirección de la factura suele venir corta —sin ciudad,
  // sin provincia— y así no la encuentra. Retocarla acá no cambia el dato
  // fiscal, que es otra cosa.
  const [texto, setTexto] = useState(direccion || '');
  useEffect(() => {
    setTexto((t) => t || direccion || '');
  }, [direccion]);

  const [buscando, setBuscando] = useState(false);
  const [aviso, setAviso] = useState('');
  const [etiqueta, setEtiqueta] = useState('');

  // --- El mapa, una sola vez ---
  useEffect(() => {
    if (!contenedor.current || mapa.current) return undefined;

    const inicial = esPunto(valor)
      ? valor
      : esPunto(cerca)
        ? cerca
        : CENTRO_POR_DEFECTO;

    mapa.current = L.map(contenedor.current, { zoomControl: true }).setView(
      [inicial.lat, inicial.lng],
      esPunto(valor) ? 17 : 13,
    );
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap',
    }).addTo(mapa.current);

    pin.current = L.marker([inicial.lat, inicial.lng], {
      icon: pinIcono,
      draggable: true,
    }).addTo(mapa.current);

    pin.current.on('dragend', () => {
      const p = pin.current.getLatLng();
      setEtiqueta('');
      onCambio?.({ lat: p.lat, lng: p.lng, fuente: 'manual' });
    });

    // Tocar el mapa también mueve el pin: en un teléfono es más cómodo que
    // arrastrarlo.
    mapa.current.on('click', (e) => {
      pin.current.setLatLng(e.latlng);
      setEtiqueta('');
      onCambio?.({ lat: e.latlng.lat, lng: e.latlng.lng, fuente: 'manual' });
    });

    return () => {
      mapa.current?.remove();
      mapa.current = null;
      pin.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Si el valor cambia desde afuera, el pin acompaña.
  useEffect(() => {
    if (!pin.current || !esPunto(valor)) return;
    const actual = pin.current.getLatLng();
    if (
      Math.abs(actual.lat - valor.lat) < 1e-7 &&
      Math.abs(actual.lng - valor.lng) < 1e-7
    ) {
      return;
    }
    pin.current.setLatLng([valor.lat, valor.lng]);
    mapa.current?.setView([valor.lat, valor.lng], 17);
  }, [valor?.lat, valor?.lng]);

  function moverPin(p, zoom = 17) {
    pin.current?.setLatLng([p.lat, p.lng]);
    mapa.current?.setView([p.lat, p.lng], zoom);
  }

  async function buscarDireccion() {
    const consulta = String(texto || '').trim();
    if (consulta.length < 5) {
      setAviso('Escribí la dirección completa para poder buscarla.');
      return;
    }
    setBuscando(true);
    setAviso('');
    try {
      const { getFunctions, httpsCallable } =
        await import('firebase/functions');
      const fn = httpsCallable(getFunctions(), 'geocodificarDireccion');
      const { data } = await fn({
        texto: consulta,
        cerca: esPunto(cerca) ? cerca : null,
      });

      if (data?.ok) {
        moverPin(data);
        setEtiqueta(data.label || '');
        onCambio?.({ lat: data.lat, lng: data.lng, fuente: 'geocoding' });
        return;
      }
      // El buscador no siempre acierta, y no puede frenar a nadie: el pin
      // arrastrable es la salida en todos los casos.
      setAviso(
        data?.motivo === 'cuota'
          ? 'La búsqueda no está disponible ahora. Arrastrá el pin al lugar exacto.'
          : 'No encontramos esa dirección. Arrastrá el pin al lugar exacto.',
      );
    } catch (e) {
      setAviso(
        'No se pudo buscar la dirección. Arrastrá el pin al lugar exacto.',
      );
    } finally {
      setBuscando(false);
    }
  }

  function usarMiUbicacion() {
    if (!navigator.geolocation) {
      setAviso('Tu navegador no permite compartir la ubicación.');
      return;
    }
    setBuscando(true);
    setAviso('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBuscando(false);
        const { latitude, longitude, accuracy } = pos.coords;
        // Un GPS con dos kilómetros de error pone el pin en otro barrio:
        // confunde más de lo que ayuda.
        if (accuracy > 100) {
          setAviso(
            'Tu ubicación llegó con poca precisión. Revisá el pin y movelo si hace falta.',
          );
        }
        moverPin({ lat: latitude, lng: longitude });
        setEtiqueta('');
        onCambio?.({
          lat: latitude,
          lng: longitude,
          fuente: 'gps',
          accuracy: Math.round(accuracy),
        });
      },
      () => {
        setBuscando(false);
        setAviso('No compartiste tu ubicación. Podés marcarla en el mapa.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  }

  const boton =
    'flex items-center gap-1.5 rounded-md border border-zinc-600 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700 disabled:opacity-50';

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              buscarDireccion();
            }
          }}
          placeholder="Calle y número, ciudad, provincia"
          className="min-w-[200px] flex-1 rounded-md border border-zinc-600 bg-zinc-700 px-3 py-1.5 text-sm text-zinc-100 placeholder-zinc-500"
        />
        <button
          type="button"
          onClick={buscarDireccion}
          disabled={buscando}
          className={boton}
        >
          {buscando ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Search className="h-3.5 w-3.5" />
          )}
          Buscar la dirección
        </button>
        {conBotonGps && (
          <button
            type="button"
            onClick={usarMiUbicacion}
            disabled={buscando}
            className={boton}
          >
            <LocateFixed className="h-3.5 w-3.5" />
            Usar mi ubicación
          </button>
        )}
      </div>

      <div
        ref={contenedor}
        style={{ height: alto }}
        className="w-full overflow-hidden rounded-xl border border-zinc-700"
      />

      <p className="mt-1.5 text-xs text-zinc-400">
        Arrastrá el pin o tocá el mapa para marcar el punto exacto. Si la
        búsqueda no acierta, agregale la ciudad y la provincia y probá de nuevo.
      </p>
      {etiqueta && (
        <p className="mt-1 truncate text-xs text-emerald-400" title={etiqueta}>
          {etiqueta}
        </p>
      )}
      {aviso && <p className="mt-1 text-xs text-amber-400">{aviso}</p>}
    </div>
  );
}

export default SelectorUbicacion;
