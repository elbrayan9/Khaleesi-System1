// frontend/src/components/ShiftManager.jsx
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { getOpenShift } from '../services/firestoreService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import { formatCurrency } from '../utils/helpers';
import { parseMonto } from '../utils/monto.js';
import { PlayCircle, StopCircle, Loader2 } from 'lucide-react';

// --- MODAL PARA ABRIR TURNO ---
const OpenShiftModal = ({ isOpen, onClose, onConfirm }) => {
  const [montoInicial, setMontoInicial] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // Se normaliza ACA: "5.000" tiene que abrir el turno con cinco mil, no
    // con cinco, o toda la caja del dia arranca mal.
    onConfirm(parseMonto(montoInicial) ?? 0);
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
            type="text"
            inputMode="decimal"
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

const CloseShiftModal = ({
  isOpen,
  onClose,
  onConfirm,
  turnoActivo,
  ventas,
  notasCD = [],
  vendedorActual,
}) => {
  const verArqueoCompleto = vendedorActual?.verArqueoCompleto !== false;

  const [billetes, setBilletes] = useState({
    20000: '',
    10000: '',
    2000: '',
    1000: '',
    500: '',
    200: '',
    100: '',
    50: '',
    20: '',
    10: '',
  });
  const [montoDeclarado, setMontoDeclarado] = useState('');

  useEffect(() => {
    if (!verArqueoCompleto) {
      let sum = 0;
      Object.keys(billetes).forEach((b) => {
        const cant = parseInt(billetes[b]) || 0;
        sum += parseInt(b) * cant;
      });
      setMontoDeclarado(sum || '');
    }
  }, [billetes, verArqueoCompleto]);

  const turnoVentas = ventas.filter((v) =>
    turnoActivo?.ventasIds?.includes(v.id),
  );
  const totalVentasTurno = turnoVentas.reduce((sum, v) => sum + v.total, 0);
  const totalEsperado = (turnoActivo?.montoInicial || 0) + totalVentasTurno;

  const desglosePagos = turnoVentas.reduce((acc, venta) => {
    const pagos = venta.pagos || [];
    pagos.forEach((pago) => {
      const metodo = pago.metodo || 'desconocido';
      const monto = Number(pago.monto) || 0;
      acc[metodo] = (acc[metodo] || 0) + monto;
    });
    if (pagos.length === 0 && venta.total > 0) {
      acc['efectivo'] = (acc['efectivo'] || 0) + venta.total;
    }
    return acc;
  }, {});

  // Las notas de crédito con devolución sacan plata del cajón: si se vendió
  // algo en efectivo y después se devolvió, ese dinero ya no está. Sin esto el
  // cierre pedía cuadrar contra un total que incluía una venta anulada, y
  // siempre daba faltante.
  //
  // Se toman las del turno por fecha: las notas no guardan el id del turno, y
  // pedirlo obligaría a migrar las que ya existen.
  const notasDelTurno = (notasCD || []).filter((n) => {
    if (n.tipo !== 'credito') return false;
    // Solo cuenta la que devolvió dinero en efectivo. Una nota por error de
    // facturación, o devuelta a la tarjeta, no toca la caja.
    const enEfectivo =
      !n.metodoPago || String(n.metodoPago).toLowerCase() === 'efectivo';
    if (!enEfectivo) return false;
    // Del día del turno en adelante.
    return !turnoActivo?.fechaApertura || n.fecha === turnoActivo.fechaApertura;
  });

  const totalDevueltoEfectivo = notasDelTurno.reduce(
    (s, n) => s + (Number(n.monto) || 0),
    0,
  );

  const totalEsperadoEfectivo =
    (turnoActivo?.montoInicial || 0) +
    (desglosePagos['efectivo'] || 0) -
    totalDevueltoEfectivo;

  const handleConfirm = () => {
    let diferencia = 0;
    if (!verArqueoCompleto) {
      diferencia = Number(montoDeclarado) - totalEsperadoEfectivo;
    }

    onConfirm({
      totalVentas: totalVentasTurno,
      totalFinal: totalEsperado,
      montoDeclaradoEfectivo: verArqueoCompleto
        ? totalEsperadoEfectivo
        : Number(montoDeclarado),
      diferenciaEfectivo: diferencia,
      cierreCiego: !verArqueoCompleto,
      montoReal: totalEsperado + diferencia, // <-- Vital for HistorialTurnos
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-zinc-800 p-6"
      >
        <h3 className="mb-4 text-lg font-bold text-white">
          Resumen y Cierre de Turno
        </h3>
        <div className="space-y-4 text-zinc-300">
          <div className="flex justify-between">
            <span>Vendedor:</span>{' '}
            <span className="font-bold text-white">
              {turnoActivo.vendedorNombre}
            </span>
          </div>

          {verArqueoCompleto ? (
            <>
              <div className="flex justify-between">
                <span>Monto Inicial:</span>{' '}
                <span>${formatCurrency(turnoActivo.montoInicial)}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-600 pb-2">
                <span>Ventas Totales:</span>{' '}
                <span className="font-bold text-white">
                  ${formatCurrency(totalVentasTurno)}
                </span>
              </div>
              <div className="py-2">
                <p className="mb-1 text-xs font-semibold uppercase text-zinc-500">
                  Desglose por Medio de Pago
                </p>
                {Object.entries(desglosePagos).length === 0 ? (
                  <p className="text-sm italic text-zinc-500">Sin ventas.</p>
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
              {totalDevueltoEfectivo > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-amber-400">
                    Devuelto por notas de crédito:
                  </span>
                  <span className="text-amber-400">
                    -${formatCurrency(totalDevueltoEfectivo)}
                  </span>
                </div>
              )}
              <div className="mt-2 flex justify-between border-t border-zinc-600 pt-2 text-lg font-bold">
                <span>Total Esperado en Caja (Efectivo + Inicial):</span>{' '}
                <span className="text-cyan-400">
                  ${formatCurrency(totalEsperadoEfectivo)}
                </span>
              </div>
            </>
          ) : (
            <div className="mt-4 border-t border-zinc-600 pt-4">
              <p className="mb-3 text-center text-sm font-bold uppercase tracking-wide text-amber-500">
                Cierre Ciego Requerido
              </p>
              <p className="mb-4 text-sm text-zinc-400">
                Por favor, cuente el dinero en caja e ingrese las cantidades de
                cada billete.
              </p>
              <div className="mb-4 grid grid-cols-2 gap-3">
                {[
                  '20000',
                  '10000',
                  '2000',
                  '1000',
                  '500',
                  '200',
                  '100',
                  '50',
                  '20',
                  '10',
                ].map((denom) => (
                  <div
                    key={denom}
                    className="flex items-center justify-between rounded bg-zinc-700/50 p-2"
                  >
                    <Label className="mr-2 w-16 text-right text-zinc-300">
                      ${denom}
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={billetes[denom]}
                      onChange={(e) =>
                        setBilletes((prev) => ({
                          ...prev,
                          [denom]: e.target.value,
                        }))
                      }
                      className="h-8 w-20 text-center"
                    />
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between rounded-lg border border-zinc-600 bg-zinc-700 p-3">
                <span className="font-bold text-white">Total Declarado:</span>
                <span className="text-xl font-bold text-green-400">
                  {montoDeclarado !== ''
                    ? `$${formatCurrency(montoDeclarado)}`
                    : '$0'}
                </span>
              </div>
            </div>
          )}
        </div>

        <Button
          onClick={handleConfirm}
          disabled={!verArqueoCompleto && montoDeclarado === ''}
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
    currentUser,
    turnoActivo,
    setTurnoActivo,
    handleAbrirTurno,
    handleCerrarTurno,
    ventas,
    notasCD, // para descontar las devoluciones del cierre
    sucursalActual,
    vendedores, // <--- Necesario para validar
  } = useAppContext();

  const [isLoading, setIsLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [closeModal, setCloseModal] = useState(false);

  useEffect(() => {
    const checkForOpenShift = async () => {
      if (vendedorActivoId && currentUser?.uid && sucursalActual) {
        setIsLoading(true);
        const openShiftSnap = await getOpenShift(
          currentUser.uid,
          vendedorActivoId,
          sucursalActual.id,
        );
        if (!openShiftSnap.empty) {
          const shiftDoc = openShiftSnap.docs[0];
          const raw = { id: shiftDoc.id, ...shiftDoc.data() };
          // Convertir Timestamps de Firestore a strings ISO (recursivo)
          const sanitize = (obj) => {
            if (!obj || typeof obj !== 'object') return obj;
            if (typeof obj.toDate === 'function')
              return obj.toDate().toISOString();
            if (Array.isArray(obj)) return obj.map(sanitize);
            const result = {};
            Object.keys(obj).forEach((key) => {
              result[key] = sanitize(obj[key]);
            });
            return result;
          };
          setTurnoActivo(sanitize(raw));
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
  }, [vendedorActivoId, currentUser, setTurnoActivo, sucursalActual]);

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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-bold text-green-400">Turno Abierto</p>
            <p className="text-xs text-zinc-300">
              Iniciado a las {turnoActivo.horaApertura}
            </p>
          </div>
          <Button
            variant="destructive"
            className="whitespace-nowrap"
            onClick={() => setCloseModal(true)}
          >
            <StopCircle className="mr-2 h-4 w-4" />
            Cerrar Turno
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-zinc-400">No hay un turno activo.</p>
          <Button
            className="whitespace-nowrap bg-green-600 hover:bg-green-700"
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
        notasCD={notasCD}
        vendedorActual={vendedorValido}
      />
    </div>
  );
};

export default ShiftManager;
