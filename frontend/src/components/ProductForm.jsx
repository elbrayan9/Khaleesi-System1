// src/components/ProductForm.jsx
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAppContext } from '../context/AppContext'; // Importar hook

function ProductForm({ onSave, productToEdit, onCancelEdit }) { // mostrarMensaje ya no es prop
    const { mostrarMensaje } = useAppContext(); // Obtener mostrarMensaje del contexto

    const [nombre, setNombre] = useState('');
    const [codigoBarras, setCodigoBarras] = useState('');
    const [precio, setPrecio] = useState('');
    const [costo, setCosto] = useState('');
    const [stock, setStock] = useState('');
    const [increasePercentage, setIncreasePercentage] = useState('');
    const barcodeInputRef = useRef(null);
    const [categoria, setCategoria] = useState('');
    const [vendidoPor, setVendidoPor] = useState('unidad');

    const handleApplyPercentage = () => {
    const percentage = parseFloat(increasePercentage);
    const currentPrice = parseFloat(precio);

    if (isNaN(percentage) || isNaN(currentPrice) || percentage <= 0) {
        mostrarMensaje("Ingrese un precio y un porcentaje válidos.", "warning");
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
        } else {
            setNombre('');
            setCodigoBarras('');
            setPrecio('');
            setCosto('');
            setStock('');
            setCategoria('');
            setVendidoPor('unidad');
        }
        if (!productToEdit && barcodeInputRef.current) {
            barcodeInputRef.current.focus();
        }
    }, [productToEdit]);

    const handleSubmit = (e) => {
        e.preventDefault();
        const parsedPrecio = parseFloat(precio);
        const parsedCosto = parseFloat(costo) || 0;
        const parsedStock = parseFloat(stock) || 0;
        if (!nombre.trim() || isNaN(parsedPrecio) || parsedPrecio < 0 || isNaN(parsedStock) || parsedStock < 0) {
            mostrarMensaje("Complete Nombre, Precio válido y Stock válido.", 'warning');
            return;
        }
        // onSave se llama igual, pero ProductosTab le pasará el handler del contexto
        onSave({ id: productToEdit ? productToEdit.id : null, nombre: nombre.trim(), codigoBarras: codigoBarras.trim() || null, precio: parsedPrecio, costo: parsedCosto, stock: parsedStock, categoria: categoria.trim() || null, vendidoPor: vendidoPor }); 
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

    const inputClasses = "w-full p-2 border border-zinc-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-zinc-700 text-zinc-100 placeholder-zinc-400";

    return (
        <form onSubmit={handleSubmit} className="bg-zinc-800 p-4 sm:p-5 rounded-lg shadow-md mb-5">
            <h3 className="text-lg sm:text-xl font-medium mb-4 text-white border-b border-zinc-700 pb-2">
                {productToEdit ? `Editando: ${productToEdit.nombre}` : 'Agregar Nuevo Producto'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div>
                    <label htmlFor="prod-barcode-form" className="block text-sm font-medium text-zinc-300 mb-1">Código Barras:</label>
                    <input type="text" id="prod-barcode-form" ref={barcodeInputRef} value={codigoBarras} onChange={(e) => setCodigoBarras(e.target.value)} onKeyDown={handleKeyDown} className={inputClasses} />
                </div>
                <div className="lg:col-span-2">
                    <label htmlFor="prod-nombre-form" className="block text-sm font-medium text-zinc-300 mb-1">Nombre:</label>
                    <input type="text" id="prod-nombre-form" value={nombre} onChange={(e) => setNombre(e.target.value)} className={inputClasses} required />
                </div>
<div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
    {/* Precio */}
    <div>
        <label htmlFor="prod-precio-form" className="block text-sm font-medium text-zinc-300 mb-1">Precio ($):</label>
        <input type="number" id="prod-precio-form" value={precio} onChange={(e) => setPrecio(e.target.value)} step="0.01" min="0" className={inputClasses} required />
    </div>
    {/* Aumento */}
    <div className="flex items-end gap-2">
        <div className="flex-grow">
            <label htmlFor="prod-increase-form" className="block text-sm font-medium text-zinc-300 mb-1">Aumento (%):</label>
            <input 
                type="number" 
                id="prod-increase-form" 
                value={increasePercentage} 
                onChange={(e) => setIncreasePercentage(e.target.value)} 
                placeholder="Ej: 15" 
                className={inputClasses}
            />
        </div>
        <motion.button 
            type="button" 
            onClick={handleApplyPercentage}
            className="bg-green-600 hover:bg-green-700 text-white font-bold px-3 rounded-md h-9"
            whileTap={{ scale: 0.95 }}
            title="Aplicar Aumento"
        >
            Aplicar
        </motion.button>
    </div>
    {/* Costo */}
    <div>
        <label htmlFor="prod-costo-form" className="block text-sm font-medium text-zinc-300 mb-1">Costo ($):</label>
        <input type="number" id="prod-costo-form" value={costo} onChange={(e) => setCosto(e.target.value)} step="0.01" min="0" placeholder="Opcional" className={inputClasses} />
    </div>
</div>              
                {/* Campo de Categoría */}
<div>
    <label htmlFor="prod-categoria-form" className="block text-sm font-medium text-zinc-300 mb-1">Categoría:</label>
    <input
        type="text"
        id="prod-categoria-form"
        value={categoria}
        onChange={(e) => setCategoria(e.target.value)}
        placeholder="Ej: Ropa, Bebidas, etc."
        className="w-full p-2 border border-zinc-600 rounded-md bg-zinc-700 text-zinc-100"
    />
</div>
    {/* Vendido Por (NUEVO) */}
    <div>
        <label htmlFor="prod-vendido-por-form" className="block text-sm font-medium text-zinc-300 mb-1">Vendido Por:</label>
        <select 
            id="prod-vendido-por-form" 
            value={vendidoPor} 
            onChange={(e) => setVendidoPor(e.target.value)} 
            className={inputClasses}
        >
            <option value="unidad">Unidad</option>
            <option value="peso">Peso (Kg)</option>
        </select>
    </div>
                <div>
                    <label htmlFor="prod-stock-form" className="block text-sm font-medium text-zinc-300 mb-1">Stock:</label>
                    <input type="number" id="prod-stock-form" value={stock} onChange={(e) => setStock(e.target.value)} min="0" step="any" className={inputClasses} required />
                </div>
                <div className="sm:col-span-2 lg:col-span-5 lg:self-end lg:text-right flex flex-col sm:flex-row sm:justify-end sm:space-x-2 space-y-2 sm:space-y-0 mt-3 lg:mt-0">
                    <motion.button type="submit" className={`w-full lg:w-auto text-white font-bold py-2 px-3 rounded-md transition duration-150 ease-in-out order-1 ${productToEdit ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-blue-600 hover:bg-blue-700'}`} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                        {productToEdit ? <><i className="fas fa-save mr-2"></i>Guardar</> : <><i className="fas fa-plus mr-2"></i>Agregar</>}
                    </motion.button>
                    {productToEdit && (
                        <motion.button type="button" onClick={onCancelEdit} className="w-full lg:w-auto bg-zinc-600 hover:bg-zinc-500 text-zinc-200 font-bold py-2 px-3 rounded-md transition duration-150 ease-in-out order-2" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                            <i className="fas fa-times mr-2"></i>Cancelar
                        </motion.button>
                    )}
                </div>
            </div>
        </form>
    );
}
export default ProductForm;