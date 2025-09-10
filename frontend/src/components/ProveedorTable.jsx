// frontend/src/components/ProveedorTable.jsx
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiEdit, FiTrash2, FiInfo, FiFilter } from 'react-icons/fi';

const ProveedorTable = ({ proveedores, onEdit, onDelete }) => {
  // Estado para el buscador principal
  const [searchTerm, setSearchTerm] = useState('');
  
  // NUEVO: Estados para los filtros avanzados
  const [showFilters, setShowFilters] = useState(false);
  const [zonaFilter, setZonaFilter] = useState('');
  const [rubroFilter, setRubroFilter] = useState('');
  const [marcaFilter, setMarcaFilter] = useState('');

  const filteredProveedores = useMemo(() => {
    if (!proveedores) return [];
    
    return proveedores.filter(p => {
      const searchTermLower = searchTerm.toLowerCase();
      const zonaFilterLower = zonaFilter.toLowerCase();
      const rubroFilterLower = rubroFilter.toLowerCase();
      const marcaFilterLower = marcaFilter.toLowerCase();

      // Condición del buscador principal (busca en nombre, CUIT, teléfono)
      const matchesSearchTerm = (
        (p.nombre?.toLowerCase() || '').includes(searchTermLower) ||
        (p.cuit?.toLowerCase() || '').includes(searchTermLower) ||
        (p.telefono?.toLowerCase() || '').includes(searchTermLower)
      );
      
      // Condiciones de los filtros avanzados
      const matchesZona = !zonaFilterLower || (p.zona?.toLowerCase() || '').includes(zonaFilterLower);
      const matchesRubro = !rubroFilterLower || (p.rubro?.toLowerCase() || '').includes(rubroFilterLower);
      const matchesMarca = !marcaFilterLower || (p.marcas?.toLowerCase() || '').includes(marcaFilterLower);

      return matchesSearchTerm && matchesZona && matchesRubro && matchesMarca;
    });
  }, [proveedores, searchTerm, zonaFilter, rubroFilter, marcaFilter]);

  return (
    <div className="bg-zinc-800 p-4 rounded-lg shadow-md border border-zinc-700">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-white">Lista de Proveedores</h3>
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300"
        >
          <FiFilter />
          {showFilters ? 'Ocultar Filtros' : 'Filtros Avanzados'}
        </button>
      </div>

      {/* --- Buscador Principal --- */}
      <input
        type="text"
        placeholder="Buscar por nombre, CUIT o teléfono..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full bg-zinc-700 text-white p-2 mb-4 rounded-md border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-500"
      />

      {/* --- NUEVO: Panel de Filtros Avanzados --- */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 overflow-hidden"
          >
            <input
              type="text"
              placeholder="Filtrar por Zona..."
              value={zonaFilter}
              onChange={(e) => setZonaFilter(e.target.value)}
              className="bg-zinc-700 text-white p-2 rounded-md border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
            <input
              type="text"
              placeholder="Filtrar por Rubro..."
              value={rubroFilter}
              onChange={(e) => setRubroFilter(e.target.value)}
              className="bg-zinc-700 text-white p-2 rounded-md border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
            <input
              type="text"
              placeholder="Filtrar por Marca..."
              value={marcaFilter}
              onChange={(e) => setMarcaFilter(e.target.value)}
              className="bg-zinc-700 text-white p-2 rounded-md border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-zinc-300">
          <thead className="text-xs text-zinc-100 uppercase bg-zinc-700">
            <tr>
              <th scope="col" className="px-6 py-3">Nombre</th>
              <th scope="col" className="px-6 py-3">Rubro</th>
              <th scope="col" className="px-6 py-3">Zona</th>
              <th scope="col" className="px-6 py-3">Teléfono</th>
              <th scope="col" className="px-6 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {filteredProveedores.length > 0 ? (
                filteredProveedores.map((proveedor) => (
                  <motion.tr
                    key={proveedor.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="bg-zinc-800 border-b border-zinc-700 hover:bg-zinc-700"
                  >
                    <td className="px-6 py-4 font-medium text-white">{proveedor.nombre}</td>
                    <td className="px-6 py-4">{proveedor.rubro || '-'}</td>
                    <td className="px-6 py-4">{proveedor.zona || '-'}</td>
                    <td className="px-6 py-4">{proveedor.telefono || '-'}</td>
                    <td className="px-6 py-4 flex items-center gap-3">
                      <button onClick={() => onEdit(proveedor)} className="text-blue-400 hover:text-blue-300"><FiEdit size={18} /></button>
                      <button onClick={() => onDelete(proveedor.id, proveedor.nombre)} className="text-red-500 hover:text-red-400"><FiTrash2 size={18} /></button>
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-zinc-400">
                    <div className="flex flex-col items-center justify-center gap-2"><FiInfo size={24} /><span>No se encontraron proveedores.</span></div>
                  </td>
                </tr>
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProveedorTable;