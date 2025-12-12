import React, { useState, useMemo, useEffect } from 'react';
import ClientForm from './ClientForm.jsx';
import ClientTable from './ClientTable.jsx';
import PaginationControls from './PaginationControls.jsx';
import { Search } from 'lucide-react';
import { useAppContext } from '../context/AppContext.jsx'; // Importar hook

const ITEMS_PER_PAGE_CLIENTES = 10;

function ClientesTab() {
  // Ya no recibe props directamente
  const {
    clientes,
    handleSaveClient, // Renombrado desde onSaveClient
    handleDeleteClient, // Renombrado desde onDeleteClient
    handleEditClient, // Renombrado desde onEditClient
    handleCancelEditClient, // Renombrado desde onCancelEditClient
    editingClient,
    mostrarMensaje,
    // confirmarAccion (si es necesario)
  } = useAppContext();

  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({
    key: 'id',
    direction: 'ascending',
  });
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (editingClient) {
      document
        .querySelector('#clientes form')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [editingClient]);

  const handleSave = (clientDataFromForm) =>
    handleSaveClient(clientDataFromForm);
  const handleDelete = async (clientId, clientName) =>
    await handleDeleteClient(clientId, clientName);
  const handleEdit = (client) => handleEditClient(client);
  const handleCancelEdit = () => handleCancelEditClient();

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending')
      direction = 'descending';
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };

  const filteredSortedClientes = useMemo(() => {
    let items = [...clientes];
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      // Limpiamos el término de búsqueda de guiones y espacios para comparar números
      const cleanSearch = lower.replace(/[^0-9a-z]/g, '');

      items = items.filter((c) => {
        const nombreMatch = c.nombre.toLowerCase().includes(lower);
        const idMatch = c.id && c.id.toString().toLowerCase().includes(lower);

        // Búsqueda robusta de CUIT/DNI
        let cuitMatch = false;
        if (c.cuit) {
          const cleanCuit = c.cuit.replace(/[^0-9a-z]/g, ''); // Limpiamos el CUIT guardado
          // Comparamos si el CUIT limpio incluye el término limpio (o viceversa si es corto)
          cuitMatch = cleanCuit.includes(cleanSearch);
        }

        // También buscamos si tiene campo 'dni' explícito (por compatibilidad)
        let dniMatch = false;
        if (c.dni) {
          const cleanDni = c.dni.toString().replace(/[^0-9a-z]/g, '');
          dniMatch = cleanDni.includes(cleanSearch);
        }

        return nombreMatch || idMatch || cuitMatch || dniMatch;
      });
    }
    if (sortConfig.key) {
      items.sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return items;
  }, [clientes, searchTerm, sortConfig]);

  const totalPages = Math.ceil(
    filteredSortedClientes.length / ITEMS_PER_PAGE_CLIENTES,
  );
  const paginatedClientes = useMemo(() => {
    const first = (currentPage - 1) * ITEMS_PER_PAGE_CLIENTES;
    return filteredSortedClientes.slice(first, first + ITEMS_PER_PAGE_CLIENTES);
  }, [currentPage, filteredSortedClientes]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) setCurrentPage(totalPages);
    else if (currentPage <= 0 && totalPages > 0) setCurrentPage(1);
    else if (filteredSortedClientes.length === 0) setCurrentPage(1);
  }, [
    searchTerm,
    sortConfig,
    totalPages,
    currentPage,
    filteredSortedClientes.length,
  ]);

  return (
    <div id="clientes">
      <h2 className="mb-4 text-xl font-semibold text-white sm:text-2xl">
        Gestión de Clientes
      </h2>
      <ClientForm
        onSave={handleSave}
        clientToEdit={editingClient}
        onCancelEdit={handleCancelEdit}
        mostrarMensaje={mostrarMensaje}
      />
      <div className="overflow-hidden rounded-lg bg-zinc-800 p-4 shadow-md sm:p-5">
        <div className="mb-3 flex flex-col items-center justify-between gap-2 border-b border-zinc-700 pb-2 sm:flex-row">
          <h3 className="whitespace-nowrap text-lg font-medium text-white sm:text-xl">
            Listado de Clientes
          </h3>
          <div className="relative w-full sm:w-auto">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 transform text-zinc-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="Buscar por Nombre, CUIT/DNI o ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-md border border-zinc-600 bg-zinc-700 py-2 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-400 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:w-64"
            />
          </div>
        </div>
        <div className="tabla-scrollable overflow-x-auto">
          <ClientTable
            clients={paginatedClientes}
            onEdit={handleEdit}
            onDelete={handleDelete}
            requestSort={requestSort}
            sortConfig={sortConfig}
          />
        </div>
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          itemsPerPage={ITEMS_PER_PAGE_CLIENTES}
          totalItems={filteredSortedClientes.length}
        />
      </div>
    </div>
  );
}
export default ClientesTab;
