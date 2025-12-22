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
import {
  History,
  Receipt,
  Info,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import Swal from 'sweetalert2';

const HistorialTurnos = () => {
  const { turnos } = useAppContext();

  // Filtramos para mostrar solo los turnos cerrados y los ordenamos del más reciente al más antiguo
  const turnosCerrados = turnos
    .filter((t) => t.estado === 'cerrado')
    .sort((a, b) => {
      const parseDateTime = (dateStr, timeStr) => {
        if (!dateStr) return 0;

        // 1. Normalizar fecha (DD/MM/YYYY -> YYYY-MM-DD)
        let formattedDate = dateStr.trim();
        if (formattedDate.includes('/')) {
          const [day, month, year] = formattedDate.split('/');
          formattedDate = `${year.trim()}-${month.trim().padStart(2, '0')}-${day.trim().padStart(2, '0')}`;
        } else if (
          formattedDate.includes('-') &&
          formattedDate.split('-')[0].length === 2
        ) {
          // Si viene como DD-MM-YYYY
          const [day, month, year] = formattedDate.split('-');
          formattedDate = `${year.trim()}-${month.trim().padStart(2, '0')}-${day.trim().padStart(2, '0')}`;
        }

        // 2. Normalizar hora (hh:mm a. m. -> HH:mm)
        let formattedTime = (timeStr || '00:00').trim();

        // Si tiene formato AM/PM (con o sin puntos, con o sin espacios)
        if (formattedTime.match(/[ap]\.?\s*m\.?/i)) {
          // Limpiar sufijos para obtener solo la hora y el indicador
          const isPM = formattedTime.toLowerCase().includes('p');
          // Eliminar todo lo que no sea números o dos puntos para obtener "hh:mm"
          let [hours, minutes] = formattedTime
            .replace(/[^0-9:]/g, '')
            .split(':');

          hours = parseInt(hours, 10);

          // Ajuste de 12h a 24h
          if (isPM && hours < 12) hours += 12;
          if (!isPM && hours === 12) hours = 0;

          // Formatear a HH:mm
          formattedTime = `${hours.toString().padStart(2, '0')}:${minutes}`;
        }

        const finalDateStr = `${formattedDate}T${formattedTime}`;
        const timestamp = new Date(finalDateStr).getTime();

        return isNaN(timestamp) ? 0 : timestamp;
      };

      return (
        parseDateTime(b.fechaCierre, b.horaCierre) -
        parseDateTime(a.fechaCierre, a.horaCierre)
      );
    });

  const handleVerInfo = (turno) => {
    const diferencia = (turno.montoReal || 0) - (turno.totalFinal || 0);
    const diferenciaClass =
      diferencia === 0
        ? 'text-zinc-400'
        : diferencia > 0
          ? 'text-blue-400'
          : 'text-red-400';
    const diferenciaSigno = diferencia > 0 ? '+' : '';

    Swal.fire({
      title: `<span class="text-xl font-bold text-white">Auditoría de Cierre</span>`,
      html: `
        <div class="text-left space-y-3 text-sm text-zinc-300">
          <div class="flex justify-between border-b border-zinc-700 pb-2">
            <span>Fecha:</span>
            <span class="text-white">${turno.fechaCierre} - ${turno.horaCierre}</span>
          </div>
          <div class="flex justify-between border-b border-zinc-700 pb-2">
            <span>Cajero:</span>
            <span class="text-white font-medium">${turno.vendedorNombre}</span>
          </div>
          
          <div class="grid grid-cols-2 gap-4 pt-2">
            <div>
              <p class="text-xs text-zinc-500">Monto Inicial</p>
              <p class="font-mono text-zinc-300">${formatCurrency(turno.montoInicial)}</p>
            </div>
            <div>
              <p class="text-xs text-zinc-500">Total Ventas</p>
              <p class="font-mono text-emerald-400 font-semibold">${formatCurrency(turno.totalVentas)}</p>
            </div>
          </div>

          <div class="rounded-lg bg-zinc-800 p-3 mt-2 border border-zinc-700">
            <div class="flex justify-between items-center mb-1">
              <span>Sistema (Esperado):</span>
              <span class="font-bold text-white">${formatCurrency(turno.totalFinal)}</span>
            </div>
            <div class="flex justify-between items-center mb-1">
              <span>Real (En Caja):</span>
              <span class="font-bold text-white">${formatCurrency(turno.montoReal || 0)}</span>
            </div>
            <div class="flex justify-between items-center border-t border-zinc-700 pt-2 mt-2">
              <span>Diferencia:</span>
              <span class="font-bold ${diferenciaClass} text-base">${diferenciaSigno}${formatCurrency(diferencia)}</span>
            </div>
          </div>

          ${
            turno.observaciones
              ? `
            <div class="mt-3">
              <p class="text-xs text-zinc-500 mb-1">Observaciones del Cajero:</p>
              <p class="text-zinc-300 italic bg-zinc-900/50 p-2 rounded border border-zinc-800 text-xs">
                "${turno.observaciones}"
              </p>
            </div>
          `
              : ''
          }
        </div>
      `,
      background: '#18181b', // zinc-950
      showConfirmButton: true,
      confirmButtonText: 'Cerrar',
      confirmButtonColor: '#3b82f6',
      customClass: {
        popup: 'border border-zinc-800 rounded-xl shadow-2xl',
      },
    });
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 shadow-lg">
      <div className="flex items-center justify-between border-b border-zinc-800 p-3">
        <h3 className="flex items-center gap-2 text-xs font-semibold text-white">
          <History className="text-blue-500" size={14} />
          Historial de Cierres
        </h3>
        <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
          {turnosCerrados.length}
        </span>
      </div>

      <div className="custom-scrollbar max-h-[250px] overflow-y-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-zinc-900 shadow-sm">
            <TableRow className="border-b border-zinc-800 hover:bg-transparent">
              <TableHead className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Fecha
              </TableHead>
              <TableHead className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Cajero
              </TableHead>
              <TableHead className="text-right text-xs font-medium uppercase tracking-wider text-zinc-500">
                Sistema
              </TableHead>
              <TableHead className="text-right text-xs font-medium uppercase tracking-wider text-zinc-500">
                Real
              </TableHead>
              <TableHead className="text-right text-xs font-medium uppercase tracking-wider text-zinc-500">
                Dif.
              </TableHead>
              <TableHead className="w-[30px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {turnosCerrados.length > 0 ? (
              turnosCerrados.map((turno) => {
                const diferencia =
                  (turno.montoReal || 0) - (turno.totalFinal || 0);
                const diferenciaClass =
                  diferencia === 0
                    ? 'text-zinc-500'
                    : diferencia > 0
                      ? 'text-blue-400'
                      : 'text-red-400';
                const diferenciaSigno = diferencia > 0 ? '+' : '';

                return (
                  <motion.tr
                    key={turno.id}
                    className="border-b border-zinc-800/50 transition-colors hover:bg-zinc-800/30"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <TableCell className="py-3">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-zinc-300">
                          {turno.fechaCierre}
                        </span>
                        <span className="text-xs text-zinc-500">
                          {turno.horaCierre}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3 text-sm font-medium text-zinc-300">
                      {turno.vendedorNombre}
                    </TableCell>
                    <TableCell className="py-3 text-right font-mono text-sm tabular-nums text-zinc-400">
                      {formatCurrency(turno.totalFinal)}
                    </TableCell>
                    <TableCell className="py-3 text-right font-mono text-sm tabular-nums text-zinc-300">
                      {turno.montoReal !== undefined
                        ? formatCurrency(turno.montoReal)
                        : '---'}
                    </TableCell>
                    <TableCell
                      className={`py-3 text-right font-mono text-sm font-bold tabular-nums ${diferenciaClass}`}
                    >
                      {diferenciaSigno}
                      {formatCurrency(diferencia)}
                    </TableCell>
                    <TableCell className="py-3 text-right">
                      <button
                        onClick={() => handleVerInfo(turno)}
                        className="rounded p-1 text-zinc-500 transition-colors hover:bg-zinc-700 hover:text-blue-400"
                        title="Ver Auditoría"
                      >
                        <Info size={16} />
                      </button>
                    </TableCell>
                  </motion.tr>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-zinc-500">
                    <Receipt className="h-8 w-8 opacity-20" />
                    <p className="text-xs">Sin registros</p>
                  </div>
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
