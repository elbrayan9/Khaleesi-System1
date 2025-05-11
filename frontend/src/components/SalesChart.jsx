import React from 'react';
// Importar componentes necesarios de Recharts
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

/**
 * Componente para mostrar un gráfico de barras de ventas diarias.
 * Adaptado para tema oscuro Zinc.
 */
function SalesChart({ data }) { // Recibe datos como [{ dia: 'DD', total: N }]

  // Si no hay datos o son insuficientes, muestra un mensaje
  if (!data || data.length === 0) {
    return <p className="text-center text-zinc-400 italic text-sm py-6">No hay datos de ventas suficientes para el gráfico.</p>;
  }

  // Formateador para el tooltip (muestra valor como moneda)
  const formatTooltip = (value, name, props) => {
    const formattedValue = `$${(Number(value) || 0).toFixed(2)}`;
    // Usar el día como label en el tooltip
    return [formattedValue, `Día ${props.payload.dia}`];
  };

  // Formateador para las etiquetas del eje Y (moneda simple)
   const formatYAxis = (tickItem) => {
       return `$${tickItem}`;
   };

   // Colores para las barras (puedes definir más si quieres variar)
   const COLORS = ['#60a5fa', '#3b82f6', '#2563eb']; // Tonos de azul

  return (
    // ResponsiveContainer hace que el gráfico se ajuste al tamaño del div padre
    <ResponsiveContainer width="100%" height={250}>
      <BarChart
        data={data}
        margin={{ top: 5, right: 5, left: 15, bottom: 5 }} // Ajustar márgenes
        barSize={15} // Ancho de barra ajustado
      >
        {/* Rejilla con color oscuro */}
        <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" vertical={false} /> {/* Solo líneas horizontales */}
        {/* Eje X (días) con estilo oscuro */}
        <XAxis
            dataKey="dia"
            stroke="#a1a1aa" // zinc-400
            fontSize={11}
            tickLine={false}
            axisLine={false}
            padding={{ left: 10, right: 10 }} // Espacio en los extremos
        />
        {/* Eje Y (total ventas) con estilo oscuro y formato */}
        <YAxis
            stroke="#a1a1aa" // zinc-400
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatYAxis}
            width={65} // Ancho para acomodar etiquetas de precio
            domain={[0, 'dataMax + 100']} // Dominio automático con un poco de espacio arriba
            allowDecimals={false}
        />
        {/* Tooltip con estilo oscuro */}
        <Tooltip
            cursor={{ fill: 'rgba(161, 161, 170, 0.1)' }} // zinc-400 con opacidad
            contentStyle={{
                backgroundColor: '#18181b', // zinc-900
                borderColor: '#3f3f46', // zinc-700
                borderRadius: '0.375rem',
                color: '#e4e4e7', // zinc-200
                fontSize: '12px',
                padding: '5px 10px'
             }}
            itemStyle={{ color: '#e4e4e7' }}
            labelStyle={{ color: '#a1a1aa', fontWeight: 'bold' }} // Estilo para el label (Día XX)
            formatter={formatTooltip}
            labelFormatter={(label) => `Día ${label}`} // Formato del label principal del tooltip
        />
        {/* Barras del gráfico */}
        <Bar dataKey="total" radius={[4, 4, 0, 0]} >
             {/* Aplicar colores diferentes a cada barra (opcional) */}
             {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
             ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export default SalesChart;
