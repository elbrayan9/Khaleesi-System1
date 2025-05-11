// src/components/ProductTable.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { Edit, Trash2, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function ProductTable({
    products = [],
    onEdit,
    onDelete,
    formatCurrency,
    requestSort,
    sortConfig,
    // mostrarMensaje // Opcional: si quieres mostrar mensajes desde aquí
}) {

    const getSortIcon = (key) => {
        if (!sortConfig || sortConfig.key !== key) return <Minus className="h-3 w-3 inline-block ml-1 text-zinc-500 opacity-50" />;
        if (sortConfig.direction === 'ascending') return <ArrowUp className="h-4 w-4 inline-block ml-1 text-blue-400" />;
        return <ArrowDown className="h-4 w-4 inline-block ml-1 text-blue-400" />;
    };

    const headerButtonClasses = "flex items-center text-left text-xs font-medium text-zinc-300 uppercase tracking-wider hover:text-white focus:outline-none";

    const handleDeleteClick = (productId, productName) => {
        console.log(`ProductTable: Intentando eliminar producto. ID: ${productId}, Nombre: ${productName}`);
        // La verificación principal del ID ahora se hace en App.jsx antes de llamar a fsService.
        // ProductTable simplemente pasa el ID que tiene.
        // Si el ID es un ID local temporal (ej. con _id_original_invalid), App.jsx no procederá con la eliminación en Firestore.
        if (!productId) { // Aún es bueno tener una verificación básica aquí
             console.error("ProductTable ERROR: Se intentó eliminar un producto con ID nulo o indefinido (pasado a ProductTable).");
             alert("Error: El producto seleccionado tiene un ID faltante y no puede ser eliminado.");
             return;
        }
        onDelete(productId, productName);
    };

    const handleEditClick = (product) => {
        if (!product || !product.id || (typeof product.id === 'string' && product.id.startsWith("local_")) || product._id_original_invalid) {
            alert("Este producto tiene un ID temporal o inválido y no puede ser editado hasta que se sincronice correctamente con la base de datos.");
            return;
        }
        onEdit(product);
    };

    return (
        <Table>
            <TableHeader>
                <TableRow className="hover:bg-transparent border-b-zinc-700">
                    <TableHead><button onClick={() => requestSort('id')} className={headerButtonClasses}>ID {getSortIcon('id')}</button></TableHead>
                    <TableHead><button onClick={() => requestSort('nombre')} className={headerButtonClasses}>Nombre {getSortIcon('nombre')}</button></TableHead>
                    <TableHead>Cód. Barras</TableHead>
                    <TableHead className="text-right"><button onClick={() => requestSort('precio')} className={`${headerButtonClasses} justify-end w-full`}>Precio {getSortIcon('precio')}</button></TableHead>
                    <TableHead className="text-center"><button onClick={() => requestSort('stock')} className={`${headerButtonClasses} justify-center w-full`}>Stock {getSortIcon('stock')}</button></TableHead>
                    <TableHead className="text-center">Acciones</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {products.length === 0 ? (
                     <TableRow className="hover:bg-transparent border-b-zinc-700">
                        <TableCell colSpan={6} className="h-24 text-center text-zinc-400 italic">No hay productos disponibles.</TableCell>
                    </TableRow>
                ) : (
                    products.map((p) => (
                        <TableRow key={p.id || `product-fallback-${Math.random()}`} className="hover:bg-zinc-700/50 border-b-zinc-700">
                            <TableCell className="font-medium text-zinc-200 whitespace-nowrap">{p.id ? (p.id.startsWith("prod_flt_") || p.id.startsWith("local_") ? `${p.id.substring(0,12)}... (Local)` : p.id.substring(0,8)+"...") : 'SIN ID'}{p._id_original_invalid ? " (!)" : ""}</TableCell>
                            <TableCell className="text-zinc-200">{p.nombre}</TableCell>
                            <TableCell className="font-mono text-zinc-400">{p.codigoBarras || 'N/A'}</TableCell>
                            <TableCell className="text-right text-zinc-200 whitespace-nowrap">${formatCurrency(p.precio)}</TableCell>
                            <TableCell className="text-center text-zinc-200 whitespace-nowrap">{p.stock}</TableCell>
                            <TableCell className="text-center whitespace-nowrap">
                                <motion.button
                                    onClick={() => handleEditClick(p)}
                                    className="text-blue-400 hover:text-blue-300 mr-3 p-1 rounded"
                                    title="Editar"
                                    whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                    disabled={!p.id || p._id_original_invalid || (typeof p.id === 'string' && (p.id.startsWith("local_") || p.id.startsWith("prod_flt_")))}
                                >
                                    <Edit className="h-4 w-4 inline-block" />
                                </motion.button>
                                <motion.button
                                    onClick={() => handleDeleteClick(p.id, p.nombre)}
                                    className="text-red-500 hover:text-red-400 p-1 rounded"
                                    title="Eliminar"
                                    whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                    disabled={!p.id || p._id_original_invalid || (typeof p.id === 'string' && (p.id.startsWith("local_") || p.id.startsWith("prod_flt_")))}
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
export default ProductTable;