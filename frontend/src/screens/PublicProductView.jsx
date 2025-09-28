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
          throw new Error('No se especificó un producto.');
        }
        const productRef = doc(db, 'productos', productId);
        const productSnap = await getDoc(productRef);

        if (productSnap.exists()) {
          setProduct({ id: productSnap.id, ...productSnap.data() });
        } else {
          throw new Error('Producto no encontrado.');
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
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-900 text-white">
        Cargando...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-900 text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-900 p-4 font-sans text-white">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-700 bg-zinc-800 p-8 text-center shadow-lg">
        <div className="mb-6">
          <AppLogo className="mx-auto h-12 w-auto" />
        </div>
        <h1 className="mb-2 text-3xl font-bold text-white">{product.nombre}</h1>
        <p className="mb-6 text-zinc-400">
          {product.descripcion || 'Descripción no disponible'}
        </p>

        <div className="rounded-lg bg-cyan-600 p-4 text-white">
          <span className="text-lg">Precio Actual:</span>
          <h2 className="text-5xl font-extrabold tracking-tight">
            {formatCurrency(product.precio)}
          </h2>
        </div>

        {product.codigoBarras && (
          <p className="mt-6 text-sm text-zinc-500">
            Código: {product.codigoBarras}
          </p>
        )}
      </div>
    </div>
  );
};

export default PublicProductView;
