// src/components/ClientTable.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { Edit, Trash2, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"; //

function ClientTable({ clients = [], onEdit, onDelete, requestSort, sortConfig }) {
    const getSortIcon = (key) => {
        if (!sortConfig || sortConfig.key !== key) return <Minus className="h-3 w-3 inline-block ml-1 text-zinc-500 opacity-50" />;
        if (sortConfig.direction === 'ascending') return <ArrowUp className="h-4 w-4 inline-block ml-1 text-blue-400" />;
        return <ArrowDown className="h-4 w-4 inline-block ml-1 text-blue-400" />;
    };

    const headerButtonClasses = "flex items-center text-left text-xs font-medium text-zinc-300 uppercase tracking-wider hover:text-white focus:outline-none";
    
    const isActionDisabled = (client) => !client.id || client._id_original_invalid || (typeof client.id === 'string' && (client.id.startsWith("local_") || client.id.includes("_inv_")));


     return (
        <Table>
            <TableHeader>
                <TableRow className="hover:bg-transparent border-b-zinc-700">
                    <TableHead>
                        <button onClick={() => requestSort('id')} className={headerButtonClasses}>ID {getSortIcon('id')}</button>
                    </TableHead>
                    <TableHead>
                        <button onClick={() => requestSort('nombre')} className={headerButtonClasses}>Nombre {getSortIcon('nombre')}</button>
                    </TableHead>
                    <TableHead>
                        <button onClick={() => requestSort('cuit')} className={headerButtonClasses}>CUIT/CUIL/DNI {getSortIcon('cuit')}</button>
                    </TableHead>
                    <TableHead className="text-center">Acciones</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {clients.length === 0 ? (
                    <TableRow className="hover:bg-transparent border-b-zinc-700">
                        <TableCell colSpan={4} className="h-24 text-center text-zinc-400 italic">
                            No hay clientes.
                        </TableCell>
                    </TableRow>
                ) : (
                    clients.map(c => (
                        <TableRow key={c.id || `client-fallback-${Math.random()}`} className="hover:bg-zinc-700/50 border-b-zinc-700">
                             <TableCell className="font-medium text-zinc-200 whitespace-nowrap">{c.id ? (c.id.startsWith("cli_inv_") || c.id.startsWith("local_") || c.id.includes("_init_") ? `${c.id.substring(0,10)}... (Local)` : c.id.substring(0,8)+"...") : 'SIN ID'}{c._id_original_invalid ? " (!)" : ""}</TableCell>
                            <TableCell className="text-zinc-200">{c.nombre}</TableCell>
                            <TableCell className="text-zinc-400">{c.cuit || 'N/A'}</TableCell>
                            <TableCell className="text-center whitespace-nowrap">
                                <motion.button 
                                    onClick={() => onEdit(c)} 
                                    className="text-blue-400 hover:text-blue-300 mr-3 p-1 rounded" 
                                    title="Editar" 
                                    whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                    disabled={isActionDisabled(c)}
                                >
                                    <Edit className="h-4 w-4 inline-block" />
                                </motion.button>
                                <motion.button 
                                    onClick={() => onDelete(c.id, c.nombre)} 
                                    className="text-red-500 hover:text-red-400 p-1 rounded" 
                                    title="Eliminar" 
                                    whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                    disabled={isActionDisabled(c)}
                                >
                                    <Trash2 className="h-4 w-4 inline-block" />
                                </motion.button>
                            </TableCell>
                        </TableRow>
                    ))
                )}
            </TableBody>
        </Table>
    );
}
export default ClientTable;