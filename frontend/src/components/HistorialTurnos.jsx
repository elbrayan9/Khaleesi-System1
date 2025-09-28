// frontend/src/components/HistorialTurnos.jsx
import React from 'react';
import { useAppContext } from '../context/AppContext';
import { formatCurrency } from '../utils/helpers';
import { motion } from 'framer-motion';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { History } from 'lucide-react';

const HistorialTurnos = () => {
  const { turnos } = useAppContext();

  // Filtramos para mostrar solo los turnos cerrados y los ordenamos del más reciente al más antiguo
  const turnosCerrados = turnos
    .filter((t) => t.estado === 'cerrado')
    .sort((a, b) => new Date(b.fechaCierre) - new Date(a.fechaCierre));

  return (
    <div className="mt-6 rounded-lg bg-zinc-800 p-4 shadow-md">
      <h3 className="mb-4 flex items-center gap-2 text-lg font-medium text-white">
        <History size={18} />
        Historial de Cierres de Caja
      </h3>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-b-zinc-700">
              <TableHead className="text-white">Fecha Cierre</TableHead>
              <TableHead className="text-white">Vendedor</TableHead>
              <TableHead className="text-right text-white">
                Monto Inicial
              </TableHead>
              <TableHead className="text-right text-white">
                Ventas del Turno
              </TableHead>
              <TableHead className="text-right text-white">
                Total en Caja
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {turnosCerrados.length > 0 ? (
              turnosCerrados.map((turno) => (
                <motion.tr
                  key={turno.id}
                  className="border-b-zinc-700/50"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <TableCell>
                    {turno.fechaCierre} - {turno.horaCierre}
                  </TableCell>
                  <TableCell className="font-medium text-zinc-200">
                    {turno.vendedorNombre}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(turno.montoInicial)}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-green-400">
                    {formatCurrency(turno.totalVentas)}
                  </TableCell>
                  <TableCell className="text-right font-bold text-cyan-400">
                    {formatCurrency(turno.totalFinal)}
                  </TableCell>
                </motion.tr>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-8 text-center text-zinc-400"
                >
                  No hay turnos cerrados para mostrar.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default HistorialTurnos;
