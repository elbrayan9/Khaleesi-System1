// src/components/BalanzaEnVivoModal.jsx
import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, Scale, Plug, PlugZap, Search, ImageOff } from 'lucide-react';
import { useAppContext } from '../context/AppContext.jsx';
import { useScale } from '../hooks/useScale.js';
import { formatCurrency } from '../utils/helpers.js';

function BalanzaEnVivoModal({ onClose }) {
  const { productos = [], handleAddToCart, mostrarMensaje } = useAppContext();
  const { soportado, conectado, peso, error, conectar, desconectar } =
    useScale();

  const [busqueda, setBusqueda] = useState('');
  const [seleccion, setSeleccion] = useState(null);

  // Solo productos vendidos por peso.
  const productosPeso = useMemo(
    () => productos.filter((p) => p.vendidoPor === 'peso'),
    [productos],
  );

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return productosPeso.slice(0, 20);
    return productosPeso
      .filter(
        (p) =>
          p.nombre?.toLowerCase().includes(q) ||
          p.codigoBarras?.toLowerCase().includes(q),
      )
      .slice(0, 20);
  }, [productosPeso, busqueda]);

  const precioCalculado = seleccion ? peso * (seleccion.precio || 0) : 0;

  const agregar = () => {
    if (!seleccion) {
      mostrarMensaje?.('Elegí un producto primero.', 'warning');
      return;
    }
    if (!peso || peso <= 0) {
      mostrarMensaje?.('La balanza marca 0. Apoyá el producto.', 'warning');
      return;
    }
    handleAddToCart({ ...seleccion, vendidoPor: 'peso' }, peso, 0);
    mostrarMensaje?.(
      `Agregado: ${seleccion.nombre} — ${peso} Kg`,
      'success',
    );
  };

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="w-full max-w-2xl overflow-hidden rounded-lg bg-zinc-800 shadow-xl"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
      >
        <div className="flex items-center justify-between border-b border-zinc-700 px-5 py-3">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Scale className="h-5 w-5 text-indigo-400" /> Balanza en vivo
          </h3>
          <button
            onClick={onClose}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-700 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {!soportado ? (
          <div className="p-6 text-center text-sm text-zinc-300">
            Tu navegador no soporta la conexión directa a balanza. Usá
            <strong> Chrome o Edge en una computadora</strong>. (Igual podés
            seguir usando las etiquetas de balanza escaneando el código.)
          </div>
        ) : (
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            {/* Columna izquierda: conexión + peso + producto elegido */}
            <div className="flex flex-col gap-3">
              {!conectado ? (
                <button
                  onClick={conectar}
                  className="flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-500"
                >
                  <Plug className="h-4 w-4" /> Conectar balanza
                </button>
              ) : (
                <button
                  onClick={desconectar}
                  className="flex items-center justify-center gap-2 rounded-md bg-zinc-600 px-4 py-2 font-semibold text-white hover:bg-zinc-500"
                >
                  <PlugZap className="h-4 w-4" /> Desconectar
                </button>
              )}

              {error && <p className="text-xs text-red-400">{error}</p>}

              {/* Peso en vivo */}
              <div className="rounded-lg bg-zinc-900 p-4 text-center">
                <p className="text-xs uppercase tracking-wider text-zinc-500">
                  Peso
                </p>
                <p className="text-4xl font-bold tabular-nums text-white">
                  {conectado ? peso.toFixed(3) : '—'}
                  <span className="ml-1 text-lg text-zinc-400">Kg</span>
                </p>
              </div>

              {/* Producto elegido: foto + precio */}
              <div className="rounded-lg border border-zinc-700 bg-zinc-900/50 p-3">
                {seleccion ? (
                  <div className="flex items-center gap-3">
                    {seleccion.imagenUrl ? (
                      <img
                        src={seleccion.imagenUrl}
                        alt={seleccion.nombre}
                        className="h-16 w-16 rounded object-cover ring-1 ring-zinc-700"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded bg-zinc-700 text-zinc-500">
                        <ImageOff className="h-6 w-6" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-white">
                        {seleccion.nombre}
                      </p>
                      <p className="text-xs text-zinc-400">
                        ${formatCurrency(seleccion.precio)} / Kg
                      </p>
                      <p className="text-lg font-bold text-emerald-400">
                        ${formatCurrency(precioCalculado)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="py-4 text-center text-sm text-zinc-500">
                    Elegí un producto de la lista →
                  </p>
                )}
              </div>

              <button
                onClick={agregar}
                disabled={!seleccion || !conectado || peso <= 0}
                className="rounded-md bg-emerald-600 px-4 py-2.5 font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Agregar al carrito
              </button>
            </div>

            {/* Columna derecha: buscador de productos por peso */}
            <div className="flex flex-col gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-zinc-500" />
                <input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar producto por peso…"
                  className="w-full rounded-md border border-zinc-600 bg-zinc-700 py-2 pl-8 pr-2 text-sm text-zinc-100 placeholder-zinc-400"
                />
              </div>
              <div className="max-h-64 space-y-1 overflow-y-auto">
                {filtrados.length === 0 ? (
                  <p className="py-6 text-center text-xs text-zinc-500">
                    No hay productos "por peso". Marcá el producto como
                    <strong> Vendido por: Peso (Kg)</strong> en Productos.
                  </p>
                ) : (
                  filtrados.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSeleccion(p)}
                      className={`flex w-full items-center gap-2 rounded-md p-2 text-left text-sm hover:bg-zinc-700 ${
                        seleccion?.id === p.id
                          ? 'bg-indigo-600/20 ring-1 ring-indigo-500'
                          : 'bg-zinc-900/40'
                      }`}
                    >
                      {p.imagenUrl ? (
                        <img
                          src={p.imagenUrl}
                          alt={p.nombre}
                          className="h-9 w-9 rounded object-cover"
                        />
                      ) : (
                        <div className="h-9 w-9 rounded bg-zinc-700" />
                      )}
                      <span className="min-w-0 flex-1 truncate text-zinc-200">
                        {p.nombre}
                      </span>
                      <span className="text-xs text-zinc-400">
                        ${formatCurrency(p.precio)}/Kg
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

export default BalanzaEnVivoModal;
