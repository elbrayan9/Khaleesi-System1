import React from 'react';
import { motion } from 'framer-motion'; // Importar motion
import SearchBar from './SearchBar.jsx';
// import { Trash2 } from 'lucide-react'; // Opcional si prefieres icono Lucide

function Cart({
    cartItems, onRemoveItem, total, onCheckout, clients,
    selectedClientId, onClientSelect, formatCurrency
}) {
    const clientObject = selectedClientId ? clients.find(c => c.id === selectedClientId) : null;
    const handleClientSelectedInCart = (client) => { onClientSelect(client ? client.id : null); };

    return (
        <div className="lg:col-span-1 bg-zinc-800 p-4 sm:p-5 rounded-lg shadow-md">
            <h3 className="text-lg sm:text-xl font-medium mb-3 text-white border-b border-zinc-700 pb-2">Carrito</h3>
            <div id="carrito-items" className="mb-3 max-h-60 overflow-y-auto border-b border-zinc-700 pb-3 pr-1">
                {cartItems.length === 0 ? (
                    <p className="text-zinc-400 italic text-sm">El carrito está vacío.</p>
                ) : (
                    cartItems.map((item, index) => (
                        <div key={`${item.id}-${index}-${item.cantidad}`} className="flex justify-between items-center mb-2 text-sm border-b border-zinc-700 pb-1 last:border-b-0">
                            <div className="flex-grow pr-2">
                                <span className="font-medium text-zinc-100">{item.nombre}</span>
                                <span className="block text-zinc-400 text-xs">{item.cantidad} x ${formatCurrency(item.precio)}</span>
                            </div>
                            <div className="flex items-center flex-shrink-0">
                                <span className="mr-2 font-medium text-right w-16 text-zinc-200">${formatCurrency(item.precio * item.cantidad)}</span>
                                {/* Botón Quitar Animado */}
                                <motion.button
                                    onClick={() => onRemoveItem(index)}
                                    className="text-red-500 hover:text-red-400 text-xs ml-1 p-1 rounded-full"
                                    title="Quitar"
                                    whileHover={{ scale: 1.15, rotate: 5 }} // Animación más notoria para icono
                                    whileTap={{ scale: 0.9 }}
                                >
                                    <i className="fas fa-times-circle fa-lg"></i>
                                    {/* <Trash2 className="h-4 w-4"/> */}
                                </motion.button>
                            </div>
                        </div>
                    ))
                )}
            </div>
            <div className="text-right mb-3">
                <span className="text-lg font-semibold text-zinc-100">Total: $</span>
                <span id="carrito-total" className="text-lg font-semibold text-zinc-100">{formatCurrency(total)}</span>
            </div>
            <div className="mb-3">
                 <label htmlFor="cliente-buscar-react-cart" className="block text-sm font-medium text-zinc-300 mb-1">Buscar Cliente (Nombre/CUIT):</label>
                 <SearchBar items={clients} placeholder="Escriba para buscar..." onSelect={handleClientSelectedInCart} displayKey="nombre" filterKeys={['nombre', 'cuit']} inputId="cliente-buscar-react-cart" resultId="cliente-resultados-react-cart" initialValue={clientObject ? clientObject.nombre : ''} formatCurrency={formatCurrency} />
                 <p className="text-xs text-zinc-400 mt-1">Dejar vacío para "Consumidor Final".</p>
            </div>
            {/* Botón Proceder al Pago Animado */}
            <motion.button
                onClick={onCheckout}
                disabled={cartItems.length === 0}
                className={`w-full font-bold py-2 px-4 rounded-md transition duration-150 ease-in-out ${cartItems.length === 0 ? 'bg-zinc-500 text-zinc-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                whileHover={{ scale: cartItems.length > 0 ? 1.03 : 1 }}
                whileTap={{ scale: cartItems.length > 0 ? 0.97 : 1 }}
            >
                <i className="fas fa-dollar-sign mr-2"></i>Proceder al Pago
            </motion.button>
        </div>
    );
}
export default Cart;
