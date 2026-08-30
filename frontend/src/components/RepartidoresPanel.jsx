// src/components/RepartidoresPanel.jsx
//
// Alta y gestión de repartidores desde el POS. Cada uno recibe un link propio
// con su token: lo abre en el celular y ya está, sin usuario ni contraseña.

import React, { useEffect, useState } from 'react';
import {
  collection,
  onSnapshot,
  query,
  where,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAppContext } from '../context/AppContext.jsx';
import { Bike, Copy, Trash2, UserPlus, Share2 } from 'lucide-react';
import { telefonoWhatsapp } from '../utils/telefono.js';

function RepartidoresPanel() {
  const { currentUser, sucursalActual, mostrarMensaje } = useAppContext();
  const [repartidores, setRepartidores] = useState([]);
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!currentUser?.uid || !sucursalActual?.id) return undefined;
    const q = query(
      collection(db, 'repartidores'),
      where('userId', '==', currentUser.uid),
      where('sucursalId', '==', sucursalActual.id),
    );
    const unsub = onSnapshot(
      q,
      (snap) =>
        setRepartidores(
          snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((r) => r.activo !== false),
        ),
      (e) => console.error('Error escuchando repartidores:', e),
    );
    return () => unsub();
  }, [currentUser, sucursalActual]);

  const linkDe = (r) => `${window.location.origin}/repartidor/${r.accessToken}`;

  const agregar = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) {
      mostrarMensaje?.('Poné el nombre del repartidor.', 'warning');
      return;
    }
    setGuardando(true);
    try {
      const accessToken =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}_${Math.random().toString(36).slice(2)}`;
      await addDoc(collection(db, 'repartidores'), {
        userId: currentUser.uid,
        sucursalId: sucursalActual.id,
        nombre: nombre.trim(),
        telefono: telefono.replace(/\D/g, ''),
        accessToken,
        activo: true,
        online: false,
        vehiculo: null,
        ubicacion: null,
        createdAt: serverTimestamp(),
      });
      setNombre('');
      setTelefono('');
      mostrarMensaje?.('Repartidor agregado. Mandale su link.', 'success');
    } catch (err) {
      mostrarMensaje?.(err.message || 'No se pudo agregar.', 'error');
    } finally {
      setGuardando(false);
    }
  };

  const copiar = (r) => {
    navigator.clipboard
      ?.writeText(linkDe(r))
      .then(() => mostrarMensaje?.('Link copiado.', 'success'))
      .catch(() => {});
  };

  const porWhatsapp = (r) => {
    const tel = telefonoWhatsapp(r.telefono);
    if (!tel) {
      mostrarMensaje?.(`${r.nombre} no tiene teléfono cargado.`, 'warning');
      return;
    }
    const texto =
      `Hola ${r.nombre}! Este es tu acceso para recibir los pedidos:\n${linkDe(r)}\n\n` +
      'Abrilo en el celular y agregalo a la pantalla de inicio.';
    window.open(
      `https://wa.me/${tel}?text=${encodeURIComponent(texto)}`,
      '_blank',
      'noopener,noreferrer',
    );
  };

  const quitar = async (r) => {
    try {
      await updateDoc(doc(db, 'repartidores', r.id), { activo: false });
      mostrarMensaje?.('Repartidor dado de baja.', 'success');
    } catch (err) {
      mostrarMensaje?.(err.message || 'No se pudo dar de baja.', 'error');
    }
  };

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-800 p-4">
      <h3 className="mb-3 flex items-center gap-2 font-semibold text-white">
        <Bike className="h-5 w-5 text-blue-400" /> Repartidores
      </h3>

      <form onSubmit={agregar} className="mb-3 flex flex-wrap gap-2">
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre"
          className="min-w-0 flex-1 rounded-md border border-zinc-600 bg-zinc-700 px-3 py-2 text-sm text-white placeholder-zinc-400"
        />
        <input
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          placeholder="WhatsApp"
          inputMode="tel"
          className="w-32 rounded-md border border-zinc-600 bg-zinc-700 px-3 py-2 text-sm text-white placeholder-zinc-400"
        />
        <button
          type="submit"
          disabled={guardando}
          className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
        >
          <UserPlus className="h-4 w-4" /> Agregar
        </button>
      </form>

      {repartidores.length === 0 ? (
        <p className="py-4 text-center text-xs text-zinc-500">
          Todavía no cargaste repartidores.
        </p>
      ) : (
        <div className="space-y-2">
          {repartidores.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between gap-2 rounded-lg bg-zinc-900/50 p-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">
                  {r.nombre}
                  <span
                    className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      r.online
                        ? 'bg-green-500/20 text-green-300'
                        : 'bg-zinc-700 text-zinc-400'
                    }`}
                  >
                    {r.online ? 'Online' : 'Offline'}
                  </span>
                </p>
                <p className="truncate text-[11px] text-zinc-500">
                  {r.telefono || 'sin teléfono'}
                </p>
              </div>
              <div className="flex flex-none gap-1">
                {r.telefono && (
                  <button
                    type="button"
                    onClick={() => porWhatsapp(r)}
                    title="Enviar link por WhatsApp"
                    className="rounded p-1.5 text-green-400 hover:bg-zinc-700"
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => copiar(r)}
                  title="Copiar link"
                  className="rounded p-1.5 text-zinc-300 hover:bg-zinc-700"
                >
                  <Copy className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => quitar(r)}
                  title="Dar de baja"
                  className="rounded p-1.5 text-red-400 hover:bg-zinc-700"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default RepartidoresPanel;
