// frontend/src/screens/PublicProductView.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { formatCurrency } from '../utils/helpers';
import AppLogo from '../components/AppLogo';

const PublicProductView = () => {
  const { productId } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        if (!productId) {
          throw new Error("No se especificó un producto.");
        }
        const productRef = doc(db, 'productos', productId);
        const productSnap = await getDoc(productRef);

        if (productSnap.exists()) {
          setProduct({ id: productSnap.id, ...productSnap.data() });
        } else {
          throw new Error("Producto no encontrado.");
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId]);

  if (loading) {
    return <div className="flex justify-center items-center h-screen bg-zinc-900 text-white">Cargando...</div>;
  }

  if (error) {
    return <div className="flex justify-center items-center h-screen bg-zinc-900 text-red-500">{error}</div>;
  }

  return (
    <div className="bg-zinc-900 min-h-screen flex flex-col items-center justify-center p-4 text-white font-sans">
      <div className="w-full max-w-sm bg-zinc-800 rounded-2xl shadow-lg p-8 border border-zinc-700 text-center">
        <div className="mb-6">
          <AppLogo className="h-12 w-auto mx-auto" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">{product.nombre}</h1>
        <p className="text-zinc-400 mb-6">{product.descripcion || 'Descripción no disponible'}</p>
        
        <div className="bg-cyan-600 text-white rounded-lg p-4">
          <span className="text-lg">Precio Actual:</span>
          <h2 className="text-5xl font-extrabold tracking-tight">
            {formatCurrency(product.precio)}
          </h2>
        </div>

        {product.codigoBarras && (
          <p className="text-zinc-500 mt-6 text-sm">Código: {product.codigoBarras}</p>
        )}
      </div>
    </div>
  );
};

export default PublicProductView;