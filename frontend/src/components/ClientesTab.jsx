import React, { useState, useMemo, useEffect } from 'react';
import ClientForm from './ClientForm.jsx';
import ClientTable from './ClientTable.jsx';
import PaginationControls from './PaginationControls.jsx';
import { Search } from 'lucide-react';
import { useAppContext } from '../context/AppContext.jsx'; // Importar hook

const ITEMS_PER_PAGE_CLIENTES = 10;

function ClientesTab() { // Ya no recibe props directamente
    const {
        clientes,
        handleSaveClient,       // Renombrado desde onSaveClient
        handleDeleteClient,     // Renombrado desde onDeleteClient
        handleEditClient,       // Renombrado desde onEditClient
        handleCancelEditClient, // Renombrado desde onCancelEditClient
        editingClient,
        mostrarMensaje,
        // confirmarAccion (si es necesario)
    } = useAppContext();

    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'ascending' });
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        if (editingClient) {
            document.querySelector('#clientes form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [editingClient]);

    const handleSave = (clientDataFromForm) => handleSaveClient(clientDataFromForm);
    const handleDelete = async (clientId, clientName) => await handleDeleteClient(clientId, clientName);
    const handleEdit = (client) => handleEditClient(client);
    const handleCancelEdit = () => handleCancelEditClient();

    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') direction = 'descending';
        setSortConfig({ key, direction });
        setCurrentPage(1);
    };

    const filteredSortedClientes = useMemo(() => {
        let items = [...clientes];
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            items = items.filter(c => c.nombre.toLowerCase().includes(lower) || (c.cuit && c.cuit.toLowerCase().includes(lower)) || (c.id && c.id.toString().toLowerCase().includes(lower)));
        }
        if (sortConfig.key) {
            items.sort((a, b) => {
                let valA = a[sortConfig.key]; let valB = b[sortConfig.key];
                if (typeof valA === 'string') valA = valA.toLowerCase(); if (typeof valB === 'string') valB = valB.toLowerCase();
                if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return items;
    }, [clientes, searchTerm, sortConfig]);

    const totalPages = Math.ceil(filteredSortedClientes.length / ITEMS_PER_PAGE_CLIENTES);
    const paginatedClientes = useMemo(() => {
        const first = (currentPage - 1) * ITEMS_PER_PAGE_CLIENTES;
        return filteredSortedClientes.slice(first, first + ITEMS_PER_PAGE_CLIENTES);
    }, [currentPage, filteredSortedClientes]);

    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) setCurrentPage(totalPages);
        else if (currentPage <= 0 && totalPages > 0) setCurrentPage(1);
        else if (filteredSortedClientes.length === 0) setCurrentPage(1);
    }, [searchTerm, sortConfig, totalPages, currentPage, filteredSortedClientes.length]);

    return (
        <div id="clientes">
            <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-white">Gestión de Clientes</h2>
            <ClientForm onSave={handleSave} clientToEdit={editingClient} onCancelEdit={handleCancelEdit} mostrarMensaje={mostrarMensaje}/>
            <div className="bg-zinc-800 p-4 sm:p-5 rounded-lg shadow-md overflow-hidden">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-3 border-b border-zinc-700 pb-2 gap-2">
                    <h3 className="text-lg sm:text-xl font-medium text-white whitespace-nowrap">Listado de Clientes</h3>
                    <div className="relative w-full sm:w-auto">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400"><Search className="h-4 w-4" /></span>
                        <input type="text" placeholder="Buscar por Nombre, CUIT o ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full sm:w-64 pl-10 pr-4 py-2 border border-zinc-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-zinc-700 text-zinc-100 placeholder-zinc-400 text-sm"/>
                    </div>
                </div>
                 <div className="overflow-x-auto tabla-scrollable">
                    <ClientTable clients={paginatedClientes} onEdit={handleEdit} onDelete={handleDelete} requestSort={requestSort} sortConfig={sortConfig}/>
                </div>
                <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} itemsPerPage={ITEMS_PER_PAGE_CLIENTES} totalItems={filteredSortedClientes.length}/>
            </div>
        </div>
    );
}
export default ClientesTab;