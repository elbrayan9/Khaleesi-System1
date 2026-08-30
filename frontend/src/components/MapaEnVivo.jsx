// src/components/MapaEnVivo.jsx
//
// El mapa del pedido: Leaflet + OpenStreetMap (gratis, sin API key). El CSS se
// importa del paquete y no por CDN, para no tocar la CSP.
//
// Antes esto dibujaba un marcador y lo movía con `setLatLng` en cuanto llegaba
// una posición nueva. Como las posiciones llegan cada 15-23 segundos, el
// repartidor daba un salto y se quedaba quieto: se leía como una pantalla
// trabada más que como un seguimiento en vivo.
//
// Ahora el marcador se anima, y el detalle está en cuánto dura esa animación.
// Ver `estimarIntervalo` en utils/geo.js: el tramo se estira hasta que se
// espera el dato siguiente, así el vehículo está SIEMPRE en movimiento. Queda
// mostrando una posición de hace unos segundos, que es exactamente lo que hacen
// las apps de reparto: el ojo lee el movimiento continuo como "en vivo" y una
// posición congelada como "roto".
//
// Todos los datos son opcionales: dibuja lo que tenga. Sin local ni destino se
// comporta igual que la versión vieja.

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Crosshair } from 'lucide-react';
import {
  distanciaMetros,
  bearing,
  interpolar,
  estimarIntervalo,
  esPunto,
  puntoSobreRuta,
  indiceMasCercano,
} from '../utils/geo.js';
import { decodificarPolilinea } from '../utils/polilinea.js';

// Más que esto no es un movimiento: es un rebote del GPS o la app que se
// reabrió después de un rato. Animar tres kilómetros en veinte segundos daría
// una velocidad absurda, así que en ese caso el marcador aparece y ya.
const SALTO_SIN_ANIMAR_M = 500;

// Marcador propio: los íconos por defecto de Leaflet apuntan a archivos que el
// bundler no resuelve, así que se arma con HTML.
const marcador = (color, emoji, id) =>
  L.divIcon({
    className: '',
    html: `<div id="${id || ''}" style="background:${color};width:30px;height:30px;border-radius:50%;
      display:flex;align-items:center;justify-content:center;font-size:15px;
      box-shadow:0 2px 6px rgba(0,0,0,.4);border:2px solid #fff">${emoji}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });

function MapaEnVivo({
  repartidor = null, // { lat, lng } — se mueve
  local = null, // { lat, lng } — de dónde salió
  destino = null, // { lat, lng } — a dónde va
  ruta = null, // polilínea codificada del recorrido
  etiqueta = 'Repartidor',
  alto = 240,
}) {
  const contenedor = useRef(null);
  const mapa = useRef(null);
  const capas = useRef({
    repartidor: null,
    local: null,
    destino: null,
    hecho: null,
    falta: null,
  });
  // La ruta decodificada, para no rehacer la cuenta en cada cuadro.
  const puntosRuta = useRef([]);

  // El tramo que se está animando y el ritmo al que vienen las posiciones.
  const tween = useRef({ desde: null, hasta: null, t0: 0, duracion: 0 });
  // El pedacito de ruta que se está recorriendo en este tramo, si la hay.
  const tramoDeRuta = useRef(null);
  const historial = useRef({ ultimoTs: 0, gaps: [] });
  const raf = useRef(null);

  // Si la persona movió el mapa, deja de seguirla sola: nada más molesto que
  // estar mirando una cuadra y que la cámara te arrastre a otro lado.
  const [siguiendo, setSiguiendo] = useState(true);
  const siguiendoRef = useRef(true);
  // Encuadrar también dispara los eventos de movimiento del mapa. Sin esta
  // bandera, el propio componente se "auto-suelta" al arrancar y el chip de
  // Centrar aparecía sin que nadie hubiera tocado nada.
  const movimientoPropio = useRef(false);
  useEffect(() => {
    siguiendoRef.current = siguiendo;
  }, [siguiendo]);

  // --- Creación del mapa (una sola vez) ---
  useEffect(() => {
    if (!contenedor.current || mapa.current) return undefined;

    const centro = repartidor || destino || local || { lat: -34.6, lng: -58.4 };
    mapa.current = L.map(contenedor.current, {
      zoomControl: false,
      attributionControl: true,
    }).setView([centro.lat, centro.lng], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap',
    }).addTo(mapa.current);

    const soltar = () => {
      if (movimientoPropio.current) return;
      setSiguiendo(false);
    };
    mapa.current.on('dragstart', soltar);
    mapa.current.on('zoomstart', soltar);

    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      mapa.current?.remove();
      mapa.current = null;
      capas.current = { repartidor: null, local: null, destino: null };
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Los puntos fijos: el local y la casa del cliente ---
  useEffect(() => {
    if (!mapa.current) return;
    const fijo = (clave, punto, color, emoji, titulo) => {
      if (!esPunto(punto)) {
        if (capas.current[clave]) {
          capas.current[clave].remove();
          capas.current[clave] = null;
        }
        return;
      }
      if (capas.current[clave]) {
        capas.current[clave].setLatLng([punto.lat, punto.lng]);
        return;
      }
      capas.current[clave] = L.marker([punto.lat, punto.lng], {
        icon: marcador(color, emoji),
      })
        .addTo(mapa.current)
        .bindTooltip(titulo);
    };

    fijo('local', local, '#059669', '🏪', 'El local');
    fijo('destino', destino, '#dc2626', '📍', 'Tu dirección');
  }, [local, destino]);

  // --- El recorrido por las calles ---
  useEffect(() => {
    if (!mapa.current) return;
    puntosRuta.current = decodificarPolilinea(ruta);

    ['hecho', 'falta'].forEach((k) => {
      if (capas.current[k]) {
        capas.current[k].remove();
        capas.current[k] = null;
      }
    });
    if (puntosRuta.current.length < 2) return;

    // Dos líneas y no una: lo ya recorrido va tenue y lo que falta resaltado.
    // Es un detalle chico que cambia mucho la lectura, porque se ve de un
    // vistazo cuánto del viaje queda.
    const coords = puntosRuta.current.map((p) => [p.lat, p.lng]);
    capas.current.hecho = L.polyline(coords, {
      color: '#71717a',
      weight: 4,
      opacity: 0.5,
    }).addTo(mapa.current);
    capas.current.falta = L.polyline(coords, {
      color: '#2563eb',
      weight: 5,
      opacity: 0.85,
    }).addTo(mapa.current);
    partirRuta();
    encuadrar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ruta]);

  /** Corta la línea a la altura del repartidor. */
  function partirRuta() {
    const puntos = puntosRuta.current;
    if (!capas.current.falta || puntos.length < 2) return;
    const marca = capas.current.repartidor;
    if (!marca) return;
    const p = marca.getLatLng();
    const i = indiceMasCercano(puntos, { lat: p.lat, lng: p.lng });
    capas.current.falta.setLatLngs(puntos.slice(i).map((q) => [q.lat, q.lng]));
  }

  // --- El repartidor, que es el que se mueve ---
  useEffect(() => {
    if (!mapa.current || !esPunto(repartidor)) return;

    // Primera posición: aparece donde está, sin animar.
    if (!capas.current.repartidor) {
      capas.current.repartidor = L.marker([repartidor.lat, repartidor.lng], {
        icon: marcador('#2563eb', '🛵'),
      })
        .addTo(mapa.current)
        .bindTooltip(etiqueta);
      tween.current = {
        desde: repartidor,
        hasta: repartidor,
        t0: 0,
        duracion: 0,
      };
      historial.current.ultimoTs = Date.now();
      encuadrar();
      return;
    }

    const actual = posicionActual();
    const salto = distanciaMetros(actual, repartidor);
    if (salto < 1) return; // la misma posición otra vez: nada que hacer

    // Se anota cuánto tardó en llegar este dato, que es lo que decide cuánto
    // dura la animación del tramo.
    const ahora = Date.now();
    if (historial.current.ultimoTs) {
      historial.current.gaps.push(ahora - historial.current.ultimoTs);
      historial.current.gaps = historial.current.gaps.slice(-3);
    }
    historial.current.ultimoTs = ahora;

    if (salto > SALTO_SIN_ANIMAR_M) {
      capas.current.repartidor.setLatLng([repartidor.lat, repartidor.lng]);
      tween.current = {
        desde: repartidor,
        hasta: repartidor,
        t0: 0,
        duracion: 0,
      };
      seguirCamara(repartidor);
      return;
    }

    tramoDeRuta.current = tramoEntre(actual, repartidor);
    orientarIcono(actual, repartidor);
    // No se cancela la animación en curso: se le reescribe el destino desde
    // donde está ahora, así el marcador no pega un tirón al empalmar tramos.
    tween.current = {
      desde: actual,
      hasta: repartidor,
      t0: performance.now(),
      duracion: estimarIntervalo(historial.current.gaps),
    };
    arrancarAnimacion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repartidor?.lat, repartidor?.lng]);

  /**
   * El pedazo de ruta que va de un punto al otro.
   *
   * Devuelve null si no hay ruta o si los dos puntos caen en el mismo vértice:
   * ahí no hay nada que seguir y conviene la línea derecha de siempre.
   */
  function tramoEntre(desde, hasta) {
    const puntos = puntosRuta.current;
    if (puntos.length < 2) return null;
    const i = indiceMasCercano(puntos, desde);
    const j = indiceMasCercano(puntos, hasta);
    if (j <= i) return null;
    return [desde, ...puntos.slice(i + 1, j + 1), hasta];
  }

  function posicionActual() {
    const m = capas.current.repartidor;
    if (!m) return tween.current.hasta;
    const p = m.getLatLng();
    return { lat: p.lat, lng: p.lng };
  }

  // El emoji del scooter mira a la derecha. Rotarlo lo dejaría patas para
  // arriba, así que solo se espeja cuando el viaje va hacia el oeste.
  function orientarIcono(desde, hasta) {
    const el = capas.current.repartidor?.getElement()?.firstChild;
    if (!el) return;
    const rumbo = bearing(desde, hasta);
    el.style.transform = rumbo > 180 ? 'scaleX(-1)' : 'none';
  }

  function arrancarAnimacion() {
    if (raf.current) return; // ya hay un bucle andando
    const paso = () => {
      const { desde, hasta, t0, duracion } = tween.current;
      const marca = capas.current.repartidor;
      if (!marca || !desde || !hasta || !duracion) {
        raf.current = null;
        return;
      }
      // Avance lineal a propósito: un repartidor no acelera y frena en cada
      // tramo de veinte segundos, y el ease-in-out se lee como falso.
      const t = Math.min(1, (performance.now() - t0) / duracion);
      // Con la ruta cargada, el marcador recorre las calles en vez de cortar en
      // diagonal por las manzanas. Es la mejora que más se nota, y sale gratis
      // porque la ruta ya está dibujada.
      const p = tramoDeRuta.current
        ? puntoSobreRuta(tramoDeRuta.current, t)
        : interpolar(desde, hasta, t);
      if (!p) {
        raf.current = null;
        return;
      }
      marca.setLatLng([p.lat, p.lng]);
      partirRuta();
      seguirCamara(p);

      if (t < 1) {
        raf.current = requestAnimationFrame(paso);
      } else {
        raf.current = null;
      }
    };
    raf.current = requestAnimationFrame(paso);
  }

  function seguirCamara(p) {
    if (!siguiendoRef.current || !mapa.current) return;
    movimientoPropio.current = true;
    mapa.current.panTo([p.lat, p.lng], { animate: false });
    movimientoPropio.current = false;
  }

  // Con más de un punto, el encuadre los muestra a todos; con uno solo, se
  // centra en él.
  function encuadrar() {
    if (!mapa.current) return;
    const puntos = [repartidor, local, destino]
      .filter(esPunto)
      .map((p) => [p.lat, p.lng]);
    // Con recorrido dibujado, el encuadre lo abarca entero: si no, una ruta que
    // rodea puede salirse de la pantalla.
    puntosRuta.current.forEach((p) => puntos.push([p.lat, p.lng]));
    if (puntos.length === 0) return;

    // Sin animación: así Leaflet emite sus eventos dentro de esta misma
    // llamada y la bandera alcanza a cubrirlos.
    movimientoPropio.current = true;
    if (puntos.length > 1) {
      mapa.current.fitBounds(puntos, {
        padding: [40, 40],
        maxZoom: 16,
        animate: false,
      });
    } else {
      mapa.current.setView(puntos[0], 15, { animate: false });
    }
    movimientoPropio.current = false;
  }

  return (
    <div className="relative">
      <div
        ref={contenedor}
        style={{ height: alto }}
        className="w-full overflow-hidden rounded-xl border border-zinc-700"
      />
      {!siguiendo && (
        <button
          type="button"
          onClick={() => {
            setSiguiendo(true);
            encuadrar();
          }}
          className="absolute bottom-3 right-3 z-[400] flex items-center gap-1.5 rounded-full bg-zinc-900/90 px-3 py-1.5 text-xs font-medium text-white shadow-lg ring-1 ring-white/20 backdrop-blur"
        >
          <Crosshair className="h-3.5 w-3.5" />
          Centrar
        </button>
      )}
    </div>
  );
}

export default MapaEnVivo;
