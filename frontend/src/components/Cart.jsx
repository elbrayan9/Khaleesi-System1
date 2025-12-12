import React from 'react';
import { motion } from 'framer-motion';
import SearchBar from './SearchBar.jsx';
import { useAppContext } from '../context/AppContext.jsx';
import { formatCurrency } from '../utils/helpers.js';
import { Trash2, PlusCircle, MinusCircle, FileText } from 'lucide-react';

function Cart({
  onCheckout,
  onSaveBudget,
  clients,
  selectedClientId,
  onClientSelect,
}) {
  const { cartItems, setCartItems, productos, mostrarMensaje } =
    useAppContext();

  // --- CÁLCULO CORREGIDO ---
  // Ahora simplemente sumamos el precioFinal de cada item, que ya es el total de la línea.
  const total = cartItems.reduce((acc, item) => acc + item.precioFinal, 0);

  const handleRemoveItem = (cartId) => {
    setCartItems((prevItems) =>
      prevItems.filter((item) => item.cartId !== cartId),
    );
  };

  // La función de actualizar cantidad ahora debe recalcular el precio de la línea
  const handleUpdateQuantity = (cartId, change) => {
    setCartItems(
      (prev) =>
        prev
          .map((item) => {
            if (item.cartId !== cartId || item.vendidoPor === 'ticketBalanza')
              return item;

            const newQuantity = item.cantidad + change;
            if (newQuantity <= 0) {
              return null; // Marcar para eliminar
            }

            const productoInfo = productos.find((p) => p.id === item.id);
            if (
              newQuantity > productoInfo?.stock &&
              productoInfo?.vendidoPor === 'unidad'
            ) {
              mostrarMensaje(
                `Stock insuficiente para ${item.nombre}.`,
                'warning',
              );
              return item; // No hacer cambios si no hay stock
            }

            // Recalcular precio final de la línea
            const newPrecioTotal = item.precioOriginal * newQuantity;
            const newPrecioFinal =
              newPrecioTotal -
              (newPrecioTotal * item.descuentoPorcentaje) / 100;

            return {
              ...item,
              cantidad: newQuantity,
              precioFinal: newPrecioFinal,
            };
          })
          .filter(Boolean), // Eliminar los items marcados como null
    );
  };

  const clientObject = selectedClientId
    ? clients.find((c) => c.id === selectedClientId)
    : null;
  const handleClientSelectedInCart = (client) => {
    onClientSelect(client ? client.id : null);
  };

  return (
    <div className="flex h-full flex-col rounded-lg bg-zinc-800 p-4 shadow-md sm:p-5 lg:col-span-1">
      <h3 className="mb-3 border-b border-zinc-700 pb-2 text-lg font-medium text-white sm:text-xl">
        Carrito
      </h3>
      <div
        id="carrito-items"
        className="mb-3 max-h-[28rem] flex-grow overflow-y-auto border-b border-zinc-700 pb-3 pr-2"
      >
        {cartItems.length === 0 ? (
          <p className="py-10 text-center text-sm italic text-zinc-400">
            El carrito está vacío.
          </p>
        ) : (
          cartItems.map((item) => (
            <div
              key={item.cartId}
              className="mb-2 flex items-center justify-between border-b border-zinc-700 pb-2 text-sm last:border-b-0"
            >
              {/* --- VISUALIZACIÓN CORREGIDA --- */}
              <div className="flex-grow pr-2">
                <p className="font-medium text-zinc-100">{item.nombre}</p>
                <div className="flex items-center gap-2">
                  {item.vendidoPor !== 'ticketBalanza' && (
                    <div className="flex items-center rounded bg-zinc-700">
                      <button
                        onClick={() => handleUpdateQuantity(item.cartId, -1)}
                        className="p-1 text-zinc-400 hover:text-white"
                      >
                        <MinusCircle size={16} />
                      </button>
                      <span className="min-w-[2rem] text-center text-xs font-bold text-white">
                        {item.cantidad}
                      </span>
                      <button
                        onClick={() => handleUpdateQuantity(item.cartId, 1)}
                        className="p-1 text-zinc-400 hover:text-white"
                      >
                        <PlusCircle size={16} />
                      </button>
                    </div>
                  )}
                  <p className="text-xs text-zinc-300">
                    {item.vendidoPor === 'peso'
                      ? `${item.cantidad.toFixed(3)} Kg`
                      : item.vendidoPor === 'ticketBalanza'
                        ? `${item.cantidad} u.`
                        : ''}
                    {item.descuentoPorcentaje > 0 && (
                      <span className="font-semibold text-green-400">
                        {' '}
                        (-{item.descuentoPorcentaje}%)
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <p className="font-bold text-zinc-100">
                    {formatCurrency(item.precioFinal)}
                  </p>
                  {item.cantidad > 1 && item.vendidoPor !== 'peso' && (
                    <p className="text-xs text-zinc-400">
                      ({formatCurrency(item.precioOriginal)} c/u)
                    </p>
                  )}
                </div>
                <motion.button
                  onClick={() => handleRemoveItem(item.cartId)}
                  className="ml-2 p-1 text-red-500 hover:text-red-400"
                  title="Quitar"
                  whileTap={{ scale: 0.9 }}
                >
                  <Trash2 size={18} />
                </motion.button>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="mt-auto">
        <div className="mb-3 text-right">
          <span className="text-xl font-semibold text-zinc-100">Total: </span>
          <span
            id="carrito-total"
            className="text-xl font-semibold text-zinc-100"
          >
            ${formatCurrency(total)}
          </span>
        </div>
        <div className="mb-3">
          <label
            htmlFor="cliente-buscar-react-cart"
            className="mb-1 block text-sm font-medium text-zinc-300"
          >
            Buscar Cliente (Nombre/CUIT):
          </label>
          <SearchBar
            items={clients}
            placeholder="Dejar vacío para Consumidor Final"
            onSelect={handleClientSelectedInCart}
            displayKey="nombre"
            filterKeys={['nombre', 'cuit']}
            initialValue={clientObject ? clientObject.nombre : ''}
            inputId="cliente-buscar-react-cart"
          />
        </div>
        <div className="flex gap-2">
          <motion.button
            onClick={onSaveBudget}
            disabled={cartItems.length === 0}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md border border-yellow-600 bg-yellow-600/20 px-4 py-2 font-bold text-yellow-500 transition duration-150 ease-in-out hover:bg-yellow-600 hover:text-white ${cartItems.length === 0 ? 'cursor-not-allowed opacity-50' : ''}`}
            whileHover={{ scale: cartItems.length > 0 ? 1.03 : 1 }}
            whileTap={{ scale: cartItems.length > 0 ? 0.97 : 1 }}
            title="Guardar como Presupuesto"
          >
            <FileText size={18} />
            Presupuesto
          </motion.button>
          <motion.button
            onClick={onCheckout}
            disabled={cartItems.length === 0}
            className={`flex-[2] rounded-md px-4 py-2 font-bold transition duration-150 ease-in-out ${cartItems.length === 0 ? 'cursor-not-allowed bg-zinc-500 text-zinc-400' : 'bg-green-600 text-white hover:bg-green-700'}`}
            whileHover={{ scale: cartItems.length > 0 ? 1.03 : 1 }}
            whileTap={{ scale: cartItems.length > 0 ? 0.97 : 1 }}
          >
            Cobrar
          </motion.button>
        </div>
      </div>
    </div>
  );
}
export default Cart;
