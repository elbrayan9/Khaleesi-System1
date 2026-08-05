// src/components/ProductForm.jsx
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ImagePlus, X, Search, Camera } from 'lucide-react';
import { useAppContext } from '../context/AppContext'; // Importar hook
import { subirImagenProducto } from '../services/storageService';
import { buscarDatosProducto } from '../services/productLookup';
import EscanerNombreModal from './EscanerNombreModal.jsx';

// Redimensiona/comprime una imagen a máx 800px y JPEG, para que Storage quede
// liviano y la carga sea rápida. Si algo falla, devuelve el archivo original.
const resizeImage = (file, maxSize = 800) =>
  new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      let { width, height } = img;
      if (width > height && width > maxSize) {
        height = Math.round((height * maxSize) / width);
        width = maxSize;
      } else if (height > maxSize) {
        width = Math.round((width * maxSize) / height);
        height = maxSize;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => resolve(blob || file), 'image/jpeg', 0.8);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });

function ProductForm({ onSave, productToEdit, onCancelEdit, initialBarcode }) {
  // mostrarMensaje ya no es prop
  const { mostrarMensaje, currentUser } = useAppContext(); // contexto

  const [nombre, setNombre] = useState('');
  const [codigoBarras, setCodigoBarras] = useState('');
  const [precio, setPrecio] = useState('');
  const [costo, setCosto] = useState('');
  const [stock, setStock] = useState('');
  const [increasePercentage, setIncreasePercentage] = useState('');
  const barcodeInputRef = useRef(null);
  const [categoria, setCategoria] = useState('');
  const [vendidoPor, setVendidoPor] = useState('unidad');
  const [imagenUrl, setImagenUrl] = useState(''); // URL guardada (edición)
  const [imagenFile, setImagenFile] = useState(null); // archivo nuevo a subir
  const [preview, setPreview] = useState(''); // lo que se muestra
  const [subiendo, setSubiendo] = useState(false);
  const [favorito, setFavorito] = useState(false); // acceso rápido en la venta
  const [fechaVencimiento, setFechaVencimiento] = useState(''); // opcional
  const [descuentoPromo, setDescuentoPromo] = useState(''); // % promo opcional
  const [buscando, setBuscando] = useState(false); // lookup por código
  const [showNombreOCR, setShowNombreOCR] = useState(false); // OCR del nombre

  // Trae nombre/foto del código desde la base pública (Open Food Facts).
  const buscarDatos = async (codeArg) => {
    const c = String(codeArg || codigoBarras || '').trim();
    if (!c) return;
    setBuscando(true);
    try {
      const info = await buscarDatosProducto(c);
      if (info && info.nombre) {
        setNombre((prev) => prev || info.nombre);
        if (info.imagenUrl && !imagenUrl && !imagenFile) {
          setImagenUrl(info.imagenUrl);
          setPreview(info.imagenUrl);
        }
        mostrarMensaje?.('Datos encontrados y cargados.', 'success');
      } else {
        mostrarMensaje?.(
          'No se encontraron datos para ese código. Completá a mano.',
          'info',
        );
      }
    } finally {
      setBuscando(false);
    }
  };

  // Al llegar un código nuevo por escaneo, busca los datos solo.
  useEffect(() => {
    if (initialBarcode && !productToEdit) buscarDatos(initialBarcode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialBarcode]);

  const handleApplyPercentage = () => {
    const percentage = parseFloat(increasePercentage);
    const currentPrice = parseFloat(precio);

    if (isNaN(percentage) || isNaN(currentPrice) || percentage <= 0) {
      mostrarMensaje('Ingrese un precio y un porcentaje válidos.', 'warning');
      return;
    }

    const newPrice = currentPrice * (1 + percentage / 100);
    setPrecio(newPrice.toFixed(2).toString()); // Actualiza el estado del precio
    setIncreasePercentage(''); // Limpia el campo de porcentaje
  };

  useEffect(() => {
    if (productToEdit) {
      setNombre(productToEdit.nombre);
      setCodigoBarras(productToEdit.codigoBarras || '');
      setPrecio(productToEdit.precio.toString());
      setCosto(productToEdit.costo?.toString() || '');
      setStock(productToEdit.stock.toString());
      setCategoria(productToEdit.categoria || '');
      setVendidoPor(productToEdit.vendidoPor || 'unidad');
      setImagenUrl(productToEdit.imagenUrl || '');
      setPreview(productToEdit.imagenUrl || '');
      setImagenFile(null);
      setFavorito(productToEdit.favorito || false);
      setFechaVencimiento(productToEdit.fechaVencimiento || '');
      setDescuentoPromo(
        productToEdit.descuentoPromo ? String(productToEdit.descuentoPromo) : '',
      );
    } else {
      setNombre('');
      setCodigoBarras(initialBarcode || '');
      setPrecio('');
      setCosto('');
      setStock('');
      setCategoria('');
      setVendidoPor('unidad');
      setImagenUrl('');
      setPreview('');
      setImagenFile(null);
      setFavorito(false);
      setFechaVencimiento('');
      setDescuentoPromo('');
    }
    if (!productToEdit && barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, [productToEdit, initialBarcode]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      mostrarMensaje('El archivo debe ser una imagen.', 'warning');
      return;
    }
    setImagenFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleQuitarImagen = () => {
    setImagenFile(null);
    setImagenUrl('');
    setPreview('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const parsedPrecio = parseFloat(precio);
    const parsedCosto = parseFloat(costo) || 0;
    const parsedStock = parseFloat(stock) || 0;
    if (
      !nombre.trim() ||
      isNaN(parsedPrecio) ||
      parsedPrecio < 0 ||
      isNaN(parsedStock) ||
      parsedStock < 0
    ) {
      mostrarMensaje(
        'Complete Nombre, Precio válido y Stock válido.',
        'warning',
      );
      return;
    }

    // Si eligió una imagen nueva, la redimensionamos y subimos a Storage.
    let finalImagenUrl = imagenUrl || null;
    if (imagenFile) {
      if (!currentUser?.uid) {
        mostrarMensaje('Sesión no válida para subir la imagen.', 'error');
        return;
      }
      setSubiendo(true);
      try {
        const blob = await resizeImage(imagenFile);
        finalImagenUrl = await subirImagenProducto(
          currentUser.uid,
          blob,
          nombre.trim(),
        );
      } catch (err) {
        console.error('Error subiendo imagen de producto:', err);
        mostrarMensaje('No se pudo subir la imagen. Probá de nuevo.', 'error');
        setSubiendo(false);
        return;
      }
      setSubiendo(false);
    }

    // onSave se llama igual, pero ProductosTab le pasará el handler del contexto
    onSave({
      id: productToEdit ? productToEdit.id : null,
      nombre: nombre.trim(),
      codigoBarras: codigoBarras.trim() || null,
      precio: parsedPrecio,
      costo: parsedCosto,
      stock: parsedStock,
      categoria: categoria.trim() || null,
      vendidoPor: vendidoPor,
      imagenUrl: finalImagenUrl,
      favorito: favorito,
      fechaVencimiento: fechaVencimiento || null,
      descuentoPromo: parseFloat(descuentoPromo) || 0,
    });
    // El reseteo del formulario y de `editingProduct` lo maneja el contexto/ProductosTab tras una operación exitosa.
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (nombre && precio && stock) {
        handleSubmit(e);
      } else if (!nombre) {
        document.getElementById('prod-nombre-form')?.focus();
      } else if (!precio) {
        document.getElementById('prod-precio-form')?.focus();
      } else if (!stock) {
        document.getElementById('prod-stock-form')?.focus();
      }
    }
  };

  const inputClasses =
    'w-full p-2 border border-zinc-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-zinc-700 text-zinc-100 placeholder-zinc-400';

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-5 rounded-lg bg-zinc-800 p-4 shadow-md sm:p-5"
    >
      <h3 className="mb-4 border-b border-zinc-700 pb-2 text-lg font-medium text-white sm:text-xl">
        {productToEdit
          ? `Editando: ${productToEdit.nombre}`
          : 'Agregar Nuevo Producto'}
      </h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <div className="lg:col-span-1">
          <label
            htmlFor="prod-barcode-form"
            className="mb-1 block text-sm font-medium text-zinc-300"
          >
            Código Barras:
          </label>
          <input
            type="text"
            id="prod-barcode-form"
            ref={barcodeInputRef}
            value={codigoBarras}
            onChange={(e) => setCodigoBarras(e.target.value)}
            onKeyDown={handleKeyDown}
            className={inputClasses}
          />
          <button
            type="button"
            onClick={() => buscarDatos()}
            disabled={buscando}
            className="mt-1 flex items-center gap-1 text-xs font-medium text-emerald-400 hover:text-emerald-300 disabled:opacity-50"
          >
            <Search className="h-3.5 w-3.5" />
            {buscando ? 'Buscando…' : 'Buscar datos del código'}
          </button>
          <button
            type="button"
            onClick={() => setShowNombreOCR(true)}
            className="mt-1 flex items-center gap-1 text-xs font-medium text-indigo-400 hover:text-indigo-300"
          >
            <Camera className="h-3.5 w-3.5" /> Escanear nombre (si no lo
            encuentra)
          </button>
        </div>
        <div className="lg:col-span-2">
          <label
            htmlFor="prod-nombre-form"
            className="mb-1 block text-sm font-medium text-zinc-300"
          >
            Nombre:
          </label>
          <input
            type="text"
            id="prod-nombre-form"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className={inputClasses}
            required
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:col-span-2 sm:grid-cols-3 lg:col-span-3">
          {/* Precio */}
          <div>
            <label
              htmlFor="prod-precio-form"
              className="mb-1 block text-sm font-medium text-zinc-300"
            >
              Precio ($):
            </label>
            <input
              type="number"
              id="prod-precio-form"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              step="0.01"
              min="0"
              className={inputClasses}
              required
            />
          </div>
          {/* Aumento */}
          <div>
            <label
              htmlFor="prod-increase-form"
              className="mb-1 block text-sm font-medium text-zinc-300"
            >
              Aumento (%):
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                id="prod-increase-form"
                value={increasePercentage}
                onChange={(e) => setIncreasePercentage(e.target.value)}
                placeholder="Ej: 15"
                className={inputClasses}
              />
              <motion.button
                type="button"
                onClick={handleApplyPercentage}
                className="h-9 flex-shrink-0 rounded-md bg-green-600 px-3 font-bold text-white hover:bg-green-700"
                whileTap={{ scale: 0.95 }}
                title="Aplicar Aumento"
              >
                Aplicar
              </motion.button>
            </div>
          </div>
          {/* Costo */}
          <div>
            <label
              htmlFor="prod-costo-form"
              className="mb-1 block text-sm font-medium text-zinc-300"
            >
              Costo ($):
            </label>
            <input
              type="number"
              id="prod-costo-form"
              value={costo}
              onChange={(e) => setCosto(e.target.value)}
              step="0.01"
              min="0"
              placeholder="Opcional"
              className={inputClasses}
            />
          </div>
        </div>
        {/* Campo de Categoría */}
        <div>
          <label
            htmlFor="prod-categoria-form"
            className="mb-1 block text-sm font-medium text-zinc-300"
          >
            Categoría:
          </label>
          <input
            type="text"
            id="prod-categoria-form"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            placeholder="Ej: Ropa, Bebidas, etc."
            className="w-full rounded-md border border-zinc-600 bg-zinc-700 p-2 text-zinc-100"
          />
        </div>
        {/* Vendido Por (NUEVO) */}
        <div>
          <label
            htmlFor="prod-vendido-por-form"
            className="mb-1 block text-sm font-medium text-zinc-300"
          >
            Vendido Por:
          </label>
          <select
            id="prod-vendido-por-form"
            value={vendidoPor}
            onChange={(e) => setVendidoPor(e.target.value)}
            className={inputClasses}
          >
            <option value="unidad">Unidad</option>
            <option value="peso">Peso (Kg)</option>
          </select>
          <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={favorito}
              onChange={(e) => setFavorito(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-600 bg-zinc-700 text-blue-500"
            />
            Acceso rápido (botón en la venta) ⭐
          </label>
          <label className="mt-2 block text-xs text-zinc-400">
            Vencimiento (opcional):
          </label>
          <input
            type="date"
            value={fechaVencimiento}
            onChange={(e) => setFechaVencimiento(e.target.value)}
            className={inputClasses}
          />
          <label className="mt-2 block text-xs text-zinc-400">
            Promo % (descuento automático, opcional):
          </label>
          <input
            type="number"
            min="0"
            max="100"
            value={descuentoPromo}
            onChange={(e) => setDescuentoPromo(e.target.value)}
            placeholder="0"
            className={inputClasses}
          />
        </div>
        <div>
          <label
            htmlFor="prod-stock-form"
            className="mb-1 block text-sm font-medium text-zinc-300"
          >
            Stock:
          </label>
          <input
            type="number"
            id="prod-stock-form"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            min="0"
            step="any"
            className={inputClasses}
            required
          />
        </div>
        {/* Foto del producto (opcional) */}
        <div className="sm:col-span-2 lg:col-span-6">
          <label className="mb-1 block text-sm font-medium text-zinc-300">
            Foto del producto (opcional):
          </label>
          <div className="flex items-center gap-3">
            {preview ? (
              <div className="relative">
                <img
                  src={preview}
                  alt="Vista previa"
                  className="h-16 w-16 rounded-md object-cover ring-1 ring-zinc-600"
                />
                <button
                  type="button"
                  onClick={handleQuitarImagen}
                  className="absolute -right-2 -top-2 rounded-full bg-red-600 p-0.5 text-white hover:bg-red-700"
                  title="Quitar foto"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-md bg-zinc-700 text-zinc-500 ring-1 ring-zinc-600">
                <ImagePlus className="h-6 w-6" />
              </div>
            )}
            <label className="cursor-pointer rounded-md bg-zinc-600 px-3 py-2 text-sm font-medium text-zinc-100 hover:bg-zinc-500">
              {preview ? 'Cambiar foto' : 'Subir foto'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
            {subiendo && (
              <span className="text-sm text-zinc-400">Subiendo…</span>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 border-t border-zinc-700 pt-4 sm:col-span-2 sm:flex-row sm:justify-end lg:col-span-6">
          <motion.button
            type="submit"
            disabled={subiendo}
            className={`order-1 w-full rounded-md px-3 py-2 font-bold text-white transition duration-150 ease-in-out disabled:opacity-60 lg:w-auto ${productToEdit ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-blue-600 hover:bg-blue-700'}`}
            whileHover={{ scale: subiendo ? 1 : 1.03 }}
            whileTap={{ scale: subiendo ? 1 : 0.97 }}
          >
            {subiendo ? (
              'Subiendo…'
            ) : productToEdit ? (
              <>
                <i className="fas fa-save mr-2"></i>Guardar
              </>
            ) : (
              <>
                <i className="fas fa-plus mr-2"></i>Agregar
              </>
            )}
          </motion.button>
          {productToEdit && (
            <motion.button
              type="button"
              onClick={onCancelEdit}
              className="order-2 w-full rounded-md bg-zinc-600 px-3 py-2 font-bold text-zinc-200 transition duration-150 ease-in-out hover:bg-zinc-500 lg:w-auto"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <i className="fas fa-times mr-2"></i>Cancelar
            </motion.button>
          )}
        </div>
      </div>

      {showNombreOCR && (
        <EscanerNombreModal
          onDetected={(texto, blob, codigo) => {
            setNombre(texto);
            if (codigo && !codigoBarras) setCodigoBarras(codigo);
            if (blob && !imagenFile && !imagenUrl) {
              setImagenFile(blob);
              setPreview(URL.createObjectURL(blob));
            }
            setShowNombreOCR(false);
          }}
          onClose={() => setShowNombreOCR(false)}
        />
      )}
    </form>
  );
}
export default ProductForm;
