// frontend/src/components/PedidoForm.jsx
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '../context/AppContext';
import { FiX, FiPlus, FiTrash2 } from 'react-icons/fi';
import { formatCurrency } from '../utils/helpers';

const PedidoForm = ({ isOpen, onClose }) => {
  const { proveedores, productos, handleSavePedido } = useAppContext();

  // Estados del formulario
  const [selectedProveedorId, setSelectedProveedorId] = useState('');
  const [items, setItems] = useState([]);
  const [notas, setNotas] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredProductos = useMemo(() => {
    if (!searchTerm) return [];
    return productos
      .filter((p) => p.nombre.toLowerCase().includes(searchTerm.toLowerCase()))
      .slice(0, 5); // Mostramos solo los primeros 5 resultados para no saturar
  }, [productos, searchTerm]);

  const handleAddItem = (producto) => {
    // Evitar duplicados
    if (items.find((item) => item.productoId === producto.id)) return;

    const newItem = {
      productoId: producto.id,
      nombre: producto.nombre,
      cantidad: 1,
      costoUnitario: producto.costo || 0, // Usamos el costo del producto si existe
    };
    setItems([...items, newItem]);
    setSearchTerm('');
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    const numValue = parseFloat(value);
    newItems[index][field] = isNaN(numValue) ? 0 : numValue;
    setItems(newItems);
  };

  const handleRemoveItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const totalCosto = useMemo(() => {
    return items.reduce(
      (total, item) => total + item.cantidad * item.costoUnitario,
      0,
    );
  }, [items]);

  const resetForm = () => {
    setSelectedProveedorId('');
    setItems([]);
    setNotas('');
    setSearchTerm('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProveedorId || items.length === 0) {
      alert('Debes seleccionar un proveedor y añadir al menos un producto.');
      return;
    }

    const proveedorSeleccionado = proveedores.find(
      (p) => p.id === selectedProveedorId,
    );

    const pedidoData = {
      proveedorId: selectedProveedorId,
      proveedorNombre: proveedorSeleccionado.nombre,
      fechaPedido: new Date().toISOString().split('T')[0],
      estado: 'pedido',
      items: items,
      totalCosto: totalCosto,
      notas: notas,
    };

    const success = await handleSavePedido(pedidoData);
    if (success) {
      resetForm();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4"
      >
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-lg border border-zinc-700 bg-zinc-800 shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-zinc-700 p-4">
            <h3 className="text-lg font-bold text-white">
              Nuevo Pedido a Proveedor
            </h3>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white"
            >
              <FiX size={24} />
            </button>
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex-grow space-y-4 overflow-y-auto p-6"
          >
            {/* --- Selección de Proveedor --- */}
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-300">
                Proveedor
              </label>
              <select
                value={selectedProveedorId}
                onChange={(e) => setSelectedProveedorId(e.target.value)}
                required
                className="w-full rounded-md border border-zinc-600 bg-zinc-700 p-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="">-- Selecciona un proveedor --</option>
                {proveedores.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* --- Búsqueda y adición de productos --- */}
            <div className="relative">
              <label className="mb-1 block text-sm font-medium text-zinc-300">
                Buscar Producto
              </label>
              <input
                type="text"
                placeholder="Escribe para buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-md border border-zinc-600 bg-zinc-700 p-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              {filteredProductos.length > 0 && (
                <ul className="absolute z-10 mt-1 w-full rounded-md border border-zinc-600 bg-zinc-700">
                  {filteredProductos.map((p) => (
                    <li
                      key={p.id}
                      onClick={() => handleAddItem(p)}
                      className="cursor-pointer p-2 hover:bg-cyan-600"
                    >
                      {p.nombre}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* --- Items del Pedido --- */}
            <div className="space-y-2">
              <h4 className="text-md font-semibold text-white">
                Items del Pedido
              </h4>
              {items.map((item, index) => (
                <div
                  key={index}
                  className="grid grid-cols-12 items-center gap-2"
                >
                  <span className="col-span-5 text-zinc-200">
                    {item.nombre}
                  </span>
                  <input
                    type="number"
                    placeholder="Cant."
                    value={item.cantidad}
                    onChange={(e) =>
                      handleItemChange(index, 'cantidad', e.target.value)
                    }
                    className="col-span-3 rounded-md border border-zinc-600 bg-zinc-700 p-1 text-center text-white"
                  />
                  <input
                    type="number"
                    placeholder="Costo U."
                    value={item.costoUnitario}
                    onChange={(e) =>
                      handleItemChange(index, 'costoUnitario', e.target.value)
                    }
                    className="col-span-3 rounded-md border border-zinc-600 bg-zinc-700 p-1 text-center text-white"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    className="col-span-1 text-red-500 hover:text-red-400"
                  >
                    <FiTrash2 />
                  </button>
                </div>
              ))}
              {items.length === 0 && (
                <p className="text-sm text-zinc-400">
                  Añade productos desde el buscador.
                </p>
              )}
            </div>

            {/* --- Notas y Total --- */}
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-300">
                Notas Adicionales
              </label>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                rows="3"
                className="w-full rounded-md border border-zinc-600 bg-zinc-700 p-2 text-white"
              ></textarea>
            </div>
            <div className="text-right text-xl font-bold text-white">
              Total: {formatCurrency(totalCosto)}
            </div>
          </form>

          <div className="flex justify-end border-t border-zinc-700 p-4">
            <button
              type="button"
              onClick={onClose}
              className="mr-2 rounded-md bg-zinc-600 px-4 py-2 font-bold text-white transition-colors hover:bg-zinc-500"
            >
              Cancelar
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              className="rounded-md bg-cyan-600 px-4 py-2 font-bold text-white transition-colors hover:bg-cyan-500"
            >
              Guardar Pedido
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PedidoForm;
