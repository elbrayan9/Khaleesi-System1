// src/components/VentaTab.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Cart from './Cart.jsx';
import PaymentModal from './PaymentModal.jsx';
import SearchBar from './SearchBar.jsx';
import { useAppContext } from '../context/AppContext.jsx';
import SelectorVendedor from './SelectorVendedor';
import ShiftManager from './ShiftManager';
import { formatCurrency } from '../utils/helpers.js';

function VentaTab() {
    // --- OBTENER DATOS Y FUNCIONES DESDE EL CONTEXTO ---
    const {
        productos,
        clientes,
        vendedores,
        vendedorActivoId,
        setVendedorActivoId,
        cartItems,
        setCartItems,
        datosNegocio, // Para saber si se muestra la Venta Rápida
        handleSaleConfirmed,
        handleAddManualItemToCart,
        mostrarMensaje,
        handleAddToCart,
    } = useAppContext();

    // --- ESTADOS LOCALES DEL COMPONENTE ---
    const [selectedProductManual, setSelectedProductManual] = useState(null);
    const [cantidadVenta, setCantidadVenta] = useState(1);
    const [selectedClientId, setSelectedClientId] = useState(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [descuentoVenta, setDescuentoVenta] = useState(0);
    
    // --- Estados para la Venta Rápida ---
    const [descripcionManual, setDescripcionManual] = useState('');
    const [montoManual, setMontoManual] = useState('');

    // --- REFERENCIAS A ELEMENTOS DEL DOM ---
    const barcodeInputRef = useRef(null);
    const cantidadInputRef = useRef(null);
    const descripcionManualRef = useRef(null);
    const manualProductSearchRef = useRef(null);

    useEffect(() => {
        barcodeInputRef.current?.focus();
    }, []);

    // --- LÓGICA PARA AGREGAR ITEMS AL CARRITO ---
const handleAgregarPorCodigo = (codigo) => {
    if (!codigo || !codigo.trim()) return;
    const barcode = codigo.trim();

    // --- LÓGICA INTELIGENTE PARA CÓDIGOS DE BALANZA ---
    // Asumimos un formato estándar: 13 dígitos que empieza con '20'
    if (barcode.length === 13 && barcode.startsWith('20')) {
        const productCode = barcode.substring(2, 7); // Los 5 dígitos del producto
        const priceInCents = parseInt(barcode.substring(7, 12), 10); // Los 5 dígitos del precio
        
        if (!isNaN(priceInCents)) {
            const product = productos.find(p => p.codigoBarras === productCode);
            
            if (product) {
                const price = priceInCents / 100.0;
                // Creamos un item especial con el precio del ticket
                const itemFromScale = {
                    ...product,
                    precioFinal: price,
                    cantidad: 1, // Es 1 ticket
                    vendidoPor: 'ticketBalanza' // Un identificador especial
                };
                handleAddToCart(itemFromScale, 1, 0); // Lo añadimos al carrito
                if (barcodeInputRef.current) barcodeInputRef.current.value = '';
                barcodeInputRef.current?.focus();
                return; // Terminamos la ejecución aquí
            }
        }
    }
    
    // Si no es un código de balanza, busca un producto normal
    const product = productos.find(p => p.codigoBarras === barcode);
    if (product) {
        handleAddToCart(product, 1, 0);
        if (barcodeInputRef.current) barcodeInputRef.current.value = ''; 
        barcodeInputRef.current?.focus(); 
    } else {
        mostrarMensaje(`Código "${barcode}" no encontrado.`, 'warning');
        barcodeInputRef.current?.select();
    }
};

// REEMPLAZA 'handleAgregarManual' con esta versión:
const handleAgregarManual = () => {
    if (!selectedProductManual || !selectedProductManual.id) { 
        mostrarMensaje("Busque y seleccione un producto válido.", 'warning'); 
        return; 
    }
    const cantidadNumerica = parseInt(cantidadVenta, 10);
    if (isNaN(cantidadNumerica) || cantidadNumerica <= 0) { 
        mostrarMensaje("Ingrese una cantidad válida.", 'warning'); 
        return; 
    }
    
    handleAddToCart(selectedProductManual, cantidadNumerica, descuentoVenta); // Llama a la nueva función
    
    // Reseteamos los campos
    setSelectedProductManual(null);
    setCantidadVenta(1);
    setDescuentoVenta(0); // También reseteamos el descuento
    manualProductSearchRef.current?.clearInput();
    barcodeInputRef.current?.focus();
};

    const handleAgregarVentaRapida = () => {
        if (handleAddManualItemToCart(descripcionManual, montoManual)) {
            setDescripcionManual('');
            setMontoManual('');
            descripcionManualRef.current?.focus();
        }
    };

    const handleConfirmPayment = (metodoPago, tipoFactura) => {
        setIsPaymentModalOpen(false);
        const totalVenta = calculateTotal();
        const clienteFinal = selectedClientId ? clientes.find(c => c.id === selectedClientId) : null;
        handleSaleConfirmed(cartItems, totalVenta, clienteFinal, metodoPago, tipoFactura);
        setSelectedClientId(null);
        barcodeInputRef.current?.focus();
    };
    
    const calculateTotal = () => {
    return cartItems.reduce((total, item) => {
        // Usa el precioFinal si tiene descuento, si no, el precio normal
        const precioACalcular = item.precioFinal ?? item.precio;
        return total + (precioACalcular * item.cantidad);
    }, 0);
};
    const productosConStock = productos.filter(p => p.stock > 0);

    return (
        <div id="venta">
            <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-white">Nueva Venta</h2>
                    <div className="mb-4 p-4 bg-zinc-800 rounded-lg border border-zinc-700 max-w-md">
            <label className="block text-md font-medium text-zinc-200 mb-2">Vendedor Activo</label>
{/* --- CONTENEDOR PARA SELECTOR Y TURNO --- */}
<div className="grid grid-cols-1 sm:grid-cols-1 gap-4">
    <SelectorVendedor vendedores={vendedores} vendedorActivoId={vendedorActivoId} onSelectVendedor={setVendedorActivoId} />
    <ShiftManager />
</div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                <div className="lg:col-span-2 bg-zinc-800 p-4 sm:p-5 rounded-lg shadow-md space-y-4">
                    <h3 className="text-lg sm:text-xl font-medium text-white border-b border-zinc-700 pb-2">Agregar Productos</h3>
                    
                    {/* --- AGREGAR POR CÓDIGO DE BARRAS --- */}
                    <div>
                        <label htmlFor="scan-barcode-react" className="block text-sm font-medium text-zinc-300 mb-1">Escanear Código de Barras:</label>
                        <div className="flex">
                            <input type="text" id="scan-barcode-react" ref={barcodeInputRef} placeholder="Ingrese o escanee código..." className="flex-grow p-2 border border-zinc-600 rounded-l-md bg-zinc-700 text-zinc-100" onKeyPress={(e) => { if(e.key === 'Enter') handleAgregarPorCodigo(e.target.value) }} />
                            <button onClick={() => handleAgregarPorCodigo(barcodeInputRef.current?.value)} className="bg-zinc-600 hover:bg-zinc-500 text-zinc-200 font-bold p-2 rounded-r-md"><i className="fas fa-barcode"></i></button>
                        </div>
                    </div>
                    
                    <hr className="border-zinc-700"/>

                    {/* --- BÚSQUEDA MANUAL DE PRODUCTOS CON STOCK --- */}
                    <div>
                        <h4 className="text-md font-medium text-white mb-2">O Búsqueda Manual:</h4>
                        <div className="mb-3">
                             <label htmlFor="producto-buscar-manual-react" className="block text-sm font-medium text-zinc-300 mb-1">Buscar Producto:</label>
                             <SearchBar ref={manualProductSearchRef} items={productosConStock} placeholder="Escriba para buscar..." onSelect={setSelectedProductManual} displayKey="nombre" filterKeys={['nombre', 'codigoBarras']} inputId="producto-buscar-manual-react"/>
                        </div>
<div className="grid grid-cols-2 gap-3 mb-3">
    <div>
        <label htmlFor="cantidad-venta" className="block text-sm font-medium text-zinc-300 mb-1">Cantidad:</label>
        <input type="number" id="cantidad-venta" ref={cantidadInputRef} value={cantidadVenta} onChange={(e) => setCantidadVenta(e.target.value)} min="1" className="w-full p-2 border border-zinc-600 rounded-md bg-zinc-700 text-zinc-100" />
    </div>
    <div>
        <label htmlFor="descuento-venta" className="block text-sm font-medium text-zinc-300 mb-1">Descuento (%):</label>
        <input type="number" id="descuento-venta" value={descuentoVenta} onChange={(e) => setDescuentoVenta(e.target.value)} min="0" max="100" placeholder="0" className="w-full p-2 border border-zinc-600 rounded-md bg-zinc-700 text-zinc-100" />
    </div>
</div>
                        <button onClick={handleAgregarManual} disabled={!selectedProductManual || cantidadVenta <= 0} className={`w-full font-bold py-2 px-4 rounded-md transition ${!selectedProductManual || cantidadVenta <= 0 ? 'bg-zinc-500 text-zinc-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}><i className="fas fa-cart-plus mr-2"></i>Agregar Manualmente</button>
                    </div>

                    {/* --- VENTA RÁPIDA (CONDICIONAL) --- */}
                    {datosNegocio?.habilitarVentaRapida && (
                        <>
                            <hr className="border-zinc-700"/>
                            <div>
                                <h4 className="text-md font-medium text-white mb-2">O Venta Rápida (sin stock):</h4>
                                <div className="space-y-3">
                                    <div>
                                        <label htmlFor="desc-venta-rapida" className="block text-sm font-medium text-zinc-300 mb-1">Descripción:</label>
                                        <input type="text" id="desc-venta-rapida" ref={descripcionManualRef} value={descripcionManual} onChange={(e) => setDescripcionManual(e.target.value)} placeholder="Ej: 150gr Salame, 2x Alfajores" className="w-full p-2 border border-zinc-600 rounded-md bg-zinc-700 text-zinc-100"/>
                                    </div>
                                    <div>
                                        <label htmlFor="monto-venta-rapida" className="block text-sm font-medium text-zinc-300 mb-1">Monto Total ($):</label>
                                        <input type="number" id="monto-venta-rapida" value={montoManual} onChange={(e) => setMontoManual(e.target.value)} placeholder="Ej: 550.50" className="w-full p-2 border border-zinc-600 rounded-md bg-zinc-700 text-zinc-100" onKeyPress={(e) => { if (e.key === 'Enter') handleAgregarVentaRapida(); }} />
                                    </div>
                                </div>
                                <button onClick={handleAgregarVentaRapida} className="mt-3 w-full font-bold py-2 px-4 rounded-md transition bg-purple-600 hover:bg-purple-700 text-white">
                                    <i className="fas fa-plus mr-2"></i>Agregar Venta Rápida
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {/* --- CARRITO DE COMPRAS --- */}
                <Cart cartItems={cartItems} onRemoveItem={(index) => setCartItems(prev => prev.filter((_, i) => i !== index))} total={calculateTotal()} onCheckout={() => { if(cartItems.length > 0) setIsPaymentModalOpen(true); else mostrarMensaje("El carrito está vacío.", "warning"); }} clients={clientes} selectedClientId={selectedClientId} onClientSelect={setSelectedClientId} formatCurrency={formatCurrency}/>
            </div>

            {/* --- MODAL DE PAGO --- */}
            <PaymentModal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} total={calculateTotal()} cliente={selectedClientId ? clientes.find(c => c.id === selectedClientId) : null} onConfirm={handleConfirmPayment} formatCurrency={formatCurrency}mostrarMensaje={mostrarMensaje}/>
        </div>
    );
}
export default VentaTab;