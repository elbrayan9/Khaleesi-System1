// frontend/src/screens/PriceCheckerView.jsx

import React, { useState, useRef, useEffect } from 'react';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../firebaseConfig';
import { motion, AnimatePresence } from 'framer-motion';
import { ScanBarcode, Search, XCircle } from 'lucide-react';
import AppLogo from '../components/AppLogo';
import ThreeBackground from '../components/ThreeBackground';

const PriceCheckerView = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [uid, setUid] = useState(undefined); // undefined = todavía no sabemos
  const [sucursales, setSucursales] = useState([]);
  const [sucursalId, setSucursalId] = useState(
    () => localStorage.getItem('verificadorSucursal') || '',
  );
  const inputRef = useRef(null);

  useEffect(() => {
    // Enfocar el input de búsqueda al cargar la página
    inputRef.current?.focus();
  }, []);

  // El verificador muestra SOLO los productos del negocio que abrió la pantalla.
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setUid(u ? u.uid : null));
  }, []);

  // Con varios locales, cada uno puede tener su precio: hay que saber cuál es
  // esta pantalla. La elección queda guardada porque el verificador se deja
  // fijo en un local.
  useEffect(() => {
    if (!uid) return;
    let cancelado = false;
    (async () => {
      try {
        const snap = await getDocs(
          query(collection(db, 'sucursales'), where('userId', '==', uid)),
        );
        if (cancelado) return;
        const lista = snap.docs.map((d) => ({
          id: d.id,
          nombre: d.data()?.nombre || 'Sucursal',
        }));
        setSucursales(lista);
        // Si la guardada ya no existe (o no hay ninguna elegida), usa la primera.
        setSucursalId((actual) => {
          const sigueExistiendo = lista.some((s) => s.id === actual);
          return sigueExistiendo ? actual : lista[0]?.id || '';
        });
      } catch (err) {
        console.error('No se pudieron cargar las sucursales:', err);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [uid]);

  useEffect(() => {
    if (sucursalId) localStorage.setItem('verificadorSucursal', sucursalId);
  }, [sucursalId]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    // Sin sesión no se puede saber de qué negocio son los precios: se cortaría
    // buscando en los productos de todos los comercios del sistema.
    if (!uid) {
      setError('Iniciá sesión en este navegador para usar el verificador.');
      return;
    }

    setLoading(true);
    setError('');
    setProduct(null);
    setNotFound(false);

    try {
      const productsRef = collection(db, 'productos');
      const termino = searchTerm.trim();

      // Busca por campo, acotado al negocio y —si hay varios locales— a la
      // sucursal elegida, porque el precio puede cambiar entre locales.
      const buscarPor = async (campo) => {
        const filtros = [where('userId', '==', uid)];
        if (sucursalId) filtros.push(where('sucursalId', '==', sucursalId));
        filtros.push(where(campo, '==', termino));
        try {
          return await getDocs(query(productsRef, ...filtros, limit(1)));
        } catch (err) {
          // Si Firestore pide un índice compuesto para esta combinación,
          // se cae a la consulta simple y se filtra la sucursal acá.
          if (!/index/i.test(err?.message || '')) throw err;
          const amplia = await getDocs(
            query(
              productsRef,
              where('userId', '==', uid),
              where(campo, '==', termino),
              limit(10),
            ),
          );
          const docs = amplia.docs.filter(
            (d) => !sucursalId || d.data()?.sucursalId === sucursalId,
          );
          return { empty: docs.length === 0, docs };
        }
      };

      // Código de barras primero; si no aparece, por nombre exacto.
      let resultado = await buscarPor('codigoBarras');
      if (resultado.empty) resultado = await buscarPor('nombre');

      if (!resultado.empty) {
        const encontrado = resultado.docs[0];
        setProduct({ id: encontrado.id, ...encontrado.data() });
      } else {
        setNotFound(true);
      }
    } catch (err) {
      console.error('Error al buscar el producto:', err);
      setError('Ocurrió un error al realizar la búsqueda.');
    } finally {
      setLoading(false);
      setSearchTerm('');
    }
  };

  // Formateador de moneda para ARS
  const currencyFormatter = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
  });

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-zinc-900 p-4 text-white">
      <ThreeBackground />

      <header className="absolute left-0 top-0 z-20 p-6">
        <div className="flex items-center gap-3">
          <AppLogo className="text-white" />
          <h1 className="text-xl font-bold">Khaleesi System</h1>
        </div>
      </header>

      <motion.div
        className="relative z-10 flex w-full max-w-2xl flex-col items-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="mb-3 text-center text-3xl font-bold tracking-tight text-zinc-200 sm:text-4xl">
          Verificador de Precios
        </h2>

        {sucursales.length > 1 ? (
          <div className="mb-6 flex items-center gap-2 text-sm">
            <span className="text-zinc-500">Precios de:</span>
            <select
              value={sucursalId}
              onChange={(e) => setSucursalId(e.target.value)}
              className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 font-semibold text-zinc-200 focus:border-blue-500 focus:outline-none"
            >
              {sucursales.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="mb-6" />
        )}

        <form onSubmit={handleSearch} className="w-full max-w-md">
          <div className="relative">
            <ScanBarcode
              className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
              size={24}
            />
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Escanea o ingresa el código"
              className="w-full rounded-full border-2 border-zinc-700 bg-zinc-800 py-4 pl-14 pr-28 text-lg text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={loading}
              className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              <Search size={20} />
              <span className="hidden sm:inline">Buscar</span>
            </button>
          </div>
        </form>

        <div className="mt-12 h-48 w-full">
          <AnimatePresence mode="wait">
            {loading && (
              <motion.div
                key="loading"
                className="flex h-full items-center justify-center"
              >
                <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-400"></div>
              </motion.div>
            )}

            {error && !loading && (
              <motion.div
                key="aviso"
                className="flex h-full flex-col items-center justify-center rounded-lg bg-amber-900/40 p-6 text-center text-amber-200"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <XCircle size={40} className="mb-3" />
                <p className="text-lg font-semibold">{error}</p>
              </motion.div>
            )}

            {notFound && !loading && !error && (
              <motion.div
                key="error"
                className="flex h-full flex-col items-center justify-center rounded-lg bg-red-900/50 p-6 text-center text-red-300"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <XCircle size={40} className="mb-3" />
                <p className="text-xl font-semibold">Producto no encontrado</p>
              </motion.div>
            )}

            {product && !loading && (
              <motion.div
                key="product"
                className="flex h-full flex-col items-center justify-center rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-6 text-center backdrop-blur-sm"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4 }}
              >
                <h3 className="text-2xl font-semibold tracking-wide text-zinc-300 sm:text-3xl">
                  {product.nombre}
                </h3>
                <p className="mt-2 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-6xl font-extrabold text-transparent sm:text-7xl">
                  {currencyFormatter.format(Number(product.precio) || 0)}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default PriceCheckerView;
