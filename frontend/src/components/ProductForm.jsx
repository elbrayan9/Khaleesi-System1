import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

function ProductForm({ onSave, productToEdit, onCancelEdit, mostrarMensaje }) {
    const [nombre, setNombre] = useState('');
    const [codigoBarras, setCodigoBarras] = useState('');
    const [precio, setPrecio] = useState('');
    const [stock, setStock] = useState('');
    const barcodeInputRef = useRef(null);

    useEffect(() => {
        if (productToEdit) {
            setNombre(productToEdit.nombre);
            setCodigoBarras(productToEdit.codigoBarras || '');
            setPrecio(productToEdit.precio.toString());
            setStock(productToEdit.stock.toString());
        } else {
            setNombre('');
            setCodigoBarras('');
            setPrecio('');
            setStock('');
        }
        // Enfocar código de barras solo al agregar nuevo producto
        if (!productToEdit && barcodeInputRef.current) {
            barcodeInputRef.current.focus();
        }
    }, [productToEdit]);

    const handleSubmit = (e) => {
        e.preventDefault();
        const parsedPrecio = parseFloat(precio);
        const parsedStock = parseInt(stock, 10);
        if (!nombre || isNaN(parsedPrecio) || parsedPrecio < 0 || isNaN(parsedStock) || parsedStock < 0) {
            mostrarMensaje("Complete Nombre, Precio válido y Stock válido.", 'warning');
            return;
        }
        onSave({ id: productToEdit ? productToEdit.id : null, nombre: nombre.trim(), codigoBarras: codigoBarras.trim() || null, precio: parsedPrecio, stock: parsedStock });
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

    // Clases comunes para los inputs en modo oscuro (Zinc)
    const inputClasses = "w-full p-2 border border-zinc-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-zinc-700 text-zinc-100 placeholder-zinc-400";

    return (
        <form onSubmit={handleSubmit} className="bg-zinc-800 p-4 sm:p-5 rounded-lg shadow-md mb-5">
            <h3 className="text-lg sm:text-xl font-medium mb-4 text-white border-b border-zinc-700 pb-2">
                {productToEdit ? `Editando: ${productToEdit.nombre}` : 'Agregar Nuevo Producto'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {/* Barcode */}
                 <div>
                    <label htmlFor="prod-barcode-form" className="block text-sm font-medium text-zinc-300 mb-1">Código Barras:</label>
                    {/* Aplicar inputClasses */}
                    <input type="text" id="prod-barcode-form" ref={barcodeInputRef} value={codigoBarras} onChange={(e) => setCodigoBarras(e.target.value)} onKeyDown={handleKeyDown} className={inputClasses} />
                </div>
                {/* Nombre */}
                <div className="lg:col-span-2">
                    <label htmlFor="prod-nombre-form" className="block text-sm font-medium text-zinc-300 mb-1">Nombre:</label>
                     {/* Aplicar inputClasses */}
                    <input type="text" id="prod-nombre-form" value={nombre} onChange={(e) => setNombre(e.target.value)} className={inputClasses} required />
                </div>
                 {/* Precio */}
                <div>
                    <label htmlFor="prod-precio-form" className="block text-sm font-medium text-zinc-300 mb-1">Precio ($):</label>
                     {/* Aplicar inputClasses */}
                    <input type="number" id="prod-precio-form" value={precio} onChange={(e) => setPrecio(e.target.value)} step="0.01" min="0" className={inputClasses} required />
                </div>
                 {/* Stock */}
                <div>
                    <label htmlFor="prod-stock-form" className="block text-sm font-medium text-zinc-300 mb-1">Stock:</label>
                     {/* Aplicar inputClasses */}
                    <input type="number" id="prod-stock-form" value={stock} onChange={(e) => setStock(e.target.value)} min="0" className={inputClasses} required />
                </div>
                 {/* Botones Animados */}
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
