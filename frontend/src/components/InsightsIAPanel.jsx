// src/components/InsightsIAPanel.jsx
import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useAppContext } from '../context/AppContext.jsx';

function InsightsIAPanel() {
  const { ventas = [], productos = [], datosNegocio } = useAppContext();
  const [cargando, setCargando] = useState(false);
  const [respuesta, setRespuesta] = useState('');
  const [error, setError] = useState('');

  const analizar = async () => {
    setCargando(true);
    setError('');
    setRespuesta('');
    try {
      // Resumen compacto de datos (sin mandar todo, para ahorrar tokens).
      const ahora = Date.now();
      const hace30 = ahora - 30 * 24 * 60 * 60 * 1000;
      const ingresos = ventas.reduce((s, v) => s + (v.total || 0), 0);
      const ingresos30 = ventas
        .filter((v) => new Date(v.fecha || v.createdAt || 0).getTime() >= hace30)
        .reduce((s, v) => s + (v.total || 0), 0);

      const cantPorProd = {};
      ventas.forEach((v) =>
        (v.items || []).forEach((it) => {
          cantPorProd[it.nombre] =
            (cantPorProd[it.nombre] || 0) + (it.cantidad || 0);
        }),
      );
      const top = Object.entries(cantPorProd)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([n, c]) => `${n} (${c})`);

      const umbral = datosNegocio?.umbralStockBajo || 10;
      const bajos = productos
        .filter((p) => p.stock <= umbral)
        .map((p) => p.nombre)
        .slice(0, 10);
      const porVencer = productos
        .filter((p) => {
          if (!p.fechaVencimiento) return false;
          const d = Math.ceil(
            (new Date(p.fechaVencimiento) - ahora) / 86400000,
          );
          return d <= 30;
        })
        .map((p) => p.nombre)
        .slice(0, 10);

      const prompt =
        `Sos un asesor de negocios para un comercio llamado "${
          datosNegocio?.nombre || 'el negocio'
        }". Analizá estos datos y dame 3 a 5 consejos concretos, cortos y accionables en español (viñetas). ` +
        `Datos: ventas totales registradas=${ventas.length}, ingresos totales=$${ingresos.toFixed(
          0,
        )}, ingresos últimos 30 días=$${ingresos30.toFixed(0)}. ` +
        `Más vendidos: ${top.join(', ') || 'sin datos'}. ` +
        `Con stock bajo: ${bajos.join(', ') || 'ninguno'}. ` +
        `Por vencer (<=30 días): ${porVencer.join(', ') || 'ninguno'}.`;

      const { getFunctions, httpsCallable } = await import(
        'firebase/functions'
      );
      const askGemini = httpsCallable(getFunctions(), 'askGemini');
      const res = await askGemini({ prompt });
      setRespuesta(res.data?.reply || 'No se recibió respuesta.');
    } catch (e) {
      setError(e?.message || 'No se pudo generar el análisis.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
          <Sparkles className="h-5 w-5 text-indigo-400" /> Análisis con IA
        </h3>
        <button
          type="button"
          onClick={analizar}
          disabled={cargando}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
        >
          {cargando ? 'Analizando…' : 'Analizar mis ventas'}
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      {respuesta && (
        <p className="mt-3 whitespace-pre-wrap text-sm text-zinc-200">
          {respuesta}
        </p>
      )}
    </div>
  );
}

export default InsightsIAPanel;
