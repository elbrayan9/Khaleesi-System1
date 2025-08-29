import React from 'react';
import { motion } from 'framer-motion';
import SearchBar from './SearchBar.jsx';
import { useAppContext } from '../context/AppContext.jsx'; // Importamos el contexto
import { formatCurrency } from '../utils/helpers.js';
import { Trash2, PlusCircle, MinusCircle } from 'lucide-react'; // Importamos íconos

function Cart({
    onCheckout, // Renombrado de onConfirmSale a onCheckout para claridad
    clients,
    selectedClientId,
    onClientSelect
}) {
    // --- MODIFICADO: Obtenemos cartItems y setCartItems del contexto ---
    const { cartItems, setCartItems, productos } = useAppContext();

    // --- MODIFICADO: El total se calcula aquí con el precio final ---
    const total = cartItems.reduce((acc, item) => acc + (item.precioFinal * item.cantidad), 0);

    // --- MODIFICADO: Lógica para actualizar y eliminar items ---
    const handleRemoveItem = (itemId) => {
        setCartItems(prevItems => prevItems.filter(item => item.id !== itemId));
    };

    const handleUpdateQuantity = (itemId, change) => {
        const itemToUpdate = cartItems.find(item => item.id === itemId);
        if (!itemToUpdate) return;

        const productoInfo = productos.find(p => p.id === itemId);
        const newQuantity = itemToUpdate.cantidad + change;

        if (newQuantity > productoInfo?.stock && itemToUpdate.isTracked) {
            // No usamos mostrarMensaje aquí para no ser muy invasivos
            console.warn(`Stock insuficiente para ${itemToUpdate.nombre}.`);
            return;
        }

        if (newQuantity <= 0) {
            // Si la cantidad es 0 o menos, eliminamos el item
            setCartItems(prev => prev.filter(item => item.id !== itemId));
        } else {
            setCartItems(prev =>
                prev.map(item =>
                    item.id === itemId ? { ...item, cantidad: newQuantity } : item
                )
            );
        }
    };

    const clientObject = selectedClientId ? clients.find(c => c.id === selectedClientId) : null;
    const handleClientSelectedInCart = (client) => { onClientSelect(client ? client.id : null); };

    return (
        <div className="lg:col-span-1 bg-zinc-800 p-4 sm:p-5 rounded-lg shadow-md flex flex-col h-full">
            <h3 className="text-lg sm:text-xl font-medium mb-3 text-white border-b border-zinc-700 pb-2">Carrito</h3>
            <div id="carrito-items" className="flex-grow mb-3 max-h-[28rem] overflow-y-auto border-b border-zinc-700 pb-3 pr-2">
                {cartItems.length === 0 ? (
                    <p className="text-zinc-400 italic text-sm text-center py-10">El carrito está vacío.</p>
                ) : (
                    cartItems.map((item) => (
                        // --- MODIFICADO: La visualización de cada item ---
                        <div key={item.id} className="flex justify-between items-start mb-2 text-sm border-b border-zinc-700 pb-2 last:border-b-0">
                            <div className="flex-grow pr-2">
                                <p className="font-medium text-zinc-100">{item.nombre}</p>
                                {item.descuentoPorcentaje > 0 && (
                                    <div className="text-xs">
                                        <span className="text-zinc-500 line-through mr-2">${formatCurrency(item.precioOriginal)}</span>
                                        <span className="text-green-400 font-semibold">(-{item.descuentoPorcentaje}%)</span>
                                    </div>
                                )}
                                <p className="text-zinc-300 text-xs">{item.cantidad} x ${formatCurrency(item.precioFinal)}</p>
                            </div>
                            <div className="col-span-2 flex items-center justify-end gap-1">
                                <motion.button onClick={() => handleUpdateQuantity(item.id, -1)} className="p-1 text-zinc-400 hover:text-white" whileTap={{ scale: 0.9 }}><MinusCircle size={18}/></motion.button>
                                <span className="font-bold text-lg text-white w-8 text-center">{item.cantidad}</span>
                                <motion.button onClick={() => handleUpdateQuantity(item.id, 1)} className="p-1 text-zinc-400 hover:text-white" whileTap={{ scale: 0.9 }}><PlusCircle size={18}/></motion.button>
                                <motion.button onClick={() => handleRemoveItem(item.id)} className="p-1 text-red-500 hover:text-red-400 ml-2" title="Quitar" whileTap={{ scale: 0.9 }}><Trash2 size={18}/></motion.button>
                            </div>
                        </div>
                    ))
                )}
            </div>
            <div className="mt-auto">
                <div className="text-right mb-3">
                    <span className="text-xl font-semibold text-zinc-100">Total: </span>
                    <span id="carrito-total" className="text-xl font-semibold text-zinc-100">${formatCurrency(total)}</span>
                </div>
                <div className="mb-3">
                     <label htmlFor="cliente-buscar-react-cart" className="block text-sm font-medium text-zinc-300 mb-1">Buscar Cliente (Nombre/CUIT):</label>
                     <SearchBar items={clients} placeholder="Dejar vacío para Consumidor Final" onSelect={handleClientSelectedInCart} displayKey="nombre" filterKeys={['nombre', 'cuit']} initialValue={clientObject ? clientObject.nombre : ''} inputId="cliente-buscar-react-cart" />
                </div>
                <motion.button
                    onClick={onCheckout}
                    disabled={cartItems.length === 0}
                    className={`w-full font-bold py-2 px-4 rounded-md transition duration-150 ease-in-out ${cartItems.length === 0 ? 'bg-zinc-500 text-zinc-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                    whileHover={{ scale: cartItems.length > 0 ? 1.03 : 1 }}
                    whileTap={{ scale: cartItems.length > 0 ? 0.97 : 1 }}
                >
                    Proceder al Pago
                </motion.button>
            </div>
        </div>
    );
}
export default Cart;