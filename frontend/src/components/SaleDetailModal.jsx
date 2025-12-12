// src/components/SaleDetailModal.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { Download } from 'lucide-react';

function SaleDetailModal({
  isOpen,
  onClose,
  venta,
  formatCurrency,
  clienteInfo,
  datosNegocio,
  onPrint,
}) {
  if (!isOpen || !venta) return null;

  const clienteNombre =
    clienteInfo?.nombre || venta?.clienteNombre || 'Consumidor Final';
  const clienteCuit =
    clienteInfo?.cuit || (venta?.clienteId !== 0 ? 'No disponible' : '');

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
        className="relative flex max-h-[85vh] w-full max-w-xl flex-col rounded-lg bg-zinc-800 p-5 shadow-xl sm:p-6"
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between border-b border-zinc-700 pb-2">
          <h3 className="text-xl font-semibold text-white">
            Detalle Venta #{venta.id}
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

        <div className="flex-grow overflow-y-auto pr-2">
          <div className="mb-4 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-zinc-300">
            <p>
              <strong>Fecha:</strong> {venta.fecha}
            </p>
            <p>
              <strong>Hora:</strong> {venta.hora}
            </p>
            <p className="col-span-2 sm:col-span-1">
              <strong>Cliente:</strong> {clienteNombre}
            </p>
            {clienteCuit && (
              <p>
                <strong>CUIT/CUIL:</strong> {clienteCuit}
              </p>
            )}
            {venta.vendedorNombre && (
              <p className="col-span-2 sm:col-span-1">
                <strong>Atendido por:</strong> {venta.vendedorNombre}
              </p>
            )}
            <div className="col-span-2 sm:col-span-1">
              <strong>Método Pago:</strong>
              <div className="pl-2">
                {venta.pagos && venta.pagos.length > 0 ? (
                  venta.pagos.map((p, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="capitalize text-zinc-400">
                        {p.metodo.replace('_', ' ')}:
                      </span>
                      <span className="font-medium text-zinc-300">
                        ${formatCurrency(p.monto)}
                      </span>
                    </div>
                  ))
                ) : (
                  <span className="capitalize">
                    {venta.metodoPago || 'N/A'}
                  </span>
                )}
              </div>
            </div>
            <p>
              <strong>Tipo Factura:</strong> {venta.tipoFactura || 'N/A'}
            </p>
          </div>

          <h4 className="text-md mb-2 font-semibold text-zinc-200">
            Productos Vendidos:
          </h4>
          <div className="overflow-hidden rounded-md border border-zinc-700">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-700">
                <tr>
                  <th
                    scope="col"
                    className="px-3 py-2 text-left font-medium uppercase tracking-wider text-zinc-300"
                  >
                    Producto
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2 text-center font-medium uppercase tracking-wider text-zinc-300"
                  >
                    Cant.
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2 text-right font-medium uppercase tracking-wider text-zinc-300"
                  >
                    P. Unit.
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2 text-right font-medium uppercase tracking-wider text-zinc-300"
                  >
                    Subtotal
                  </th>
                </tr>
              </thead>
              {/* --- SECCIÓN MODIFICADA --- */}
              <tbody className="divide-y divide-zinc-700 bg-zinc-800">
                {venta.items && venta.items.length > 0 ? (
                  venta.items.map((item, index) => (
                    <tr key={index}>
                      <td className="whitespace-nowrap px-3 py-2">
                        <p className="text-zinc-200">{item.nombre}</p>
                        {/* Mostramos el descuento solo si existe */}
                        {item.descuentoPorcentaje > 0 && (
                          <p className="text-xs text-green-400">
                            (Orig: ${formatCurrency(item.precioOriginal)} -{' '}
                            {item.descuentoPorcentaje}%)
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center text-zinc-200">
                        {item.cantidad}
                      </td>
                      {/* Usamos precioFinal para el precio unitario */}
                      <td className="px-3 py-2 text-right text-zinc-200">
                        ${formatCurrency(item.precioFinal)}
                      </td>
                      {/* Calculamos el subtotal con el precioFinal */}
                      <td className="px-3 py-2 text-right text-zinc-200">
                        ${formatCurrency(item.precioFinal * item.cantidad)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="4"
                      className="px-3 py-4 text-center italic text-zinc-400"
                    >
                      No hay detalles de items.
                    </td>
                  </tr>
                )}
              </tbody>
              {/* --- FIN DE LA SECCIÓN MODIFICADA --- */}
              <tfoot>
                <tr className="border-t-2 border-zinc-600 bg-zinc-700">
                  <td
                    colSpan="3"
                    className="px-3 py-2 text-right font-bold text-zinc-100"
                  >
                    TOTAL:
                  </td>
                  <td className="px-3 py-2 text-right font-bold text-zinc-100">
                    ${formatCurrency(venta.total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-3 border-t border-zinc-700 pt-4">
          {onPrint && (
            <motion.button
              onClick={() => onPrint(venta, 'download')}
              className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 font-bold text-white transition duration-150 ease-in-out hover:bg-blue-700"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <Download className="mr-2 h-4 w-4" />
              Descargar PDF
            </motion.button>
          )}
          <motion.button
            onClick={onClose}
            className="rounded-md bg-zinc-600 px-4 py-2 font-bold text-zinc-200 transition duration-150 ease-in-out hover:bg-zinc-500"
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
