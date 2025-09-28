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
    <div className="rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 p-6 text-white shadow-lg">
      <div className="flex items-center gap-4">
        <PiggyBank size={40} />
        <div>
          <p className="text-lg font-semibold">Total en Caja General</p>
          <p className="text-sm opacity-80">
            Saldo acumulado de todos los movimientos
          </p>
        </div>
      </div>
      <p className="mt-4 text-right text-4xl font-extrabold">
        {formatCurrency(totalCajaGeneral)}
      </p>
    </div>
  );
};

export default CajaGeneral;
