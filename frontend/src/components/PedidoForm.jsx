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
    return productos.filter(p =>
      p.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 5); // Mostramos solo los primeros 5 resultados para no saturar
  }, [productos, searchTerm]);
  
  const handleAddItem = (producto) => {
    // Evitar duplicados
    if (items.find(item => item.productoId === producto.id)) return;
    
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
    return items.reduce((total, item) => total + (item.cantidad * item.costoUnitario), 0);
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

    const proveedorSeleccionado = proveedores.find(p => p.id === selectedProveedorId);

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
        className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4"
      >
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          className="bg-zinc-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-zinc-700"
        >
          <div className="flex justify-between items-center p-4 border-b border-zinc-700">
            <h3 className="text-lg font-bold text-white">Nuevo Pedido a Proveedor</h3>
            <button onClick={onClose} className="text-zinc-400 hover:text-white">
              <FiX size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto p-6 space-y-4">
            {/* --- Selección de Proveedor --- */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Proveedor</label>
              <select
                value={selectedProveedorId}
                onChange={(e) => setSelectedProveedorId(e.target.value)}
                required
                className="w-full bg-zinc-700 text-white p-2 rounded-md border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="">-- Selecciona un proveedor --</option>
                {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>

            {/* --- Búsqueda y adición de productos --- */}
            <div className="relative">
              <label className="block text-sm font-medium text-zinc-300 mb-1">Buscar Producto</label>
              <input 
                type="text"
                placeholder="Escribe para buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-zinc-700 text-white p-2 rounded-md border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              {filteredProductos.length > 0 && (
                <ul className="absolute w-full bg-zinc-700 border border-zinc-600 rounded-md mt-1 z-10">
                  {filteredProductos.map(p => (
                    <li key={p.id} onClick={() => handleAddItem(p)} className="p-2 hover:bg-cyan-600 cursor-pointer">
                      {p.nombre}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            
            {/* --- Items del Pedido --- */}
            <div className="space-y-2">
              <h4 className="text-md font-semibold text-white">Items del Pedido</h4>
              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-center">
                  <span className="col-span-5 text-zinc-200">{item.nombre}</span>
                  <input type="number" placeholder="Cant." value={item.cantidad} onChange={(e) => handleItemChange(index, 'cantidad', e.target.value)} className="col-span-3 bg-zinc-700 text-white p-1 rounded-md border border-zinc-600 text-center" />
                  <input type="number" placeholder="Costo U." value={item.costoUnitario} onChange={(e) => handleItemChange(index, 'costoUnitario', e.target.value)} className="col-span-3 bg-zinc-700 text-white p-1 rounded-md border border-zinc-600 text-center" />
                  <button type="button" onClick={() => handleRemoveItem(index)} className="col-span-1 text-red-500 hover:text-red-400"><FiTrash2 /></button>
                </div>
              ))}
              {items.length === 0 && <p className="text-zinc-400 text-sm">Añade productos desde el buscador.</p>}
            </div>

             {/* --- Notas y Total --- */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Notas Adicionales</label>
              <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows="3" className="w-full bg-zinc-700 text-white p-2 rounded-md border border-zinc-600"></textarea>
            </div>
            <div className="text-right text-xl font-bold text-white">
              Total: {formatCurrency(totalCosto)}
            </div>
          </form>

          <div className="flex justify-end p-4 border-t border-zinc-700">
            <button type="button" onClick={onClose} className="bg-zinc-600 hover:bg-zinc-500 text-white font-bold py-2 px-4 rounded-md transition-colors mr-2">
              Cancelar
            </button>
            <button type="submit" onClick={handleSubmit} className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded-md transition-colors">
              Guardar Pedido
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PedidoForm;