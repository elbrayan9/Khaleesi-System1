// frontend/src/screens/PriceCheckerView.jsx
import React, { useState, useRef, useEffect } from 'react';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { formatCurrency } from '../utils/helpers';
import AppLogo from '../components/AppLogo';
import { motion, AnimatePresence } from 'framer-motion';
import { ScanLine, Search, XCircle } from 'lucide-react';

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
      let q = query(productsRef, where('codigoBarras', '==', searchTerm.trim()), limit(1));
      let querySnapshot = await getDocs(q);
      
      // Si no se encuentra por código de barras, busca por nombre
      if (querySnapshot.empty) {
        q = query(productsRef, where('nombre', '==', searchTerm.trim()), limit(1));
        querySnapshot = await getDocs(q);
      }

      if (!querySnapshot.empty) {
        const foundProduct = querySnapshot.docs[0].data();
        setProduct(foundProduct);
      } else {
        setNotFound(true);
      }
    } catch (err) {
      console.error("Error al buscar el producto:", err);
      setError('Ocurrió un error al conectar con la base de datos.');
    } finally {
      setLoading(false);
      setSearchTerm(''); // Limpiar el input después de la búsqueda
    }
  };

  return (
    <div className="bg-zinc-900 min-h-screen flex flex-col items-center justify-center p-4 text-white font-sans">
      <div className="w-full max-w-md bg-zinc-800 rounded-2xl shadow-lg p-8 border border-zinc-700">
        <div className="text-center mb-6">
          <AppLogo className="h-10 w-auto mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white">Verificador de Precios</h1>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2 mb-6">
          <div className="relative flex-grow">
            <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Escanear o ingresar código..."
              className="w-full bg-zinc-700 text-white p-3 pl-10 rounded-md border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <button type="submit" className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold p-3 rounded-md" disabled={loading}>
            <Search className="h-5 w-5" />
          </button>
        </form>

        <div className="h-48 flex items-center justify-center">
          <AnimatePresence mode="wait">
            {loading && <motion.div key="loading">Cargando...</motion.div>}
            {error && <motion.div key="error" className="text-red-500">{error}</motion.div>}
            {notFound && (
              <motion.div
                key="notfound"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-center text-red-400"
              >
                <XCircle className="h-12 w-12 mx-auto mb-2" />
                <p className="font-semibold">Producto no encontrado</p>
              </motion.div>
            )}
            {product && (
              <motion.div
                key="product"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="text-center w-full"
              >
                <h2 className="text-3xl font-bold text-white mb-2">{product.nombre}</h2>
                <div className="bg-green-600 text-white rounded-lg p-4 inline-block">
                  <span className="text-lg">Precio:</span>
                  <h3 className="text-5xl font-extrabold tracking-tight">
                    {formatCurrency(product.precio)}
                  </h3>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default PriceCheckerView;