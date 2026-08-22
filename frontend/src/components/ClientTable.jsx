// src/components/ClientTable.jsx
import React from 'react';
import { motion } from 'framer-motion';
import {
  Edit,
  Trash2,
  ArrowUp,
  ArrowDown,
  Minus,
  Notebook,
  MessageCircle,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'; //
import { formatCurrency } from '../utils/helpers';
import { useAppContext } from '../context/AppContext.jsx';

function ClientTable({
  clients = [],
  onEdit,
  onDelete,
  requestSort,
  sortConfig,
  getSaldoCliente,
  onCuentaCorriente,
}) {
  const { datosNegocio, mostrarMensaje } = useAppContext();

  // Abre WhatsApp con un recordatorio de deuda para el cliente.
  const recordarDeuda = (cliente, saldo) => {
    let tel = String(cliente.telefono || '').replace(/\D/g, '');
    if (!tel) {
      mostrarMensaje?.(
        'Este cliente no tiene teléfono cargado.',
        'warning',
      );
      return;
    }
    if (!tel.startsWith('54')) tel = `549${tel}`;
    const negocio = datosNegocio?.nombre || 'nuestro comercio';
    const texto =
      `Hola ${cliente.nombre || ''}! 👋 Te recordamos que tenés un saldo ` +
      `pendiente de $${formatCurrency(saldo)} en ${negocio}. ` +
      `Cualquier duda, avisanos. ¡Gracias!`;
    window.open(
      `https://wa.me/${tel}?text=${encodeURIComponent(texto)}`,
      '_blank',
      'noopener,noreferrer',
    );
  };
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

  const isActionDisabled = (client) =>
    !client.id ||
    client._id_original_invalid ||
    (typeof client.id === 'string' &&
      (client.id.startsWith('local_') || client.id.includes('_inv_')));

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-b-zinc-700 hover:bg-transparent">
          <TableHead>
            <button
              onClick={() => requestSort('id')}
              className={headerButtonClasses}
            >
              ID {getSortIcon('id')}
            </button>
          </TableHead>
          <TableHead>
            <button
              onClick={() => requestSort('nombre')}
              className={headerButtonClasses}
            >
              Nombre {getSortIcon('nombre')}
            </button>
          </TableHead>
          <TableHead>
            <button
              onClick={() => requestSort('cuit')}
              className={headerButtonClasses}
            >
              CUIT/CUIL/DNI {getSortIcon('cuit')}
            </button>
          </TableHead>
          <TableHead className="text-right text-xs font-medium uppercase tracking-wider text-zinc-300">
            Saldo
          </TableHead>
          <TableHead className="text-center">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {clients.length === 0 ? (
          <TableRow className="border-b-zinc-700 hover:bg-transparent">
            <TableCell
              colSpan={5}
              className="h-24 text-center italic text-zinc-400"
            >
              No hay clientes.
            </TableCell>
          </TableRow>
        ) : (
          clients.map((c) => (
            <TableRow
              key={c.id || `client-fallback-${Math.random()}`}
              className="border-b-zinc-700 hover:bg-zinc-700/50"
            >
              <TableCell className="whitespace-nowrap font-medium text-zinc-200">
                {c.id
                  ? c.id.startsWith('cli_inv_') ||
                    c.id.startsWith('local_') ||
                    c.id.includes('_init_')
                    ? `${c.id.substring(0, 10)}... (Local)`
                    : c.id.substring(0, 8) + '...'
                  : 'SIN ID'}
                {c._id_original_invalid ? ' (!)' : ''}
              </TableCell>
              <TableCell className="text-zinc-200">
                {c.nombre}
                {datosNegocio?.puntosActivo && (c.puntos ?? 0) > 0 && (
                  <span className="ml-2 rounded-full bg-amber-500/20 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
                    ⭐ {c.puntos} pts
                  </span>
                )}
              </TableCell>
              <TableCell className="text-zinc-400">{c.cuit || 'N/A'}</TableCell>
              <TableCell className="whitespace-nowrap text-right">
                {(() => {
                  const saldo = getSaldoCliente ? getSaldoCliente(c.id) : 0;
                  if (saldo > 0)
                    return (
                      <span className="font-semibold text-red-400">
                        Debe ${formatCurrency(saldo)}
                      </span>
                    );
                  if (saldo < 0)
                    return (
                      <span className="font-semibold text-green-400">
                        A favor ${formatCurrency(Math.abs(saldo))}
                      </span>
                    );
                  return <span className="text-zinc-500">—</span>;
                })()}
              </TableCell>
              <TableCell className="whitespace-nowrap text-center">
                {(() => {
                  const saldo = getSaldoCliente ? getSaldoCliente(c.id) : 0;
                  if (saldo > 0)
                    return (
                      <motion.button
                        onClick={() => recordarDeuda(c, saldo)}
                        className="mr-3 rounded p-1 text-green-400 hover:text-green-300"
                        title="Recordar deuda por WhatsApp"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        disabled={isActionDisabled(c)}
                      >
                        <MessageCircle className="inline-block h-4 w-4" />
                      </motion.button>
                    );
                  return null;
                })()}
                {onCuentaCorriente && (
                  <motion.button
                    onClick={() => onCuentaCorriente(c)}
                    className="mr-3 rounded p-1 text-amber-400 hover:text-amber-300"
                    title="Cuenta corriente"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    disabled={isActionDisabled(c)}
                  >
                    <Notebook className="inline-block h-4 w-4" />
                  </motion.button>
                )}
                <motion.button
                  onClick={() => onEdit(c)}
                  className="mr-3 rounded p-1 text-blue-400 hover:text-blue-300"
                  title="Editar"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  disabled={isActionDisabled(c)}
                >
                  <Edit className="inline-block h-4 w-4" />
                </motion.button>
                <motion.button
                  onClick={() => onDelete(c.id, c.nombre)}
                  className="rounded p-1 text-red-500 hover:text-red-400"
                  title="Eliminar"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  disabled={isActionDisabled(c)}
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
export default ClientTable;
