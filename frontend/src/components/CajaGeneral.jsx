// frontend/src/components/CajaGeneral.jsx
import React, { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { formatCurrency } from '../utils/helpers';
import { PiggyBank } from 'lucide-react';

const CajaGeneral = () => {
  const { ventas, egresos, ingresosManuales } = useAppContext();

  const totalCajaGeneral = useMemo(() => {
    // 1. Sumamos todos los pagos que se hicieron en 'Efectivo'
    const totalVentasEnEfectivo = ventas.reduce((total, venta) => {
      const pagosEnEfectivo = (venta.pagos || [])
        .filter((pago) => pago.metodo.toLowerCase() === 'efectivo')
        .reduce((sum, pago) => sum + pago.monto, 0);
      return total + pagosEnEfectivo;
    }, 0);

    // 2. Sumamos todos los ingresos manuales
    const totalIngresos = ingresosManuales.reduce(
      (total, ingreso) => total + ingreso.monto,
      0,
    );

    // 3. Restamos todos los egresos
    const totalEgresos = egresos.reduce(
      (total, egreso) => total + egreso.monto,
      0,
    );

    // El resultado es el total de efectivo que debería haber
    return totalVentasEnEfectivo + totalIngresos - totalEgresos;
  }, [ventas, egresos, ingresosManuales]);

  return (
    <div className="relative overflow-hidden rounded-xl border border-zinc-700 bg-gradient-to-br from-zinc-800 to-zinc-900 p-6 text-white shadow-lg shadow-black/20">
      {/* Icono de fondo decorativo */}
      <PiggyBank
        className="absolute -bottom-4 -right-4 text-zinc-700/20"
        size={120}
      />

      <div className="relative z-10 flex items-center gap-4">
        <div className="rounded-full bg-blue-500/20 p-3 text-blue-400">
          <PiggyBank size={32} />
        </div>
        <div>
          <p className="text-lg font-medium text-zinc-200">
            Total en Caja General
          </p>
          <p className="text-sm text-zinc-400">
            Saldo acumulado (Efectivo + Ingresos - Egresos)
          </p>
        </div>
      </div>

      <div className="relative z-10 mt-6 text-right">
        <p className="font-mono text-4xl font-bold tabular-nums tracking-tight text-white">
          {formatCurrency(totalCajaGeneral)}
        </p>
      </div>
    </div>
  );
};

export default CajaGeneral;
