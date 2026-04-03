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

const CloseShiftModal = ({
  isOpen,
  onClose,
  onConfirm,
  turnoActivo,
  ventas,
  vendedorActual,
}) => {
  const verArqueoCompleto = vendedorActual?.verArqueoCompleto !== false;
  
  const [billetes, setBilletes] = useState({
    '20000': '', '10000': '', '2000': '', '1000': '', '500': '', '200': '', '100': '', '50': '', '20': '', '10': ''
  });
  const [montoDeclarado, setMontoDeclarado] = useState('');

  useEffect(() => {
    if (!verArqueoCompleto) {
      let sum = 0;
      Object.keys(billetes).forEach(b => {
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

  const totalEsperadoEfectivo = (turnoActivo?.montoInicial || 0) + (desglosePagos['efectivo'] || 0);

  const handleConfirm = () => {
    let diferencia = 0;
    if (!verArqueoCompleto) {
       diferencia = Number(montoDeclarado) - totalEsperadoEfectivo;
    }
    
    onConfirm({
      totalVentas: totalVentasTurno,
      totalFinal: totalEsperado,
      montoDeclaradoEfectivo: verArqueoCompleto ? totalEsperadoEfectivo : Number(montoDeclarado),
      diferenciaEfectivo: diferencia,
      cierreCiego: !verArqueoCompleto,
      montoReal: totalEsperado + diferencia // <-- Vital for HistorialTurnos
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg rounded-lg bg-zinc-800 p-6 max-h-[90vh] overflow-y-auto"
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
                  <span>{formatCurrency(turnoActivo.montoInicial)}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-600 pb-2">
                  <span>Ventas Totales:</span>{' '}
                  <span className="font-bold text-white">
                    {formatCurrency(totalVentasTurno)}
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
                        <span className="capitalize text-zinc-400">{metodo.replace(/_/g, ' ')}:</span>
                        <span className="text-zinc-200">${formatCurrency(monto)}</span>
                      </div>
                    ))
                  )}
                </div>
                <div className="mt-2 flex justify-between border-t border-zinc-600 pt-2 text-lg font-bold">
                  <span>Total Esperado en Caja (Efectivo + Inicial):</span>{' '}
                  <span className="text-cyan-400">
                    {formatCurrency(totalEsperadoEfectivo)}
                  </span>
                </div>
             </>
          ) : (
             <div className="mt-4 border-t border-zinc-600 pt-4">
                <p className="mb-3 text-sm font-bold text-amber-500 text-center uppercase tracking-wide">
                  Cierre Ciego Requerido
                </p>
                <p className="mb-4 text-sm text-zinc-400">
                  Por favor, cuente el dinero en caja e ingrese las cantidades de cada billete.
                </p>
                <div className="grid grid-cols-2 gap-3 mb-4">
                   {['20000', '10000', '2000', '1000', '500', '200', '100', '50', '20', '10'].map(denom => (
                     <div key={denom} className="flex items-center justify-between bg-zinc-700/50 p-2 rounded">
                       <Label className="text-zinc-300 w-16 text-right mr-2">${denom}</Label>
                       <Input 
                          type="number" 
                          min="0"
                          placeholder="0"
                          value={billetes[denom]}
                          onChange={(e) => setBilletes(prev => ({...prev, [denom]: e.target.value}))}
                          className="w-20 h-8 text-center"
                       />
                     </div>
                   ))}
                </div>
                <div className="flex items-center justify-between bg-zinc-700 p-3 rounded-lg border border-zinc-600">
                  <span className="font-bold text-white">Total Declarado:</span>
                  <span className="text-xl font-bold text-green-400">
                    {montoDeclarado !== '' ? `$${formatCurrency(montoDeclarado)}` : '$0'}
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
            if (typeof obj.toDate === 'function') return obj.toDate().toISOString();
            if (Array.isArray(obj)) return obj.map(sanitize);
            const result = {};
            Object.keys(obj).forEach((key) => { result[key] = sanitize(obj[key]); });
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
        vendedorActual={vendedorValido}
      />
    </div>
  );
};

export default ShiftManager;
