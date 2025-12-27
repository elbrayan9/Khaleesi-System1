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
  PieChart as PieChartIcon,
  CreditCard,
  Package,
  Activity,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

// --- COLORES PARA GRÁFICOS ---
const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444']; // Emerald, Blue, Violet, Amber, Red

// --- COMPONENTES UI ---

const StatCard = ({ title, value, subValue, icon, color, trend }) => (
  <motion.div
    className="relative overflow-hidden rounded-2xl border border-zinc-700/50 bg-zinc-800/50 p-6 backdrop-blur-md transition-all hover:border-zinc-600 hover:bg-zinc-800/80"
    whileHover={{ y: -2 }}
  >
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-zinc-400">{title}</p>
        <p className="mt-2 font-mono text-3xl font-bold tracking-tight text-white">
          {value}
        </p>
        {subValue && (
          <p className="mt-1 text-xs font-medium text-zinc-500">{subValue}</p>
        )}
      </div>
      <div
        className={`rounded-xl bg-opacity-10 p-3 ${color.replace('text-', 'bg-')} ${color}`}
      >
        {React.cloneElement(icon, { size: 24 })}
      </div>
    </div>

    {/* Decoración de fondo */}
    <div
      className={`absolute -bottom-6 -right-6 h-24 w-24 rounded-full opacity-5 blur-2xl ${color.replace('text-', 'bg-')}`}
    />
  </motion.div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-zinc-700 bg-zinc-900/95 p-3 shadow-xl backdrop-blur-sm">
        <p className="mb-2 text-sm font-semibold text-zinc-300">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 text-xs">
            <div
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-zinc-400">{entry.name}:</span>
            <span className="font-mono font-medium text-white">
              {typeof entry.value === 'number'
                ? formatCurrency(entry.value)
                : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const EstadisticasTab = () => {
  const { productos, ventas } = useAppContext();

  const stats = useMemo(() => {
    // 1. Métricas Básicas
    const valorInventario = productos.reduce(
      (sum, p) => sum + (p.stock || 0) * (p.costo || 0),
      0,
    );
    const ingresosBrutos = ventas.reduce((sum, v) => sum + v.total, 0);

    const costoMercaderiaVendida = ventas.reduce((sum, v) => {
      return (
        sum +
        (v.items || []).reduce(
          (is, item) => is + (item.cantidad || 0) * (item.costo || 0),
          0,
        )
      );
    }, 0);

    const gananciaBruta = ingresosBrutos - costoMercaderiaVendida;

    // 2. Margen Global
    const margenPorcentaje =
      ingresosBrutos > 0
        ? ((gananciaBruta / ingresosBrutos) * 100).toFixed(1)
        : '0.0';

    // 3. Ventas por Método de Pago (PieChart)
    const metodosMap = {};
    ventas.forEach((v) => {
      let metodo = v.metodoPago || 'Otros';

      // Normalización básica
      metodo = metodo.trim().toLowerCase();

      // Capitalizar primera letra
      metodo = metodo.charAt(0).toUpperCase() + metodo.slice(1);

      // Mapeos específicos para nombres comunes de sistemas/APIs
      if (metodo === 'Credit_card' || metodo === 'Credit card')
        metodo = 'Tarjeta Crédito';
      if (metodo === 'Debit_card' || metodo === 'Debit card')
        metodo = 'Tarjeta Débito';
      if (metodo === 'Mercadopago' || metodo === 'Mercado pago')
        metodo = 'Mercado Pago';

      metodosMap[metodo] = (metodosMap[metodo] || 0) + v.total;
    });

    const dataMetodos = Object.entries(metodosMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // 4. Top 5 Productos (Ranking)
    const productosMap = {};
    ventas.forEach((v) => {
      v.items.forEach((item) => {
        if (!productosMap[item.nombre]) {
          productosMap[item.nombre] = {
            nombre: item.nombre,
            cantidad: 0,
            total: 0,
          };
        }
        productosMap[item.nombre].cantidad += item.cantidad;
        productosMap[item.nombre].total += item.precioFinal * item.cantidad;
      });
    });

    const topProductos = Object.values(productosMap)
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);

    return {
      valorInventario,
      ingresosBrutos,
      costoMercaderiaVendida,
      gananciaBruta,
      margenPorcentaje,
      dataMetodos,
      topProductos,
    };
  }, [productos, ventas]);

  // Datos para el gráfico principal (AreaChart) - Simplificado a un solo punto "Total" por ahora
  // Idealmente esto sería una serie temporal real
  const chartData = [
    {
      name: 'Total Acumulado',
      Ingresos: stats.ingresosBrutos,
      Ganancias: stats.gananciaBruta,
      Costo: stats.costoMercaderiaVendida,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="space-y-6 pb-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-3 text-2xl font-bold text-white">
          <div className="rounded-lg bg-indigo-500/20 p-2 text-indigo-400">
            <Activity className="h-6 w-6" />
          </div>
          Business Intelligence
        </h2>
        <div className="text-sm text-zinc-500">
          Última actualización: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Ingresos Totales"
          value={formatCurrency(stats.ingresosBrutos)}
          icon={<DollarSign />}
          color="text-emerald-400"
        />
        <StatCard
          title="Ganancia Neta"
          value={formatCurrency(stats.gananciaBruta)}
          subValue={`${stats.margenPorcentaje}% Margen`}
          icon={<TrendingUp />}
          color="text-sky-400"
        />
        <StatCard
          title="Valor Inventario"
          value={formatCurrency(stats.valorInventario)}
          icon={<Archive />}
          color="text-violet-400"
        />
        <StatCard
          title="Costo Mercadería"
          value={formatCurrency(stats.costoMercaderiaVendida)}
          icon={<Landmark />}
          color="text-rose-400"
        />
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Chart - Area (Ocupa 2 columnas) */}
        <div className="col-span-1 rounded-2xl border border-zinc-700/50 bg-zinc-800/50 p-6 backdrop-blur-md lg:col-span-2">
          <h3 className="mb-6 flex items-center gap-2 text-lg font-bold text-white">
            <BarChart2 className="h-5 w-5 text-emerald-500" />
            Rendimiento Financiero
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient
                    id="colorIngresos"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient
                    id="colorGanancias"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#3f3f46"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  stroke="#71717a"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#71717a"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ stroke: '#52525b', strokeWidth: 1 }}
                />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ paddingTop: '20px' }}
                />
                <Area
                  type="monotone"
                  dataKey="Ingresos"
                  stroke="#10b981"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorIngresos)"
                />
                <Area
                  type="monotone"
                  dataKey="Ganancias"
                  stroke="#0ea5e9"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorGanancias)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Methods - Pie Chart */}
        <div className="rounded-2xl border border-zinc-700/50 bg-zinc-800/50 p-6 backdrop-blur-md">
          <h3 className="mb-6 flex items-center gap-2 text-lg font-bold text-white">
            <CreditCard className="h-5 w-5 text-violet-500" />
            Métodos de Pago
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.dataMetodos}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stats.dataMetodos.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                      stroke="rgba(0,0,0,0)"
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  layout="vertical"
                  verticalAlign="middle"
                  align="right"
                  iconType="circle"
                  formatter={(value, entry) => (
                    <span className="ml-1 text-xs text-zinc-300">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Products List */}
        <div className="col-span-1 rounded-2xl border border-zinc-700/50 bg-zinc-800/50 p-6 backdrop-blur-md lg:col-span-3">
          <h3 className="mb-6 flex items-center gap-2 text-lg font-bold text-white">
            <Package className="h-5 w-5 text-amber-500" />
            Top 5 Productos Más Vendidos
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-400">
              <thead className="border-b border-zinc-700/50 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-3 font-medium">#</th>
                  <th className="px-4 py-3 font-medium">Producto</th>
                  <th className="px-4 py-3 text-right font-medium">Cantidad</th>
                  <th className="px-4 py-3 text-right font-medium">
                    Total Generado
                  </th>
                  <th className="hidden px-4 py-3 text-center font-medium md:table-cell">
                    Rendimiento
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-700/30">
                {stats.topProductos.map((prod, index) => (
                  <tr key={index} className="group hover:bg-zinc-700/20">
                    <td className="px-4 py-3 font-mono text-zinc-500">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 font-medium text-white transition-colors group-hover:text-indigo-400">
                      {prod.nombre}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-white">
                      {prod.cantidad}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-400">
                      {formatCurrency(prod.total)}
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <div className="flex items-center justify-center">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-zinc-700">
                          <div
                            className="h-full rounded-full bg-indigo-500"
                            style={{
                              width: `${(prod.cantidad / stats.topProductos[0].cantidad) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
                {stats.topProductos.length === 0 && (
                  <tr>
                    <td
                      colSpan="5"
                      className="py-8 text-center italic text-zinc-500"
                    >
                      No hay datos de ventas suficientes.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default EstadisticasTab;
