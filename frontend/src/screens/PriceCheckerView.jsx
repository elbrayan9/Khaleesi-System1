// frontend/src/screens/PriceCheckerView.jsx

import React, { useState, useRef, useEffect } from 'react';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { formatCurrency } from '../utils/helpers';
import { motion, AnimatePresence } from 'framer-motion';
import { ScanBarcode, Search, XCircle } from 'lucide-react';
import AppLogo from '../components/AppLogo';
import ParticleBackground from '../components/ParticleBackground';

const PriceCheckerView = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    // Enfocar el input de búsqueda al cargar la página
    inputRef.current?.focus();
  }, []);

  // SE UTILIZA TU LÓGICA DE BÚSQUEDA ORIGINAL
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    setLoading(true);
    setError('');
    setProduct(null);
    setNotFound(false);

    try {
      const productsRef = collection(db, 'productos');
      // Búsqueda por código de barras (prioridad)
      let q = query(
        productsRef,
        where('codigoBarras', '==', searchTerm.trim()),
        limit(1),
      );
      let querySnapshot = await getDocs(q);

      // Si no se encuentra por código de barras, busca por nombre
      if (querySnapshot.empty) {
        q = query(
          productsRef,
          where('nombre', '==', searchTerm.trim()),
          limit(1),
        );
        querySnapshot = await getDocs(q);
      }

      if (!querySnapshot.empty) {
        const productData = querySnapshot.docs[0].data();
        setProduct({ id: querySnapshot.docs[0].id, ...productData });
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
      <ParticleBackground />

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
        <h2 className="mb-8 text-center text-3xl font-bold tracking-tight text-zinc-200 sm:text-4xl">
          Verificador de Precios
        </h2>

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

            {notFound && !loading && (
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
                  {/* Se usa tu función original formatCurrency si existe, si no, el formateador estándar */}
                  {typeof formatCurrency === 'function'
                    ? formatCurrency(product.precio)
                    : currencyFormatter.format(product.precio)}
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
