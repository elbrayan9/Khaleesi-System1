// frontend/src/components/ShiftManager.jsx
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { getOpenShift } from '../services/firestoreService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import { formatCurrency } from '../utils/helpers';
import { PlayCircle, StopCircle, Loader2 } from 'lucide-react';

// --- MODAL PARA ABRIR TURNO ---
const OpenShiftModal = ({ isOpen, onClose, onConfirm }) => {
  const [montoInicial, setMontoInicial] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm(montoInicial);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm rounded-lg bg-zinc-800 p-6"
      >
        <h3 className="mb-4 text-lg font-bold text-white">Iniciar Turno</h3>
        <form onSubmit={handleSubmit}>
          <Label htmlFor="monto-inicial">Monto Inicial en Caja ($)</Label>
          <Input
            id="monto-inicial"
            type="number"
            value={montoInicial}
            onChange={(e) => setMontoInicial(e.target.value)}
            placeholder="Ej: 5000"
            className="my-2 text-center text-lg"
            required
          />
          <Button
            type="submit"
            className="mt-4 w-full bg-green-600 hover:bg-green-700"
          >
            Confirmar e Iniciar
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="mt-2 w-full"
          >
            Cancelar
          </Button>
        </form>
      </motion.div>
    </div>
  );
};

// --- MODAL PARA CERRAR TURNO (POR AHORA SIMPLE, LUEGO LO MEJORAMOS) ---
const CloseShiftModal = ({
  isOpen,
  onClose,
  onConfirm,
  turnoActivo,
  ventas,
}) => {
  const turnoVentas = ventas.filter((v) =>
    turnoActivo?.ventasIds?.includes(v.id),
  );
  const totalVentasTurno = turnoVentas.reduce((sum, v) => sum + v.total, 0);
  const totalEsperado = (turnoActivo?.montoInicial || 0) + totalVentasTurno;

  // Calcular desglose por método de pago
  const desglosePagos = turnoVentas.reduce((acc, venta) => {
    const pagos = venta.pagos || [];
    pagos.forEach((pago) => {
      const metodo = pago.metodo || 'desconocido';
      const monto = Number(pago.monto) || 0;
      acc[metodo] = (acc[metodo] || 0) + monto;
    });
    // Si no hay pagos registrados pero hay total (caso legacy o error), asumir efectivo
    if (pagos.length === 0 && venta.total > 0) {
      acc['efectivo'] = (acc['efectivo'] || 0) + venta.total;
    }
    return acc;
  }, {});

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm rounded-lg bg-zinc-800 p-6"
      >
        <h3 className="mb-4 text-lg font-bold text-white">
          Resumen y Cierre de Turno
        </h3>
        <div className="space-y-2 text-zinc-300">
          <div className="flex justify-between">
            <span>Vendedor:</span>{' '}
            <span className="font-bold text-white">
              {turnoActivo.vendedorNombre}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Monto Inicial:</span>{' '}
            <span>{formatCurrency(turnoActivo.montoInicial)}</span>
          </div>
          <div className="flex justify-between border-b border-zinc-600 pb-2">
            <span>Ventas Totales:</span>{' '}
            <span className="font-bold text-white">
              {formatCurrency(totalVentasTurno)}
            </span>
          </div>

          {/* Desglose de Medios de Pago */}
          <div className="py-2">
            <p className="mb-1 text-xs font-semibold uppercase text-zinc-500">
              Desglose por Medio de Pago
            </p>
            {Object.entries(desglosePagos).length === 0 ? (
              <p className="text-sm italic text-zinc-500">
                Sin ventas registradas.
              </p>
            ) : (
              Object.entries(desglosePagos).map(([metodo, monto]) => (
                <div key={metodo} className="flex justify-between text-sm">
                  <span className="capitalize text-zinc-400">
                    {metodo.replace(/_/g, ' ')}:
                  </span>
                  <span className="text-zinc-200">
                    ${formatCurrency(monto)}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="mt-2 flex justify-between border-t border-zinc-600 pt-2 text-lg font-bold">
            <span>Total Esperado en Caja:</span>{' '}
            <span className="text-cyan-400">
              {formatCurrency(
                (turnoActivo?.montoInicial || 0) +
                  (desglosePagos['efectivo'] || 0),
              )}
            </span>
          </div>
          <p className="text-right text-xs text-zinc-500">
            * Solo suma efectivo + monto inicial
          </p>
        </div>
        <Button
          onClick={() =>
            onConfirm({
              totalVentas: totalVentasTurno,
              totalFinal: totalEsperado,
            })
          }
          className="mt-6 w-full bg-red-600 hover:bg-red-700"
        >
          Confirmar y Cerrar Turno
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onClose}
          className="mt-2 w-full"
        >
          Cancelar
        </Button>
      </motion.div>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL DEL MANAGER ---
const ShiftManager = () => {
  const {
    vendedorActivoId,
    currentUserId,
    turnoActivo,
    setTurnoActivo,
    handleAbrirTurno,
    handleCerrarTurno,
    ventas,
    sucursalActual,
    vendedores, // <--- Necesario para validar
  } = useAppContext();

  const [isLoading, setIsLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [closeModal, setCloseModal] = useState(false);

  useEffect(() => {
    const checkForOpenShift = async () => {
      if (vendedorActivoId && currentUserId && sucursalActual) {
        setIsLoading(true);
        const openShiftSnap = await getOpenShift(
          currentUserId,
          vendedorActivoId,
          sucursalActual.id,
        );
        if (!openShiftSnap.empty) {
          const shiftDoc = openShiftSnap.docs[0];
          setTurnoActivo({ id: shiftDoc.id, ...shiftDoc.data() });
        } else {
          setTurnoActivo(null);
        }
        setIsLoading(false);
      } else {
        setTurnoActivo(null);
        setIsLoading(false);
      }
    };
    checkForOpenShift();
  }, [vendedorActivoId, currentUserId, setTurnoActivo, sucursalActual]);

  // Validar que el vendedor seleccionado exista en la lista actual (por si cambió la sucursal)
  const vendedorValido = vendedores.find((v) => v.id === vendedorActivoId);

  if (!vendedorActivoId || !vendedorValido) {
    return (
      <div className="rounded-md border border-zinc-700 bg-zinc-800 p-3 text-center text-sm text-zinc-400">
        Selecciona un vendedor válido para gestionar el turno.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-md border border-zinc-700 bg-zinc-800 p-3 text-center text-sm text-zinc-400">
        <Loader2 className="mr-2 inline-block animate-spin" /> Verificando
        turno...
      </div>
    );
  }

  return (
    <div className="rounded-md border border-zinc-700 bg-zinc-800 p-3">
      {turnoActivo ? (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-green-400">Turno Abierto</p>
            <p className="text-xs text-zinc-300">
              Iniciado a las {turnoActivo.horaApertura}
            </p>
          </div>
          <Button variant="destructive" onClick={() => setCloseModal(true)}>
            <StopCircle className="mr-2 h-4 w-4" />
            Cerrar Turno
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-400">No hay un turno activo.</p>
          <Button
            className="bg-green-600 hover:bg-green-700"
            onClick={() => setOpenModal(true)}
          >
            <PlayCircle className="mr-2 h-4 w-4" />
            Abrir Turno
          </Button>
        </div>
      )}

      <OpenShiftModal
        isOpen={openModal}
        onClose={() => setOpenModal(false)}
        onConfirm={(monto) => {
          handleAbrirTurno(vendedorActivoId, monto);
          setOpenModal(false);
        }}
      />
      <CloseShiftModal
        isOpen={closeModal}
        onClose={() => setCloseModal(false)}
        onConfirm={(datosCierre) => {
          handleCerrarTurno(datosCierre);
          setCloseModal(false);
        }}
        turnoActivo={turnoActivo}
        ventas={ventas}
      />
    </div>
  );
};

export default ShiftManager;
