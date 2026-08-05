// src/components/CargarFacturaModal.jsx
//
// Sacás una foto a la factura/remito del proveedor y la IA (Gemini) extrae los
// productos. Revisás y aplicás: suma stock a los existentes o crea los nuevos.

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Upload } from 'lucide-react';
import { useAppContext } from '../context/AppContext.jsx';
import { resizeImage } from '../utils/image.js';
import { addProducto, updateProducto } from '../services/firestoreService';

function CargarFacturaModal({ onClose }) {
  const {
    productos = [],
    currentUser,
    sucursalActual,
    mostrarMensaje,
  } = useAppContext();
  const [fase, setFase] = useState('subir'); // subir | procesando | revisar | aplicando
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFase('procesando');
    setError('');
    try {
      const blob = await resizeImage(file, 1500, 0.85);
      const base64 = await new Promise((res, rej) => {
        const fr = new FileReader();
        fr.onload = () => res(String(fr.result).split(',')[1]);
        fr.onerror = rej;
        fr.readAsDataURL(blob);
      });
      const { getFunctions, httpsCallable } = await import(
        'firebase/functions'
      );
      const fn = httpsCallable(getFunctions(), 'leerFacturaProveedor');
      const res = await fn({ imageBase64: base64, mimeType: 'image/jpeg' });
      const data = (res.data?.items || []).map((it) => ({
        ...it,
        incluir: true,
      }));
      if (data.length === 0) {
        setError('No se detectaron productos. Probá con una foto más nítida.');
        setFase('subir');
        return;
      }
      setItems(data);
      setFase('revisar');
    } catch (err) {
      setError(err?.message || 'No se pudo leer la factura.');
      setFase('subir');
    }
  };

  const setItem = (i, campo, val) =>
    setItems((prev) =>
      prev.map((it, k) => (k === i ? { ...it, [campo]: val } : it)),
    );

  const aplicar = async () => {
    const incluidos = items.filter(
      (it) => it.incluir && it.nombre && Number(it.cantidad) > 0,
    );
    if (incluidos.length === 0) {
      mostrarMensaje?.('No hay items para aplicar.', 'warning');
      return;
    }
    setFase('aplicando');
    let ok = 0;
    for (const it of incluidos) {
      const existente = productos.find(
        (p) =>
          String(p.nombre || '')
            .trim()
            .toLowerCase() === it.nombre.trim().toLowerCase(),
      );
      try {
        if (existente) {
          // eslint-disable-next-line no-await-in-loop
          await updateProducto(existente.id, {
            stock: (Number(existente.stock) || 0) + Number(it.cantidad),
            costo: Number(it.costo) || existente.costo || 0,
          });
        } else {
          // eslint-disable-next-line no-await-in-loop
          await addProducto(
            currentUser?.uid,
            {
              nombre: it.nombre,
              costo: Number(it.costo) || 0,
              precio: Number(it.costo) || 0,
              stock: Number(it.cantidad),
              vendidoPor: 'unidad',
            },
            sucursalActual?.id,
          );
        }
        ok += 1;
      } catch (_) {
        /* seguimos con el resto */
      }
    }
    mostrarMensaje?.(
      `Listo: ${ok} producto(s) cargados/actualizados.`,
      'success',
    );
    onClose?.();
  };

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-zinc-800 shadow-xl"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <div className="flex items-center justify-between border-b border-zinc-700 px-5 py-3">
          <h3 className="text-lg font-semibold text-white">
            Cargar factura del proveedor
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-700 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-5">
          {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

          {fase === 'subir' && (
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-zinc-600 p-8 text-center hover:border-blue-500">
              <Upload className="h-8 w-8 text-blue-400" />
              <span className="font-semibold text-white">
                Sacá o subí una foto de la factura
              </span>
              <span className="text-xs text-zinc-400">
                La IA lee los productos y cantidades.
              </span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={onFile}
              />
            </label>
          )}

          {fase === 'procesando' && (
            <p className="py-10 text-center text-sm text-zinc-400">
              Leyendo la factura con IA… (unos segundos)
            </p>
          )}

          {fase === 'aplicando' && (
            <p className="py-10 text-center text-sm text-zinc-400">
              Cargando productos…
            </p>
          )}

          {fase === 'revisar' && (
            <div>
              <p className="mb-2 text-sm text-zinc-300">
                Revisá y corregí lo que haga falta. Los que ya existen suman
                stock; los nuevos se crean (poné el precio de venta después).
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase text-zinc-500">
                      <th className="p-1">✓</th>
                      <th className="p-1">Producto</th>
                      <th className="p-1 text-center">Cant.</th>
                      <th className="p-1 text-right">Costo u.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, i) => (
                      <tr key={i} className="border-t border-zinc-700">
                        <td className="p-1">
                          <input
                            type="checkbox"
                            checked={it.incluir}
                            onChange={(e) =>
                              setItem(i, 'incluir', e.target.checked)
                            }
                          />
                        </td>
                        <td className="p-1">
                          <input
                            value={it.nombre}
                            onChange={(e) => setItem(i, 'nombre', e.target.value)}
                            className="w-full rounded bg-zinc-700 px-2 py-1 text-white"
                          />
                        </td>
                        <td className="p-1">
                          <input
                            type="number"
                            value={it.cantidad}
                            onChange={(e) =>
                              setItem(i, 'cantidad', e.target.value)
                            }
                            className="w-16 rounded bg-zinc-700 px-2 py-1 text-center text-white"
                          />
                        </td>
                        <td className="p-1">
                          <input
                            type="number"
                            value={it.costo}
                            onChange={(e) => setItem(i, 'costo', e.target.value)}
                            className="w-20 rounded bg-zinc-700 px-2 py-1 text-right text-white"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {fase === 'revisar' && (
          <div className="border-t border-zinc-700 p-4 text-right">
            <button
              type="button"
              onClick={aplicar}
              className="rounded-md bg-green-600 px-5 py-2 font-semibold text-white hover:bg-green-700"
            >
              Aplicar al inventario
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

export default CargarFacturaModal;
