// frontend/src/components/SelectorVendedor.jsx

import React from 'react';
import { UserSquare } from 'lucide-react';

function SelectorVendedor({ vendedores, vendedorActivoId, onSelectVendedor }) {
  if (!vendedores || vendedores.length === 0) {
    return (
      <p className="text-sm text-yellow-400">No hay vendedores registrados.</p>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-lg bg-zinc-700 p-2">
      <UserSquare className="h-5 w-5 text-zinc-400" />
      <select
        value={vendedorActivoId || ''}
        onChange={(e) => onSelectVendedor(e.target.value)}
        className="w-full bg-transparent text-sm text-white focus:outline-none"
      >
        <option value="" disabled>
          -- Seleccione un vendedor --
        </option>
        {vendedores.map((v) => (
          <option key={v.id} value={v.id} className="bg-zinc-800">
            {v.nombre}
          </option>
        ))}
      </select>
    </div>
  );
}

export default SelectorVendedor;
