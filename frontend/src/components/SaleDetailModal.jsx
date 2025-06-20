import React from 'react';
import { motion } from 'framer-motion'; // Para animación opcional del modal
import { X } from 'lucide-react'; // Icono para cerrar

/**
 * Modal para mostrar los detalles de una venta específica.
 * Adaptado para tema oscuro Zinc.
 */
function SaleDetailModal({ isOpen, onClose, venta, formatCurrency, clienteInfo }) {
  if (!isOpen || !venta) return null;

  const clienteNombre = clienteInfo?.nombre || venta?.clienteNombre || 'Consumidor Final';
  const clienteCuit = clienteInfo?.cuit || (venta?.clienteId !== 0 ? 'No disponible' : '');

  // Animación para el modal
  const modalVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, scale: 0.9, transition: { duration: 0.15 } }
  };

  return (
    // Fondo semi-transparente oscuro
    <motion.div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose} // Cerrar al hacer clic en el fondo
    >
      {/* Contenedor del modal oscuro con animación */}
      <motion.div
        className="bg-zinc-800 rounded-lg shadow-xl p-5 sm:p-6 w-full max-w-xl relative max-h-[85vh] flex flex-col" // max-w-xl para más ancho, flex-col
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={(e) => e.stopPropagation()} // Evitar que el clic dentro cierre el modal
      >
        {/* Encabezado del Modal */}
        <div className="flex justify-between items-center mb-4 border-b border-zinc-700 pb-2">
            <h3 className="text-xl font-semibold text-white">
            Detalle Venta #{venta.id}
            </h3>
            <motion.button
                onClick={onClose}
                className="text-zinc-400 hover:text-white transition-colors p-1 rounded-full hover:bg-zinc-700"
                aria-label="Cerrar modal"
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
            >
                <X className="h-5 w-5" />
            </motion.button>
        </div>

        {/* Contenido Scrollable */}
        <div className="overflow-y-auto flex-grow pr-2"> {/* Padding derecho para scrollbar */}
            {/* Información General */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mb-4 text-zinc-300">
                <p><strong>Fecha:</strong> {venta.fecha}</p>
                <p><strong>Hora:</strong> {venta.hora}</p>
                <p className="col-span-2 sm:col-span-1"><strong>Cliente:</strong> {clienteNombre}</p>
                {clienteCuit && <p><strong>CUIT/CUIL:</strong> {clienteCuit}</p>}
                <p><strong>Método Pago:</strong> <span className="capitalize">{venta.metodoPago?.replace('_', ' ') || 'N/A'}</span></p>
                <p><strong>Tipo Factura:</strong> {venta.tipoFactura || 'N/A'}</p>
            </div>

            {/* Tabla de Items */}
            <h4 className="text-md font-semibold mb-2 text-zinc-200">Productos Vendidos:</h4>
            <div className="border border-zinc-700 rounded-md overflow-hidden"> {/* Contenedor tabla */}
            <table className="min-w-full text-sm">
                <thead className="bg-zinc-700">
                <tr>
                    <th scope="col" className="px-3 py-2 text-left font-medium text-zinc-300 uppercase tracking-wider">Producto</th>
                    <th scope="col" className="px-3 py-2 text-center font-medium text-zinc-300 uppercase tracking-wider">Cant.</th>
                    <th scope="col" className="px-3 py-2 text-right font-medium text-zinc-300 uppercase tracking-wider">P. Unit.</th>
                    <th scope="col" className="px-3 py-2 text-right font-medium text-zinc-300 uppercase tracking-wider">Subtotal</th>
                </tr>
                </thead>
                <tbody className="bg-zinc-800 divide-y divide-zinc-700">
                {venta.items && venta.items.length > 0 ? (
                    venta.items.map((item, index) => (
                    <tr key={index}>
                        <td className="px-3 py-2 whitespace-nowrap text-zinc-200">{item.nombre}</td>
                        <td className="px-3 py-2 text-center text-zinc-200">{item.cantidad}</td>
                        <td className="px-3 py-2 text-right text-zinc-200">${formatCurrency(item.precio)}</td>
                        <td className="px-3 py-2 text-right text-zinc-200">${formatCurrency(item.precio * item.cantidad)}</td>
                    </tr>
                    ))
                ) : (
                    <tr>
                    <td colSpan="4" className="px-3 py-4 text-center text-zinc-400 italic">No hay detalles de items.</td>
                    </tr>
                )}
                </tbody>
                {/* Pie de tabla con Total */}
                <tfoot>
                    <tr className="border-t-2 border-zinc-600 bg-zinc-700">
                        <td colSpan="3" className="px-3 py-2 text-right font-bold text-zinc-100">TOTAL:</td>
                        <td className="px-3 py-2 text-right font-bold text-zinc-100">${formatCurrency(venta.total)}</td>
                    </tr>
                </tfoot>
            </table>
            </div>
        </div>

         {/* Botón Cerrar inferior */}
         <div className="mt-5 pt-4 border-t border-zinc-700 text-right">
            <motion.button
              onClick={onClose}
              className="bg-zinc-600 hover:bg-zinc-500 text-zinc-200 font-bold py-2 px-4 rounded-md transition duration-150 ease-in-out"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
                Cerrar
            </motion.button>
         </div>

      </motion.div>
    </motion.div>
  );
}

export default SaleDetailModal;
