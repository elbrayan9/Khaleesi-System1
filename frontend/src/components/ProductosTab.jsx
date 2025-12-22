// --- AÑADIDO ---
// El hook 'useRef' nos permitirá controlar un input invisible
import React, { useState, useMemo, useEffect, useRef } from 'react';
import ProductForm from './ProductForm.jsx';
import ProductTable from './ProductTable.jsx';
import PaginationControls from './PaginationControls.jsx';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { motion } from 'framer-motion';
import QRCodeModal from './QRCodeModal';
// --- AÑADIDO ---
// Se añaden íconos para los nuevos botones
import {
  Search,
  UploadCloud,
  Download,
  AlertTriangle,
  Printer,
  TrendingUp,
  Trash2, // <--- AÑADIDO
  Package,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext.jsx';
import { formatCurrency } from '../utils/helpers.js';
// --- AÑADIDO ---
// Se importan los componentes y servicios para la nueva funcionalidad
import { Button } from '@/components/ui/button';
import { exportToExcel } from '../services/exportService.js';
import { getFunctions, httpsCallable } from 'firebase/functions';
import * as XLSX from 'xlsx';

const ITEMS_PER_PAGE_PRODUCTOS = 10;

function ProductosTab() {
  const {
    productos,
    datosNegocio,
    handleSaveProduct,
    handleDeleteProduct,
    handleEditProduct,
    handleCancelEditProduct,
    editingProduct,
    mostrarMensaje,
    handleBulkPriceUpdate,
    handleDeleteSelected, // <--- NUEVO
    handleDeleteDuplicates, // <--- NUEVO
  } = useAppContext();

  // --- INICIO DE LA NUEVA LÓGICA DE ALERTAS ---
  const umbralStockBajo = datosNegocio?.umbralStockBajo || 10; // Usa el umbral configurado o 10 por defecto
  const productosConStockBajo = useMemo(() => {
    return productos.filter((p) => p.stock <= umbralStockBajo);
  }, [productos, umbralStockBajo]);
  // --- FIN DE LA NUEVA LÓGICA DE ALERTAS ---

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortConfig, setSortConfig] = useState({
    key: 'id',
    direction: 'ascending',
  });
  const [currentPage, setCurrentPage] = useState(1);
  // --- AÑADIDO ---
  // Un estado para saber si estamos procesando un archivo
  const [isImporting, setIsImporting] = useState(false);
  const [qrModalProduct, setQrModalProduct] = useState(null);
  const [selectedProductIds, setSelectedProductIds] = useState(new Set());
  const [printOptions, setPrintOptions] = useState({
    // <--- AÑADE ESTE ESTADO
    includeQR: true,
    includeBarcode: true,
  });
  const [inflationPercentage, setInflationPercentage] = useState('');
  // Referencia al input de archivo invisible
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (editingProduct) {
      document
        .querySelector('#productos form')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [editingProduct]);

  const handleSave = (productDataFromForm) =>
    handleSaveProduct(productDataFromForm);
  const handleDelete = async (productId, productName) =>
    await handleDeleteProduct(productId, productName);
  const handleEdit = (product) => handleEditProduct(product);
  const handleCancelEdit = () => handleCancelEditProduct();

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending')
      direction = 'descending';
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };

  // --- AÑADIDO ---
  // Función para exportar la plantilla de Excel
  const handleExportTemplate = () => {
    if (productos.length === 0) {
      mostrarMensaje('No hay productos para exportar.', 'warning');
      return;
    }
    const dataToExport = productos.map((p) => ({
      'ID_PRODUCTO (NO MODIFICAR)': p.id,
      Nombre: p.nombre,
      'Precio de Venta (MODIFICABLE)': p.precio,
      'Stock Actual (MODIFICABLE)': p.stock,
      Costo: p.costo || 0,
      'Código de Barras': p.codigoBarras || 'N/A',
    }));
    exportToExcel(dataToExport, 'plantilla_actualizacion_productos');
    mostrarMensaje('Plantilla de actualización generada.', 'success');
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

    reader.onload = async (e) => {
      // La función ahora es async
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);

        // Preparamos los datos para enviar a la Cloud Function
        const productsToUpdate = json
          .map((row) => ({
            id: row['ID_PRODUCTO (NO MODIFICAR)'],
            precio: row['Precio de Venta (MODIFICABLE)'],
            stock: row['Stock Actual (MODIFICABLE)'],
          }))
          .filter((p) => p.id); // Filtramos por si alguna fila no tiene ID

        if (productsToUpdate.length === 0) {
          mostrarMensaje(
            'No se encontraron productos con ID válido en el archivo.',
            'warning',
          );
          setIsImporting(false);
          return;
        }

        // Llamamos a la Cloud Function
        const functions = getFunctions();
        const bulkUpdateProducts = httpsCallable(
          functions,
          'bulkUpdateProducts',
        );

        const result = await bulkUpdateProducts({ products: productsToUpdate });

        mostrarMensaje(result.data.message, 'success');
      } catch (error) {
        console.error('Error al procesar o actualizar:', error);
        const errorMessage = error.message || 'Ocurrió un error desconocido.';
        mostrarMensaje(`Error: ${errorMessage}`, 'error');
      } finally {
        setIsImporting(false);
        event.target.value = '';
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleProductSelect = (productId) => {
    setSelectedProductIds((prevSelectedIds) => {
      const newSelectedIds = new Set(prevSelectedIds);
      if (newSelectedIds.has(productId)) {
        newSelectedIds.delete(productId);
      } else {
        newSelectedIds.add(productId);
      }
      return newSelectedIds;
    });
  };

  const handleSelectAll = (isAllSelected) => {
    if (isAllSelected) {
      setSelectedProductIds(new Set());
    } else {
      const allProductIds = new Set(paginatedProductos.map((p) => p.id));
      setSelectedProductIds(allProductIds);
    }
  };
  // frontend/src/components/ProductosTab.jsx

  const filteredSortedProductos = useMemo(() => {
    let items = [...productos];

    // Aplicar filtros
    items = items.filter((p) => {
      // Filtro por texto de búsqueda (nombre o código)
      const lower = searchTerm.toLowerCase();
      const matchesSearch =
        p.nombre.toLowerCase().includes(lower) ||
        (p.codigoBarras && p.codigoBarras.toLowerCase().includes(lower));

      // Filtro por categoría (esta es la lógica que faltaba)
      const matchesCategory = categoryFilter
        ? p.categoria === categoryFilter
        : true;

      return matchesSearch && matchesCategory;
    });

    // Aplicar ordenamiento (esta parte no cambia)
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
  }, [productos, searchTerm, categoryFilter, sortConfig]); // <-- MUY IMPORTANTE: Asegúrate de que 'categoryFilter' esté aquí

  const categoriasUnicas = useMemo(() => {
    const categorias = productos.map((p) => p.categoria).filter(Boolean); // Filtra nulos o vacíos
    return [...new Set(categorias)]; // Obtiene valores únicos
  }, [productos]);

  const totalPages = Math.ceil(
    filteredSortedProductos.length / ITEMS_PER_PAGE_PRODUCTOS,
  );
  const paginatedProductos = useMemo(() => {
    const first = (currentPage - 1) * ITEMS_PER_PAGE_PRODUCTOS;
    return filteredSortedProductos.slice(
      first,
      first + ITEMS_PER_PAGE_PRODUCTOS,
    );
  }, [currentPage, filteredSortedProductos]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) setCurrentPage(totalPages);
    else if (currentPage <= 0 && totalPages > 0) setCurrentPage(1);
    else if (filteredSortedProductos.length === 0) setCurrentPage(1);
  }, [
    searchTerm,
    sortConfig,
    totalPages,
    currentPage,
    filteredSortedProductos.length,
  ]);

  const handlePrintSelected = () => {
    const selectedProductsData = productos.filter((p) =>
      selectedProductIds.has(p.id),
    );
    if (selectedProductsData.length === 0) {
      mostrarMensaje('No hay productos seleccionados.', 'warning');
      return;
    }
    // Guardamos los datos en sessionStorage para pasarlos a la nueva pestaña
    sessionStorage.setItem(
      'productsToPrint',
      JSON.stringify(selectedProductsData),
    );
    sessionStorage.setItem('printOptions', JSON.stringify(printOptions));
    window.open('/print-labels', '_blank');
  };

  return (
    <div id="productos">
      <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-white sm:text-2xl">
        <Package className="h-8 w-8 text-purple-500" />
        Gestión de Productos
      </h2>
      {/* --- INICIO DEL NUEVO PANEL DE ALERTAS --- */}
      {productosConStockBajo.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 rounded-lg border border-yellow-500/30 bg-yellow-900/50 p-4"
        >
          <div className="mb-3 flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-yellow-400" />
            <h3 className="text-lg font-semibold text-yellow-300">
              Alertas de Stock Bajo
            </h3>
          </div>
          <div className="max-h-[400px] overflow-x-auto overflow-y-auto rounded-md border border-yellow-500/20">
            <Table className="min-w-full">
              <TableHeader className="sticky top-0 z-10 bg-yellow-900/95 backdrop-blur-sm">
                <TableRow className="border-b-yellow-500/30 hover:bg-transparent">
                  <TableHead className="text-yellow-200">Producto</TableHead>
                  <TableHead className="text-center text-yellow-200">
                    Stock Actual
                  </TableHead>
                  <TableHead className="text-center text-yellow-200">
                    Umbral
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productosConStockBajo.map((producto) => (
                  <TableRow
                    key={producto.id}
                    className="border-b-yellow-500/20 hover:bg-yellow-500/10"
                  >
                    <TableCell className="font-medium text-zinc-200">
                      {producto.nombre}
                    </TableCell>
                    <TableCell className="text-center font-bold text-red-400">
                      {producto.stock}
                    </TableCell>
                    <TableCell className="text-center text-zinc-400">
                      {umbralStockBajo}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </motion.div>
      )}
      {/* --- FIN DEL NUEVO PANEL DE ALERTAS --- */}
      <ProductForm
        onSave={handleSave}
        productToEdit={editingProduct}
        onCancelEdit={handleCancelEdit}
        mostrarMensaje={mostrarMensaje}
      />
      <div className="overflow-hidden rounded-lg bg-zinc-800 p-4 shadow-md sm:p-5">
        <div className="mb-3 space-y-4 border-b border-zinc-700 pb-3">
          <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
            <h3 className="whitespace-nowrap text-lg font-medium text-white sm:text-xl">
              Listado de Productos
            </h3>
            <div className="flex items-center gap-2">
              {/* Filtros de Búsqueda */}
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Buscar por nombre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-md border border-zinc-600 bg-zinc-700 py-2 pl-10 pr-4 text-zinc-100 sm:w-48"
                />
              </div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full rounded-md border border-zinc-600 bg-zinc-700 px-3 py-2 text-zinc-100 sm:w-48"
              >
                <option value="">Todas las categorías</option>
                {categoriasUnicas.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Grupo de Botones de Acción */}
            <div className="flex items-center gap-2">
              {/* Botones de Eliminación (NUEVOS) */}
              {selectedProductIds.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={async () => {
                    const success =
                      await handleDeleteSelected(selectedProductIds);
                    if (success) setSelectedProductIds(new Set());
                  }}
                  className="bg-red-600 text-white hover:bg-red-700"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar ({selectedProductIds.size})
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={handleDeleteDuplicates}
                className="border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white"
                title="Eliminar duplicados (conserva mayor stock)"
              >
                <AlertTriangle className="mr-2 h-4 w-4" />
                Limpiar Duplicados
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleImportClick}
                disabled={isImporting}
                className="border-blue-500 bg-transparent text-blue-500 hover:bg-blue-500 hover:text-white"
              >
                <Download className="mr-2 h-4 w-4" />
                {isImporting ? 'Procesando...' : 'Importar'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportTemplate}
                className="border-green-500 bg-transparent text-green-500 hover:bg-green-500 hover:text-white"
              >
                <UploadCloud className="mr-2 h-4 w-4" />
                Exportar
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handlePrintSelected}
                disabled={selectedProductIds.size === 0}
              >
                <Printer className="mr-2 h-4 w-4" />
                Imprimir Selección ({selectedProductIds.size})
              </Button>
            </div>

            {/* Grupo de Opciones de Impresión y Actualización */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              {/* Opciones de Impresión */}
              <div className="flex items-center gap-4 text-sm text-zinc-300">
                <span className="font-medium">Opciones:</span>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={printOptions.includeBarcode}
                    onChange={(e) =>
                      setPrintOptions((prev) => ({
                        ...prev,
                        includeBarcode: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 cursor-pointer rounded border-zinc-600 bg-zinc-700 text-blue-500 focus:ring-blue-600"
                  />
                  Código de Barras
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={printOptions.includeQR}
                    onChange={(e) =>
                      setPrintOptions((prev) => ({
                        ...prev,
                        includeQR: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 cursor-pointer rounded border-zinc-600 bg-zinc-700 text-blue-500 focus:ring-blue-600"
                  />
                  Código QR
                </label>
              </div>

              {/* Sección de Actualización Masiva */}
              <div className="flex items-center gap-2 rounded-lg border border-zinc-600 bg-zinc-700/50 p-2">
                <label
                  htmlFor="inflation-input"
                  className="whitespace-nowrap text-sm font-medium text-zinc-300"
                >
                  Aumento (%):
                </label>
                <input
                  id="inflation-input"
                  type="number"
                  value={inflationPercentage}
                  onChange={(e) => setInflationPercentage(e.target.value)}
                  placeholder="Ej: 15.5"
                  className="h-8 w-24 rounded-md border-zinc-700 bg-zinc-800 p-2 text-sm"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleBulkPriceUpdate(inflationPercentage)}
                >
                  <TrendingUp className="mr-1.5 h-4 w-4" />
                  Aplicar
                </Button>
              </div>
            </div>
          </div>
        </div>
        <div className="tabla-scrollable overflow-x-auto">
          <ProductTable
            products={paginatedProductos}
            onEdit={handleEdit}
            onDelete={handleDelete}
            formatCurrency={formatCurrency}
            requestSort={requestSort}
            sortConfig={sortConfig}
            onGenerateQR={setQrModalProduct}
            selectedProductIds={selectedProductIds}
            onProductSelect={handleProductSelect}
            onSelectAll={handleSelectAll}
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
      {qrModalProduct && (
        <QRCodeModal
          product={qrModalProduct}
          onClose={() => setQrModalProduct(null)}
        />
      )}
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
