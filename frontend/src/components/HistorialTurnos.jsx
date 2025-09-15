// frontend/src/components/HistorialTurnos.jsx
import React from 'react';
import { useAppContext } from '../context/AppContext';
import { formatCurrency } from '../utils/helpers';
import { motion } from 'framer-motion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { History } from 'lucide-react';

const HistorialTurnos = () => {
    const { turnos } = useAppContext();

    // Filtramos para mostrar solo los turnos cerrados y los ordenamos del más reciente al más antiguo
    const turnosCerrados = turnos
        .filter(t => t.estado === 'cerrado')
        .sort((a, b) => new Date(b.fechaCierre) - new Date(a.fechaCierre));

    return (
        <div className="bg-zinc-800 p-4 rounded-lg shadow-md mt-6">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                <History size={18} />
                Historial de Cierres de Caja
            </h3>
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="border-b-zinc-700">
                            <TableHead className="text-white">Fecha Cierre</TableHead>
                            <TableHead className="text-white">Vendedor</TableHead>
                            <TableHead className="text-white text-right">Monto Inicial</TableHead>
                            <TableHead className="text-white text-right">Ventas del Turno</TableHead>
                            <TableHead className="text-white text-right">Total en Caja</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {turnosCerrados.length > 0 ? (
                            turnosCerrados.map(turno => (
                                <motion.tr 
                                    key={turno.id}
                                    className="border-b-zinc-700/50"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                >
                                    <TableCell>{turno.fechaCierre} - {turno.horaCierre}</TableCell>
                                    <TableCell className="font-medium text-zinc-200">{turno.vendedorNombre}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(turno.montoInicial)}</TableCell>
                                    <TableCell className="text-right text-green-400 font-semibold">{formatCurrency(turno.totalVentas)}</TableCell>
                                    <TableCell className="text-right text-cyan-400 font-bold">{formatCurrency(turno.totalFinal)}</TableCell>
                                </motion.tr>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center text-zinc-400 py-8">
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