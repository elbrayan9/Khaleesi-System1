// frontend/src/components/EstadisticasTab.jsx
import React, { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { motion } from 'framer-motion';
import { formatCurrency } from '../utils/helpers';
import {
  DollarSign,
  Archive,
  TrendingUp,
  Landmark,
  BarChart2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// Componente para las tarjetas de estadísticas
const StatCard = ({ title, value, icon, color }) => (
  <motion.div
    className="flex items-center gap-4 rounded-lg border border-zinc-700 bg-zinc-800 p-6"
    whileHover={{ scale: 1.03 }}
  >
    <div className={`rounded-md p-3 ${color}`}>{icon}</div>
    <div>
      <p className="text-sm text-zinc-400">{title}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  </motion.div>
);

const EstadisticasTab = () => {
  const { productos, ventas } = useAppContext();

  const stats = useMemo(() => {
    // 1. Dinero Invertido (Valor del Inventario a precio de costo)
    const valorInventario = productos.reduce((sum, p) => {
      const stock = p.stock || 0;
      const costo = p.costo || 0;
      return sum + stock * costo;
    }, 0);

    // 2. Ingresos Brutos (Total de todas las ventas)
    const ingresosBrutos = ventas.reduce((sum, v) => sum + v.total, 0);

    // 3. Costo de la Mercadería Vendida (CMV)
    const costoMercaderiaVendida = ventas.reduce((sum, v) => {
      const costoVenta = (v.items || []).reduce((itemSum, item) => {
        const cantidad = item.cantidad || 0;
        const costo = item.costo || 0; // Leemos el costo guardado en la venta
        return itemSum + cantidad * costo;
      }, 0);
      return sum + costoVenta;
    }, 0);

    // 4. Ganancia Bruta
    const gananciaBruta = ingresosBrutos - costoMercaderiaVendida;

    return {
      valorInventario,
      ingresosBrutos,
      costoMercaderiaVendida,
      gananciaBruta,
    };
  }, [productos, ventas]);

  const chartData = [
    {
      name: 'Finanzas',
      Ingresos: stats.ingresosBrutos,
      Ganancias: stats.gananciaBruta,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      <h2 className="flex items-center gap-2 text-2xl font-bold text-white">
        <BarChart2 className="h-8 w-8 text-indigo-500" />
        Estadísticas del Negocio
      </h2>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Ingresos Brutos"
          value={formatCurrency(stats.ingresosBrutos)}
          icon={<DollarSign />}
          color="bg-green-500/20 text-green-400"
        />
        <StatCard
          title="Ganancia Bruta"
          value={formatCurrency(stats.gananciaBruta)}
          icon={<TrendingUp />}
          color="bg-cyan-500/20 text-cyan-400"
        />
        <StatCard
          title="Valor de Inventario (Costo)"
          value={formatCurrency(stats.valorInventario)}
          icon={<Archive />}
          color="bg-yellow-500/20 text-yellow-400"
        />
        <StatCard
          title="Costo Mercadería Vendida"
          value={formatCurrency(stats.costoMercaderiaVendida)}
          icon={<Landmark />}
          color="bg-red-500/20 text-red-400"
        />
      </div>

      <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-6">
        <h3 className="mb-4 text-lg font-bold text-white">
          Resumen Financiero
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={chartData}
            margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#404040" />
            <XAxis dataKey="name" stroke="#a1a1aa" />
            <YAxis
              stroke="#a1a1aa"
              tickFormatter={(value) => `$${value.toLocaleString()}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#27272a',
                border: '1px solid #52525b',
              }}
              labelStyle={{ color: '#d4d4d8' }}
            />
            <Legend />
            <Bar dataKey="Ingresos" fill="#22c55e" name="Ingresos Brutos" />
            <Bar dataKey="Ganancias" fill="#06b6d4" name="Ganancia Bruta" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4 text-sm text-zinc-500">
        <strong>Nota Importante:</strong> La "Ganancia Bruta" y el "Costo de
        Mercadería Vendida" solo consideran las ventas realizadas después de
        haber implementado el registro del costo de los productos. Las ventas
        antiguas no se incluirán en este cálculo.
      </div>
    </motion.div>
  );
};

export default EstadisticasTab;
