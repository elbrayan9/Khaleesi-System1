// frontend/src/components/Cart.jsx
import React from 'react';
import { motion } from 'framer-motion';
import SearchBar from './SearchBar.jsx';
import { useAppContext } from '../context/AppContext.jsx';
import { formatCurrency } from '../utils/helpers.js';
import { Trash2, PlusCircle, MinusCircle } from 'lucide-react';

function Cart({ onCheckout, clients, selectedClientId, onClientSelect }) {
    const { cartItems, setCartItems, productos, mostrarMensaje } = useAppContext();

    // --- CÁLCULO CORREGIDO ---
    // Ahora simplemente sumamos el precioFinal de cada item, que ya es el total de la línea.
    const total = cartItems.reduce((acc, item) => acc + item.precioFinal, 0);

    const handleRemoveItem = (cartId) => {
        setCartItems(prevItems => prevItems.filter(item => item.cartId !== cartId));
    };

    // La función de actualizar cantidad ahora debe recalcular el precio de la línea
    const handleUpdateQuantity = (cartId, change) => {
        setCartItems(prev =>
            prev.map(item => {
                if (item.cartId !== cartId || item.vendidoPor === 'ticketBalanza') return item;

                const newQuantity = item.cantidad + change;
                if (newQuantity <= 0) {
                    return null; // Marcar para eliminar
                }

                const productoInfo = productos.find(p => p.id === item.id);
                if (newQuantity > productoInfo?.stock && productoInfo?.vendidoPor === 'unidad') {
                    mostrarMensaje(`Stock insuficiente para ${item.nombre}.`, "warning");
                    return item; // No hacer cambios si no hay stock
                }
                
                // Recalcular precio final de la línea
                const newPrecioTotal = item.precioOriginal * newQuantity;
                const newPrecioFinal = newPrecioTotal - (newPrecioTotal * item.descuentoPorcentaje / 100);

                return { ...item, cantidad: newQuantity, precioFinal: newPrecioFinal };
            }).filter(Boolean) // Eliminar los items marcados como null
        );
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
                        <div key={item.cartId} className="flex justify-between items-center mb-2 text-sm border-b border-zinc-700 pb-2 last:border-b-0">
                            {/* --- VISUALIZACIÓN CORREGIDA --- */}
                            <div className="flex-grow pr-2">
                                <p className="font-medium text-zinc-100">{item.nombre}</p>
                                <p className="text-zinc-300 text-xs">
                                    {item.vendidoPor === 'peso' ? `${item.cantidad.toFixed(3)} Kg` : `${item.cantidad} u.`}
                                    {item.descuentoPorcentaje > 0 && <span className="text-green-400 font-semibold"> (-{item.descuentoPorcentaje}%)</span>}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="text-right">
                                    <p className="font-bold text-zinc-100">{formatCurrency(item.precioFinal)}</p>
                                    {item.cantidad > 1 && item.vendidoPor !== 'peso' && (
                                        <p className="text-xs text-zinc-400">({formatCurrency(item.precioOriginal)} c/u)</p>
                                    )}
                                </div>
                                <motion.button onClick={() => handleRemoveItem(item.cartId)} className="p-1 text-red-500 hover:text-red-400 ml-2" title="Quitar" whileTap={{ scale: 0.9 }}>
                                    <Trash2 size={18}/>
                                </motion.button>
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