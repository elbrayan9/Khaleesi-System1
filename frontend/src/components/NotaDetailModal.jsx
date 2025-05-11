// src/components/NotaDetailModal.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

// Placeholder - DEBES DESARROLLAR ESTE COMPONENTE
function NotaDetailModal({ isOpen, onClose, nota, formatCurrency, clientes }) {
    if (!isOpen || !nota) return null;

    const clienteDeLaNota = clientes && nota.clienteId ? clientes.find(c => c.id === nota.clienteId) : null;
    const clienteNombre = clienteDeLaNota ? clienteDeLaNota.nombre : nota.clienteNombre || 'Consumidor Final';


    // Animación para el modal (puedes copiar de SaleDetailModal)
    const modalVariants = {
        hidden: { opacity: 0, scale: 0.9 },
        visible: { opacity: 1, scale: 1, transition: { duration: 0.2 } },
        exit: { opacity: 0, scale: 0.9, transition: { duration: 0.15 } }
    };

    return (
        <motion.div
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
        >
            <motion.div
                className="bg-zinc-800 rounded-lg shadow-xl p-5 sm:p-6 w-full max-w-lg relative max-h-[85vh] flex flex-col"
                variants={modalVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-4 border-b border-zinc-700 pb-2">
                    <h3 className="text-xl font-semibold text-white">
                        Detalle Nota de {nota.tipo === 'credito' ? 'Crédito' : 'Débito'} #{(nota.id || '').substring(0,8)}...
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

                <div className="overflow-y-auto flex-grow pr-2 text-sm">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-3 text-zinc-300">
                        <p><strong>Fecha:</strong> {nota.fecha} {nota.hora}</p>
                        <p><strong>Tipo:</strong> <span className={`capitalize font-semibold ${nota.tipo === 'credito' ? 'text-red-400' : 'text-green-400'}`}>{nota.tipo}</span></p>
                        <p className="col-span-2"><strong>Cliente:</strong> {clienteNombre}</p>
                        {nota.ventaRelacionadaId && <p className="col-span-2"><strong>Venta Original ID:</strong> {nota.ventaRelacionadaId}</p>}
                        <p className="col-span-2"><strong>Motivo:</strong> {nota.motivo}</p>
                        <p className="col-span-2 text-lg"><strong>Monto:</strong> <span className={`font-bold ${nota.tipo === 'credito' ? 'text-red-400' : 'text-green-400'}`}>${formatCurrency(nota.monto)}</span></p>
                    </div>

                    {nota.itemsDevueltos && nota.itemsDevueltos.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-zinc-700">
                            <h4 className="text-md font-semibold mb-2 text-zinc-200">Productos Devueltos:</h4>
                            <ul className="list-disc list-inside pl-1 space-y-1 text-zinc-300">
                                {nota.itemsDevueltos.map((item, index) => (
                                    <li key={item.id + '_' + index}>
                                        {item.nombre} (Cantidad: {item.cantidad})
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                <div className="mt-5 pt-4 border-t border-zinc-700 text-right">
                    <motion.button
                      onClick={onClose}
                      className="bg-zinc-600 hover:bg-zinc-500 text-zinc-200 font-bold py-2 px-3 rounded-md transition"
                      whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    >
                        Cerrar
                    </motion.button>
                </div>
            </motion.div>
        </motion.div>
    );
}
export default NotaDetailModal;