// frontend/src/components/SalesHeatmap.jsx

import React from 'react';

const SalesHeatmap = ({ data }) => {
  const dias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
  const horas = Array.from({ length: 15 }, (_, i) => (i + 8).toString().padStart(2, '0')); // De 08 a 22 hs

  // Encontramos el valor máximo para calcular la intensidad del color
  const maxVentas = Math.max(0, ...Object.values(data).flatMap(d => Object.values(d)));

  const getColorClass = (count) => {
    if (!count || count === 0) return 'bg-zinc-700/50';
    const intensity = count / maxVentas;
    if (intensity < 0.2) return 'bg-blue-500/20';
    if (intensity < 0.4) return 'bg-blue-500/40';
    if (intensity < 0.6) return 'bg-blue-500/60';
    if (intensity < 0.8) return 'bg-blue-500/80';
    return 'bg-blue-500';
  };

  return (
    <div className="grid grid-cols-8 gap-1 text-xs">
      {/* Fila de Encabezado de Horas */}
      <div></div> {/* Celda vacía en la esquina */}
      {dias.map(dia => (
        <div key={dia} className="text-center font-bold text-zinc-300 pb-2">{dia.substring(0,3)}</div>
      ))}

      {/* Filas de Datos */}
      {horas.map(hora => (
        <React.Fragment key={hora}>
          <div className="text-right font-bold text-zinc-300 pr-2">{hora}:00</div>
          {dias.map(dia => {
            const count = data[dia]?.[hora] || 0;
            return (
              <div 
                key={`${dia}-${hora}`} 
                className={`h-8 w-full rounded-md flex items-center justify-center ${getColorClass(count)}`}
                title={`${count} venta${count !== 1 ? 's' : ''} el ${dia} a las ${hora}hs`}
              >
                {count > 0 ? count : ''}
              </div>
            );
          })}
        </React.Fragment>
      ))}
    </div>
  );
};

export default SalesHeatmap;