// src/components/ProductosTab.jsx
import React, { useState, useMemo, useEffect } from 'react';
import ProductForm from './ProductForm.jsx';
import ProductTable from './ProductTable.jsx';
import PaginationControls from './PaginationControls.jsx'; // Asumiendo que lo quieres usar aquí también
import { Search } from 'lucide-react';

const ITEMS_PER_PAGE_PRODUCTOS = 10; // O el valor que prefieras

function ProductosTab({
    productos,          // Lista de productos desde App.jsx
    onSaveProduct,      // Función para guardar/actualizar desde App.jsx
    onDeleteProduct,    // Función para eliminar desde App.jsx
    onEditProduct,      // Función de App.jsx para indicar qué producto editar
    onCancelEditProduct, // Función de App.jsx para cancelar edición
    editingProduct,     // Producto actualmente en edición, desde App.jsx
    // Helpers
    formatCurrency,
    mostrarMensaje,     // Ya adaptado para dark mode en App.jsx
    confirmarAccion     // Ya adaptado para dark mode en App.jsx
}) {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'ascending' });
    const [currentPage, setCurrentPage] = useState(1);

    // Enfocar formulario si hay un producto en edición
    useEffect(() => {
        if (editingProduct) {
            const formElement = document.querySelector('#productos form');
            formElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [editingProduct]);


    const handleSave = (productDataFromForm) => {
        // El ID ya vendrá en productDataFromForm si es una edición
        onSaveProduct(productDataFromForm);
        // App.jsx se encargará de limpiar editingProduct
    };

    const handleDelete = async (productId, productName) => {
        await onDeleteProduct(productId, productName);
        // App.jsx se encargará de limpiar editingProduct si es necesario
    };

    const handleEdit = (product) => {
        onEditProduct(product); // Llama a la función de App.jsx
    };

    const handleCancelEdit = () => {
        onCancelEditProduct(); // Llama a la función de App.jsx
    };

    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
        setCurrentPage(1);
    };

    const filteredSortedProductos = useMemo(() => {
        let items = [...productos];
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            items = items.filter(p =>
                p.nombre.toLowerCase().includes(lower) ||
                (p.codigoBarras && p.codigoBarras.toLowerCase().includes(lower)) ||
                (p.id && p.id.toString().toLowerCase().includes(lower))
            );
        }
        if (sortConfig.key) {
            items.sort((a, b) => {
                let valA = a[sortConfig.key];
                let valB = b[sortConfig.key];

                if (typeof valA === 'string') valA = valA.toLowerCase();
                if (typeof valB === 'string') valB = valB.toLowerCase();
                if (typeof valA === 'number' && typeof valB === 'number') {
                    // no hacer nada
                } else { // convertir a string para comparar si no son números
                    valA = String(valA);
                    valB = String(valB);
                }

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
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(totalPages);
        } else if (currentPage <= 0 && totalPages > 0) {
             setCurrentPage(1);
        } else if (filteredSortedProductos.length === 0) {
            setCurrentPage(1);
        }
    }, [searchTerm, sortConfig, totalPages, currentPage, filteredSortedProductos.length]);


    return (
        <div id="productos">
            <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-white">Gestión de Productos</h2>
            <ProductForm
                onSave={handleSave} // Pasa el handler local que llama a la prop de App
                productToEdit={editingProduct}
                onCancelEdit={handleCancelEdit} // Pasa el handler de App
                mostrarMensaje={mostrarMensaje}
            />

            <div className="bg-zinc-800 p-4 sm:p-5 rounded-lg shadow-md overflow-hidden">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-3 border-b border-zinc-700 pb-2 gap-2">
                    <h3 className="text-lg sm:text-xl font-medium text-white whitespace-nowrap">Listado de Productos</h3>
                    <div className="relative w-full sm:w-auto">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400">
                            <Search className="h-4 w-4" />
                        </span>
                        <input
                            type="text"
                            placeholder="Buscar por Nombre, Código o ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full sm:w-64 pl-10 pr-4 py-2 border border-zinc-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-zinc-700 text-zinc-100 placeholder-zinc-400 text-sm"
                        />
                    </div>
                </div>
                 <div className="overflow-x-auto tabla-scrollable"> {/* Añadida clase para scroll */}
                     <ProductTable
                        products={paginatedProductos}
                        onEdit={handleEdit} // Pasa el handler local
                        onDelete={handleDelete} // Pasa el handler local
                        formatCurrency={formatCurrency}
                        requestSort={requestSort}
                        sortConfig={sortConfig}
                    />
                 </div>
                <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    itemsPerPage={ITEMS_PER_PAGE_PRODUCTOS}
                    totalItems={filteredSortedProductos.length}
                />
            </div>
        </div>
    );
}

export default ProductosTab;