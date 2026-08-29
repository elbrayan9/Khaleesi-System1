// src/components/ProductTable.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { Edit, Trash2, ArrowUp, ArrowDown, Minus, QrCode } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency } from '@/utils/helpers'; // CORREGIDO: Usando el alias @

function ProductTable({
  products = [],
  onEdit,
  onDelete,
  requestSort,
  sortConfig,
  onGenerateQR,
  selectedProductIds,
  onProductSelect,
  onSelectAll,
}) {
  const getSortIcon = (key) => {
    if (!sortConfig || sortConfig.key !== key)
      return (
        <Minus className="ml-1 inline-block h-3 w-3 text-zinc-500 opacity-50" />
      );
    if (sortConfig.direction === 'ascending')
      return <ArrowUp className="ml-1 inline-block h-4 w-4 text-blue-400" />;
    return <ArrowDown className="ml-1 inline-block h-4 w-4 text-blue-400" />;
  };

  const headerButtonClasses =
    'flex items-center text-left text-xs font-medium text-zinc-300 uppercase tracking-wider hover:text-white focus:outline-none';

  const handleDeleteClick = (productId, productName) => {
    if (!productId) {
      console.error('ProductTable ERROR: ID de producto nulo para eliminar.');
      alert(
        'Error: El producto seleccionado tiene un ID faltante y no puede ser eliminado.',
      );
      return;
    }
    onDelete(productId, productName);
  };

  const handleEditClick = (product) => {
    onEdit(product);
  };

  const isActionDisabled = (product) =>
    !product.id ||
    product._id_original_invalid ||
    (typeof product.id === 'string' &&
      (product.id.startsWith('local_') || product.id.startsWith('prod_flt_')));

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-b-zinc-700 hover:bg-transparent">
          <TableHead className="w-[40px]">
            <input
              type="checkbox"
              className="cursor-pointer"
              checked={
                products.length > 0 &&
                selectedProductIds.size === products.length
              }
              onChange={() =>
                onSelectAll(selectedProductIds.size === products.length)
              }
            />
          </TableHead>
          <TableHead>
            <button
              onClick={() => requestSort('id')}
              className={headerButtonClasses}
            >
              ID {getSortIcon('id')}
            </button>
          </TableHead>
          <TableHead className="w-[56px]">Foto</TableHead>
          <TableHead>
            <button
              onClick={() => requestSort('nombre')}
              className={headerButtonClasses}
            >
              Nombre {getSortIcon('nombre')}
            </button>
          </TableHead>
          <TableHead className="hidden xl:table-cell">Cód. Barras</TableHead>
          <TableHead className="text-right">
            <button
              onClick={() => requestSort('precio')}
              className={`${headerButtonClasses} w-full justify-end`}
            >
              Precio {getSortIcon('precio')}
            </button>
          </TableHead>
          <TableHead className="text-center">
            <button
              onClick={() => requestSort('stock')}
              className={`${headerButtonClasses} w-full justify-center`}
            >
              Stock {getSortIcon('stock')}
            </button>
          </TableHead>
          <TableHead className="hidden xl:table-cell">Categoría</TableHead>
          <TableHead className="text-center">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.length === 0 ? (
          <TableRow className="border-b-zinc-700 hover:bg-transparent">
            <TableCell
              colSpan={9}
              className="h-24 text-center italic text-zinc-400"
            >
              No hay productos disponibles.
            </TableCell>
          </TableRow>
        ) : (
          products.map((p) => (
            <TableRow
              key={p.id || `product-fallback-${Math.random()}`}
              className="border-b-zinc-700 hover:bg-zinc-700/50"
            >
              {/* Celda 1: Checkbox */}
              <TableCell>
                <input
                  type="checkbox"
                  className="h-4 w-4 cursor-pointer rounded border-zinc-600 bg-zinc-700 text-blue-500 focus:ring-blue-600"
                  checked={selectedProductIds.has(p.id)}
                  onChange={() => onProductSelect(p.id)}
                />
              </TableCell>

              {/* Celda 2: ID */}
              <TableCell className="whitespace-nowrap font-medium text-zinc-200">
                {p.id
                  ? p.id.startsWith('prod_flt_') ||
                    p.id.startsWith('local_') ||
                    p.id.includes('_inv_') ||
                    p.id.includes('_init_')
                    ? `${p.id.substring(0, 10)}... (Local)`
                    : p.id.substring(0, 8) + '...'
                  : 'SIN ID'}
                {p._id_original_invalid ? ' (!)' : ''}
              </TableCell>

              {/* Foto (miniatura) */}
              <TableCell>
                {p.imagenUrl ? (
                  <img
                    src={p.imagenUrl}
                    alt={p.nombre}
                    className="h-10 w-10 rounded object-cover ring-1 ring-zinc-700"
                    loading="lazy"
                  />
                ) : (
                  <div className="h-10 w-10 rounded bg-zinc-700/40" />
                )}
              </TableCell>

              {/* El resto de las celdas siguen igual */}
              <TableCell className="text-zinc-200">
                {p.nombre}
                {p.fechaVencimiento &&
                  (() => {
                    const dias = Math.ceil(
                      (new Date(p.fechaVencimiento) - new Date()) / 86400000,
                    );
                    const cls =
                      dias < 0
                        ? 'text-red-400'
                        : dias <= 30
                          ? 'text-amber-400'
                          : 'text-zinc-500';
                    const txt =
                      dias < 0
                        ? 'Vencido'
                        : `Vence ${new Date(
                            p.fechaVencimiento,
                          ).toLocaleDateString('es-AR')}`;
                    return (
                      <span className={`block text-[11px] ${cls}`}>
                        ⏰ {txt}
                      </span>
                    );
                  })()}
              </TableCell>
              <TableCell className="hidden font-mono text-zinc-400 xl:table-cell">
                {p.codigoBarras || 'N/A'}
              </TableCell>
              <TableCell className="whitespace-nowrap text-right text-zinc-200">
                ${formatCurrency(p.precio)}
              </TableCell>
              <TableCell className="whitespace-nowrap text-center text-zinc-200">
                {p.stock}
              </TableCell>
              <TableCell className="hidden text-zinc-400 xl:table-cell">
                {p.categoria || 'N/A'}
              </TableCell>

              {/* Celda final: Acciones */}
              <TableCell className="whitespace-nowrap text-center">
                <motion.button
                  onClick={() => onGenerateQR(p)}
                  className="mr-3 rounded p-1 text-gray-400 hover:text-white"
                  title="Generar QR"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  disabled={isActionDisabled(p)}
                >
                  <QrCode className="inline-block h-4 w-4" />
                </motion.button>
                <motion.button
                  onClick={() => handleEditClick(p)}
                  className="mr-3 rounded p-1 text-blue-400 hover:text-blue-300"
                  title="Editar"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  disabled={isActionDisabled(p)}
                >
                  <Edit className="inline-block h-4 w-4" />
                </motion.button>
                <motion.button
                  onClick={() => handleDeleteClick(p.id, p.nombre)}
                  className="rounded p-1 text-red-500 hover:text-red-400"
                  title="Eliminar"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  disabled={isActionDisabled(p)}
                >
                  <Trash2 className="inline-block h-4 w-4" />
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
