import React from 'react';
import { motion } from 'framer-motion';
import { X, Download } from 'lucide-react';

// Placeholder - DEBES DESARROLLAR ESTE COMPONENTE
function NotaDetailModal({
  isOpen,
  onClose,
  nota,
  formatCurrency,
  clientes,
  onPrint,
}) {
  if (!isOpen || !nota) return null;

  const clienteDeLaNota =
    clientes && nota.clienteId
      ? clientes.find((c) => c.id === nota.clienteId)
      : null;
  const clienteNombre = clienteDeLaNota
    ? clienteDeLaNota.nombre
    : nota.clienteNombre || 'Consumidor Final';

  // Animación para el modal (puedes copiar de SaleDetailModal)
  const modalVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, scale: 0.9, transition: { duration: 0.15 } },
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="relative flex max-h-[85vh] w-full max-w-lg flex-col rounded-lg bg-zinc-800 p-5 shadow-xl sm:p-6"
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between border-b border-zinc-700 pb-2">
          <h3 className="text-xl font-semibold text-white">
            Detalle Nota de {nota.tipo === 'credito' ? 'Crédito' : 'Débito'} #
            {(nota.id || '').substring(0, 8)}...
          </h3>
          <motion.button
            onClick={onClose}
            className="rounded-full p-1 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-white"
            aria-label="Cerrar modal"
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
          >
            <X className="h-5 w-5" />
          </motion.button>
        </div>

        <div className="flex-grow overflow-y-auto pr-2 text-sm">
          <div className="mb-3 grid grid-cols-2 gap-x-4 gap-y-1 text-zinc-300">
            <p>
              <strong>Fecha:</strong> {nota.fecha} {nota.hora}
            </p>
            <p>
              <strong>Tipo:</strong>{' '}
              <span
                className={`font-semibold capitalize ${nota.tipo === 'credito' ? 'text-red-400' : 'text-green-400'}`}
              >
                {nota.tipo}
              </span>
            </p>
            <p className="col-span-2">
              <strong>Cliente:</strong> {clienteNombre}
            </p>
            {nota.ventaRelacionadaId && (
              <p className="col-span-2">
                <strong>Venta Original ID:</strong> {nota.ventaRelacionadaId}
              </p>
            )}
            <p className="col-span-2">
              <strong>Motivo:</strong> {nota.motivo}
            </p>
            <p className="col-span-2 text-lg">
              <strong>Monto:</strong>{' '}
              <span
                className={`font-bold ${nota.tipo === 'credito' ? 'text-red-400' : 'text-green-400'}`}
              >
                ${formatCurrency(nota.monto)}
              </span>
            </p>
            {nota.cae && (
              <p className="col-span-2 mt-2 rounded border border-green-500/50 bg-green-900/20 p-2 text-center text-green-400">
                <strong>CAE:</strong> {nota.cae}
              </p>
            )}
          </div>

          {nota.itemsDevueltos && nota.itemsDevueltos.length > 0 && (
            <div className="mt-4 border-t border-zinc-700 pt-3">
              <h4 className="text-md mb-2 font-semibold text-zinc-200">
                Productos Devueltos:
              </h4>
              <ul className="list-inside list-disc space-y-1 pl-1 text-zinc-300">
                {nota.itemsDevueltos.map((item, index) => (
                  <li key={item.id + '_' + index}>
                    {item.nombre} (Cantidad: {item.cantidad})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="mt-5 flex justify-end gap-3 border-t border-zinc-700 pt-4">
          {onPrint && (
            <motion.button
              onClick={() => onPrint(nota.id, 'download')}
              className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 font-bold text-white transition hover:bg-blue-700"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <Download className="mr-2 h-4 w-4" />
              Descargar PDF
            </motion.button>
          )}
          <motion.button
            onClick={onClose}
            className="rounded-md bg-zinc-600 px-3 py-2 font-bold text-zinc-200 transition hover:bg-zinc-500"
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
export default NotaDetailModal;
