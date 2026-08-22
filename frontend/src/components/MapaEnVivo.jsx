// src/components/MapaEnVivo.jsx
//
// Mapa con Leaflet + OpenStreetMap (gratis, sin API key). Se usa para seguir al
// repartidor. El CSS se importa del paquete, no por CDN, para no tocar la CSP.

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Marcador propio: los íconos por defecto de Leaflet apuntan a archivos que el
// bundler no resuelve, así que usamos uno hecho con HTML.
const marcador = (color, emoji) =>
  L.divIcon({
    className: '',
    html: `<div style="background:${color};width:30px;height:30px;border-radius:50%;
      display:flex;align-items:center;justify-content:center;font-size:15px;
      box-shadow:0 2px 6px rgba(0,0,0,.4);border:2px solid #fff">${emoji}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });

function MapaEnVivo({ lat, lng, etiqueta = 'Repartidor', alto = 220 }) {
  const contenedor = useRef(null);
  const mapa = useRef(null);
  const punto = useRef(null);

  useEffect(() => {
    if (!contenedor.current || mapa.current) return;
    mapa.current = L.map(contenedor.current, {
      zoomControl: false,
      attributionControl: true,
    }).setView([lat, lng], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap',
    }).addTo(mapa.current);
    punto.current = L.marker([lat, lng], {
      icon: marcador('#2563eb', '🛵'),
    })
      .addTo(mapa.current)
      .bindTooltip(etiqueta);

    return () => {
      mapa.current?.remove();
      mapa.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mover el marcador cuando llega una posición nueva.
  useEffect(() => {
    if (!mapa.current || !punto.current) return;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    punto.current.setLatLng([lat, lng]);
    mapa.current.panTo([lat, lng]);
  }, [lat, lng]);

  return (
    <div
      ref={contenedor}
      style={{ height: alto }}
      className="w-full overflow-hidden rounded-xl border border-zinc-700"
    />
  );
}

export default MapaEnVivo;
