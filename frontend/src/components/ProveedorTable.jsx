// frontend/src/components/ProveedorTable.jsx
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiEdit, FiTrash2, FiInfo, FiFilter } from 'react-icons/fi';
import { MessageCircle, Mail } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { telefonoWhatsapp } from '../utils/telefono.js';
import { formatCurrency } from '../utils/helpers';
import {
  comprasDeProveedor,
  fechaCorta,
  diasDesde,
} from '../utils/comprasProveedor.js';

const ProveedorTable = ({ proveedores, onEdit, onDelete }) => {
  const { pedidos, mostrarMensaje } = useAppContext();
  // Estado para el buscador principal
  const [searchTerm, setSearchTerm] = useState('');

  // NUEVO: Estados para los filtros avanzados
  const [showFilters, setShowFilters] = useState(false);
  const [zonaFilter, setZonaFilter] = useState('');
  const [rubroFilter, setRubroFilter] = useState('');
  const [marcaFilter, setMarcaFilter] = useState('');

  // Qué le compró el comercio a cada uno. El dato ya estaba guardado dentro de
  // los pedidos; lo que faltaba era traerlo hasta acá, que es donde se decide a
  // quién comprarle. Se calcula una vez para todos y no una vez por fila.
  const comprasPorProveedor = useMemo(() => {
    const mapa = {};
    (proveedores || []).forEach((p) => {
      mapa[p.id] = comprasDeProveedor(pedidos, p.id);
    });
    return mapa;
  }, [proveedores, pedidos]);

  const escribirWhatsapp = (p) => {
    const tel = telefonoWhatsapp(p.telefono);
    if (!tel) {
      mostrarMensaje?.(`${p.nombre} no tiene teléfono cargado.`, 'warning');
      return;
    }
    const texto = `Hola ${p.nombre}! Te escribo para hacerte un pedido.`;
    window.open(
      `https://wa.me/${tel}?text=${encodeURIComponent(texto)}`,
      '_blank',
      'noopener,noreferrer',
    );
  };

  const escribirMail = (p) => {
    if (!p.email) {
      mostrarMensaje?.(`${p.nombre} no tiene email cargado.`, 'warning');
      return;
    }
    window.location.href = `mailto:${p.email}?subject=${encodeURIComponent('Pedido')}`;
  };

  const filteredProveedores = useMemo(() => {
    if (!proveedores) return [];

    return proveedores.filter((p) => {
      const searchTermLower = searchTerm.toLowerCase();
      const zonaFilterLower = zonaFilter.toLowerCase();
      const rubroFilterLower = rubroFilter.toLowerCase();
      const marcaFilterLower = marcaFilter.toLowerCase();

      // Condición del buscador principal (busca en nombre, CUIT, teléfono)
      const matchesSearchTerm =
        (p.nombre?.toLowerCase() || '').includes(searchTermLower) ||
        (p.cuit?.toLowerCase() || '').includes(searchTermLower) ||
        (p.telefono?.toLowerCase() || '').includes(searchTermLower);

      // Condiciones de los filtros avanzados
      const matchesZona =
        !zonaFilterLower ||
        (p.zona?.toLowerCase() || '').includes(zonaFilterLower);
      const matchesRubro =
        !rubroFilterLower ||
        (p.rubro?.toLowerCase() || '').includes(rubroFilterLower);
      const matchesMarca =
        !marcaFilterLower ||
        (p.marcas?.toLowerCase() || '').includes(marcaFilterLower);

      return matchesSearchTerm && matchesZona && matchesRubro && matchesMarca;
    });
  }, [proveedores, searchTerm, zonaFilter, rubroFilter, marcaFilter]);

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4 shadow-md">
      <div className="mb-4 flex items-center justify-between">
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
        className="mb-4 w-full rounded-md border border-zinc-600 bg-zinc-700 p-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
      />

      {/* --- NUEVO: Panel de Filtros Avanzados --- */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mb-4 grid grid-cols-1 gap-4 overflow-hidden md:grid-cols-3"
          >
            <input
              type="text"
              placeholder="Filtrar por Zona..."
              value={zonaFilter}
              onChange={(e) => setZonaFilter(e.target.value)}
              className="rounded-md border border-zinc-600 bg-zinc-700 p-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
            <input
              type="text"
              placeholder="Filtrar por Rubro..."
              value={rubroFilter}
              onChange={(e) => setRubroFilter(e.target.value)}
              className="rounded-md border border-zinc-600 bg-zinc-700 p-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
            <input
              type="text"
              placeholder="Filtrar por Marca..."
              value={marcaFilter}
              onChange={(e) => setMarcaFilter(e.target.value)}
              className="rounded-md border border-zinc-600 bg-zinc-700 p-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-zinc-300">
          <thead className="bg-zinc-700 text-xs uppercase text-zinc-100">
            <tr>
              <th scope="col" className="px-6 py-3">
                Nombre
              </th>
              <th scope="col" className="px-6 py-3">
                Rubro
              </th>
              <th scope="col" className="px-6 py-3">
                Zona
              </th>
              <th scope="col" className="px-6 py-3">
                Última compra
              </th>
              <th scope="col" className="px-6 py-3 text-right">
                Últimos 30 días
              </th>
              <th scope="col" className="px-6 py-3">
                Contacto
              </th>
              <th scope="col" className="px-6 py-3">
                Acciones
              </th>
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
                    className="border-b border-zinc-700 bg-zinc-800 hover:bg-zinc-700"
                  >
                    <td className="px-6 py-4 font-medium text-white">
                      {proveedor.nombre}
                    </td>
                    <td className="px-6 py-4">{proveedor.rubro || '-'}</td>
                    <td className="px-6 py-4">{proveedor.zona || '-'}</td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {(() => {
                        const c = comprasPorProveedor[proveedor.id];
                        if (!c?.ultima)
                          return <span className="text-zinc-500">Nunca</span>;
                        const dias = diasDesde(c.ultima);
                        return (
                          <>
                            <span className="text-zinc-200">
                              {fechaCorta(c.ultima)}
                            </span>
                            {dias !== null && (
                              <span className="ml-2 text-xs text-zinc-500">
                                {dias === 0
                                  ? 'hoy'
                                  : dias === 1
                                    ? 'ayer'
                                    : `hace ${dias} días`}
                              </span>
                            )}
                          </>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 text-right tabular-nums">
                      {comprasPorProveedor[proveedor.id]?.total ? (
                        <span className="font-medium text-zinc-100">
                          $
                          {formatCurrency(
                            comprasPorProveedor[proveedor.id].total,
                          )}
                        </span>
                      ) : (
                        <span className="text-zinc-500">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => escribirWhatsapp(proveedor)}
                          className="text-green-400 hover:text-green-300 disabled:opacity-30"
                          disabled={!proveedor.telefono}
                          title={
                            proveedor.telefono
                              ? `WhatsApp a ${proveedor.telefono}`
                              : 'Sin teléfono cargado'
                          }
                          aria-label={`Escribirle por WhatsApp a ${proveedor.nombre}`}
                        >
                          <MessageCircle size={18} />
                        </button>
                        <button
                          onClick={() => escribirMail(proveedor)}
                          className="text-sky-400 hover:text-sky-300 disabled:opacity-30"
                          disabled={!proveedor.email}
                          title={proveedor.email || 'Sin email cargado'}
                          aria-label={`Mandarle un mail a ${proveedor.nombre}`}
                        >
                          <Mail size={18} />
                        </button>
                        {/* El número a la vista: para llamar desde el teléfono
                            del local hay que poder leerlo, no solo tocarlo. */}
                        {proveedor.telefono && (
                          <span className="text-xs text-zinc-400">
                            {proveedor.telefono}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="flex items-center gap-3 px-6 py-4">
                      <button
                        onClick={() => onEdit(proveedor)}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        <FiEdit size={18} />
                      </button>
                      <button
                        onClick={() => onDelete(proveedor.id, proveedor.nombre)}
                        className="text-red-500 hover:text-red-400"
                      >
                        <FiTrash2 size={18} />
                      </button>
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-zinc-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FiInfo size={24} />
                      <span>No se encontraron proveedores.</span>
                    </div>
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
