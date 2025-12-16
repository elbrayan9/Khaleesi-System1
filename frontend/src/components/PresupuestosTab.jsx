import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { formatCurrency } from '../utils/helpers';
import { generarPdfVenta } from '../services/pdfService';
import { Trash2, Printer, FileText, Search, Download } from 'lucide-react';

function PresupuestosTab() {
  const { presupuestos, handleDeleteBudget, datosNegocio, mostrarMensaje } =
    useAppContext();
  const [searchTerm, setSearchTerm] = useState('');

  // Filtrar presupuestos
  const filteredPresupuestos = presupuestos.filter((p) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      p.clienteNombre?.toLowerCase().includes(searchLower) ||
      p.id?.toLowerCase().includes(searchLower)
    );
  });

  const handlePrint = (presupuesto) => {
    if (!presupuesto) return;
    try {
      generarPdfVenta(
        presupuesto,
        datosNegocio,
        {
          nombre: presupuesto.clienteNombre,
          id: presupuesto.clienteId,
        },
        'PRESUPUESTO',
        'print',
      );
    } catch (error) {
      console.error('Error al generar PDF:', error);
      mostrarMensaje('Error al generar el PDF.', 'error');
    }
  };

  const handleDownload = (presupuesto) => {
    if (!presupuesto) return;
    try {
      generarPdfVenta(
        presupuesto,
        datosNegocio,
        {
          nombre: presupuesto.clienteNombre,
          id: presupuesto.clienteId,
        },
        'PRESUPUESTO',
        'download',
      );
    } catch (error) {
      console.error('Error al generar PDF:', error);
      mostrarMensaje('Error al generar el PDF.', 'error');
    }
  };

  return (
    <div className="p-4 text-zinc-100">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <h2 className="flex items-center gap-2 text-2xl font-bold text-white">
          <FileText className="h-8 w-8 text-yellow-500" />
          Presupuestos
        </h2>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar presupuesto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2 pl-10 pr-4 text-sm text-white focus:border-yellow-500 focus:outline-none"
          />
        </div>
      </div>

      {filteredPresupuestos.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-zinc-800/50 text-zinc-400">
          <FileText className="mb-4 h-12 w-12 opacity-50" />
          <p>No hay presupuestos guardados.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-700 bg-zinc-800 shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-300">
              <thead className="bg-zinc-900 text-xs uppercase text-zinc-400">
                <tr>
                  <th className="px-6 py-3">Fecha</th>
                  <th className="px-6 py-3">Cliente</th>
                  <th className="px-6 py-3 text-center">Items</th>
                  <th className="px-6 py-3 text-right">Total</th>
                  <th className="px-6 py-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-700">
                {filteredPresupuestos.map((presupuesto) => (
                  <tr
                    key={presupuesto.id}
                    className="transition-colors hover:bg-zinc-700/50"
                  >
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="font-medium text-white">
                        {presupuesto.fecha}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {presupuesto.hora}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-white">
                      {presupuesto.clienteNombre}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {presupuesto.items?.length || 0}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right font-bold text-green-400">
                      ${formatCurrency(presupuesto.total)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handlePrint(presupuesto)}
                          className="rounded-lg bg-blue-600/20 p-2 text-blue-400 transition-colors hover:bg-blue-600 hover:text-white"
                          title="Imprimir PDF"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDownload(presupuesto)}
                          className="rounded-lg bg-green-600/20 p-2 text-green-400 transition-colors hover:bg-green-600 hover:text-white"
                          title="Descargar PDF"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteBudget(presupuesto.id)}
                          className="rounded-lg bg-red-600/20 p-2 text-red-400 transition-colors hover:bg-red-600 hover:text-white"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default PresupuestosTab;
