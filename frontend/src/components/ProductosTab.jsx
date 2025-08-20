// --- AÑADIDO ---
// El hook 'useRef' nos permitirá controlar un input invisible
import React, { useState, useMemo, useEffect, useRef } from 'react';
import ProductForm from './ProductForm.jsx';
import ProductTable from './ProductTable.jsx';
import PaginationControls from './PaginationControls.jsx';
// --- AÑADIDO ---
// Se añaden íconos para los nuevos botones
import { Search, UploadCloud, Download } from 'lucide-react';
import { useAppContext } from '../context/AppContext.jsx';
import { formatCurrency } from '../utils/helpers.js';
// --- AÑADIDO ---
// Se importan los componentes y servicios para la nueva funcionalidad
import { Button } from '@/components/ui/button';
import { exportToExcel } from '../services/exportService.js';
import { getFunctions, httpsCallable } from "firebase/functions";
import * as XLSX from 'xlsx';


const ITEMS_PER_PAGE_PRODUCTOS = 10;

function ProductosTab() {
    const {
        productos,
        handleSaveProduct,
        handleDeleteProduct,
        handleEditProduct,
        handleCancelEditProduct,
        editingProduct,
        mostrarMensaje,
    } = useAppContext();

    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'ascending' });
    const [currentPage, setCurrentPage] = useState(1);
    // --- AÑADIDO ---
    // Un estado para saber si estamos procesando un archivo
    const [isImporting, setIsImporting] = useState(false); 
    // Referencia al input de archivo invisible
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (editingProduct) {
            document.querySelector('#productos form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [editingProduct]);

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

    // --- AÑADIDO ---
    // Función para exportar la plantilla de Excel
    const handleExportTemplate = () => {
        if (productos.length === 0) {
            mostrarMensaje("No hay productos para exportar.", "warning");
            return;
        }
        const dataToExport = productos.map(p => ({
            'ID_PRODUCTO (NO MODIFICAR)': p.id,
            'Nombre': p.nombre,
            'Precio de Venta (MODIFICABLE)': p.precio,
            'Stock Actual (MODIFICABLE)': p.stock,
            'Costo': p.costo || 0,
            'Código de Barras': p.codigoBarras || 'N/A'
        }));
        exportToExcel(dataToExport, 'plantilla_actualizacion_productos');
        mostrarMensaje("Plantilla de actualización generada.", "success");
    };

    // --- AÑADIDO ---
    // Esta función se activa al hacer clic en el nuevo botón "Importar"
    const handleImportClick = () => {
        fileInputRef.current.click();
    };

    // --- AÑADIDO ---
    // Esta es la función principal que procesa el archivo seleccionado
    const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();

    reader.onload = async (e) => { // La función ahora es async
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(worksheet);

            // Preparamos los datos para enviar a la Cloud Function
            const productsToUpdate = json.map(row => ({
                id: row['ID_PRODUCTO (NO MODIFICAR)'],
                precio: row['Precio de Venta (MODIFICABLE)'],
                stock: row['Stock Actual (MODIFICABLE)']
            })).filter(p => p.id); // Filtramos por si alguna fila no tiene ID

            if (productsToUpdate.length === 0) {
                mostrarMensaje("No se encontraron productos con ID válido en el archivo.", "warning");
                setIsImporting(false);
                return;
            }

            // Llamamos a la Cloud Function
            const functions = getFunctions();
            const bulkUpdateProducts = httpsCallable(functions, 'bulkUpdateProducts');

            const result = await bulkUpdateProducts({ products: productsToUpdate });

            mostrarMensaje(result.data.message, "success");

        } catch (error) {
            console.error("Error al procesar o actualizar:", error);
            const errorMessage = error.message || "Ocurrió un error desconocido.";
            mostrarMensaje(`Error: ${errorMessage}`, "error");
        } finally {
            setIsImporting(false);
            event.target.value = '';
        }
    };

    reader.readAsArrayBuffer(file);
};
    const filteredSortedProductos = useMemo(() => {
        // ... (código existente sin cambios)
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
                    {/* --- AÑADIDO: Contenedor para los nuevos botones y la búsqueda --- */}
                    <div className='flex items-center gap-2 w-full sm:w-auto justify-end'>
                        <Button variant="outline" size="sm" onClick={handleImportClick} disabled={isImporting}>
                            <Download className="mr-2 h-4 w-4" />
                            {isImporting ? 'Procesando...' : 'Importar'}
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleExportTemplate}>
                            <UploadCloud className="mr-2 h-4 w-4" />
                            Exportar
                        </Button>
                        <div className="relative w-full sm:w-auto">
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400"><Search className="h-4 w-4" /></span>
                            <input type="text" placeholder="Buscar por Nombre, Código o ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full sm:w-64 pl-10 pr-4 py-2 border border-zinc-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-zinc-700 text-zinc-100 placeholder-zinc-400 text-sm"/>
                        </div>
                    </div>
                </div>
                 <div className="overflow-x-auto tabla-scrollable">
                     <ProductTable products={paginatedProductos} onEdit={handleEdit} onDelete={handleDelete} formatCurrency={formatCurrency} requestSort={requestSort} sortConfig={sortConfig} />
                 </div>
                <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} itemsPerPage={ITEMS_PER_PAGE_PRODUCTOS} totalItems={filteredSortedProductos.length}/>
            </div>
            {/* --- AÑADIDO: El input de tipo "file" que permanece oculto --- */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".xlsx, .xls"
            />
        </div>
    );
}
export default ProductosTab;