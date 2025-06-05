import React, { useState, useMemo, useEffect } from 'react';
import ProductForm from './ProductForm.jsx';
import ProductTable from './ProductTable.jsx';
import PaginationControls from './PaginationControls.jsx';
import { Search } from 'lucide-react';
import { useAppContext } from '../context/AppContext.jsx'; // Importar hook
import { formatCurrency } from '../utils/helpers.js'; // Importar helper

const ITEMS_PER_PAGE_PRODUCTOS = 10;

function ProductosTab() { // Ya no recibe props directamente
    const {
        productos,
        handleSaveProduct,    // Renombrado desde onSaveProduct
        handleDeleteProduct,  // Renombrado desde onDeleteProduct
        handleEditProduct,    // Renombrado desde onEditProduct
        handleCancelEditProduct, // Renombrado desde onCancelEditProduct
        editingProduct,
        mostrarMensaje,
        // confirmarAccion (si es necesario directamente aquí, o se usa dentro de los handlers del contexto)
    } = useAppContext();

    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'ascending' });
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        if (editingProduct) {
            document.querySelector('#productos form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [editingProduct]);

    // Los handlers locales ahora llaman a los handlers del contexto
    const handleSave = (productDataFromForm) => handleSaveProduct(productDataFromForm);
    const handleDelete = async (productId, productName) => await handleDeleteProduct(productId, productName);
    const handleEdit = (product) => handleEditProduct(product);
    const handleCancelEdit = () => handleCancelEditProduct();

    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') direction = 'descending';
        setSortConfig({ key, direction });
        setCurrentPage(1);
    };

    const filteredSortedProductos = useMemo(() => {
        let items = [...productos];
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            items = items.filter(p => p.nombre.toLowerCase().includes(lower) || (p.codigoBarras && p.codigoBarras.toLowerCase().includes(lower)) || (p.id && p.id.toString().toLowerCase().includes(lower)));
        }
        if (sortConfig.key) {
            items.sort((a, b) => {
                let valA = a[sortConfig.key]; let valB = b[sortConfig.key];
                if (typeof valA === 'string') valA = valA.toLowerCase();
                if (typeof valB === 'string') valB = valB.toLowerCase();
                if (typeof valA === 'number' && typeof valB === 'number') {} else { valA = String(valA); valB = String(valB); }
                if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return items;
    }, [productos, searchTerm, sortConfig]);

    const totalPages = Math.ceil(filteredSortedProductos.length / ITEMS_PER_PAGE_PRODUCTOS);
    const paginatedProductos = useMemo(() => {
        const first = (currentPage - 1) * ITEMS_PER_PAGE_PRODUCTOS;
        return filteredSortedProductos.slice(first, first + ITEMS_PER_PAGE_PRODUCTOS);
    }, [currentPage, filteredSortedProductos]);

     useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) setCurrentPage(totalPages);
        else if (currentPage <= 0 && totalPages > 0) setCurrentPage(1);
        else if (filteredSortedProductos.length === 0) setCurrentPage(1);
    }, [searchTerm, sortConfig, totalPages, currentPage, filteredSortedProductos.length]);

    return (
        <div id="productos">
            <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-white">Gestión de Productos</h2>
            <ProductForm onSave={handleSave} productToEdit={editingProduct} onCancelEdit={handleCancelEdit} mostrarMensaje={mostrarMensaje} />
            <div className="bg-zinc-800 p-4 sm:p-5 rounded-lg shadow-md overflow-hidden">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-3 border-b border-zinc-700 pb-2 gap-2">
                    <h3 className="text-lg sm:text-xl font-medium text-white whitespace-nowrap">Listado de Productos</h3>
                    <div className="relative w-full sm:w-auto">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400"><Search className="h-4 w-4" /></span>
                        <input type="text" placeholder="Buscar por Nombre, Código o ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full sm:w-64 pl-10 pr-4 py-2 border border-zinc-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-zinc-700 text-zinc-100 placeholder-zinc-400 text-sm"/>
                    </div>
                </div>
                 <div className="overflow-x-auto tabla-scrollable">
                     <ProductTable products={paginatedProductos} onEdit={handleEdit} onDelete={handleDelete} formatCurrency={formatCurrency} requestSort={requestSort} sortConfig={sortConfig} />
                 </div>
                <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} itemsPerPage={ITEMS_PER_PAGE_PRODUCTOS} totalItems={filteredSortedProductos.length}/>
            </div>
        </div>
    );
}
export default ProductosTab;