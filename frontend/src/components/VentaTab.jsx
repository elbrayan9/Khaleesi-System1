// src/components/VentaTab.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Cart from './Cart.jsx';
import PaymentModal from './PaymentModal.jsx';
import SearchBar from './SearchBar.jsx';
import { useAppContext } from '../context/AppContext.jsx';
import { formatCurrency } from '../utils/helpers.js';

function VentaTab() {
    // --- OBTENER DATOS Y FUNCIONES DESDE EL CONTEXTO ---
    const {
        productos,
        clientes,
        cartItems,
        setCartItems,
        datosNegocio, // Para saber si se muestra la Venta Rápida
        handleSaleConfirmed,
        handleAddManualItemToCart,
        mostrarMensaje,
    } = useAppContext();

    // --- ESTADOS LOCALES DEL COMPONENTE ---
    const [selectedProductManual, setSelectedProductManual] = useState(null);
    const [cantidadVenta, setCantidadVenta] = useState(1);
    const [selectedClientId, setSelectedClientId] = useState(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    
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
    const agregarAlCarrito = useCallback((prodId, cant = 1) => {
        if (!prodId || typeof prodId !== 'string') {
            mostrarMensaje("ID de producto inválido.", 'error'); return false;
        }
        const product = productos.find(p => p.id === prodId);
        if (!product) {
            mostrarMensaje("Producto no encontrado.", 'error'); return false;
        }
        if (product.stock <= 0) {
            mostrarMensaje(`"${product.nombre}" no tiene stock disponible.`, 'warning'); return false;
        }
        const cantidadActualEnCarrito = cartItems.reduce((acc, item) => item.id === prodId ? acc + item.cantidad : acc, 0);
        if (cant + cantidadActualEnCarrito > product.stock) {
            mostrarMensaje(`Stock insuficiente para "${product.nombre}". Disponible: ${product.stock}, En carrito: ${cantidadActualEnCarrito}.`, 'warning'); return false;
        }
        setCartItems(prevCart => {
            const existingItemIndex = prevCart.findIndex(item => item.id === prodId);
            if (existingItemIndex > -1) {
                const updatedCart = [...prevCart];
                updatedCart[existingItemIndex].cantidad += cant;
                return updatedCart;
            } else {
                return [...prevCart, { id: product.id, nombre: product.nombre, precio: product.precio, cantidad: cant, isTracked: true }];
            }
        });
        return true;
    }, [productos, cartItems, setCartItems, mostrarMensaje]);

    const handleAgregarPorCodigo = (codigo) => {
        if (!codigo || !codigo.trim()) return;
        const product = productos.find(p => p.codigoBarras === codigo.trim());
        if (product && product.id) {
            if (agregarAlCarrito(product.id, 1)) {
                barcodeInputRef.current.value = '';
            }
        } else {
            mostrarMensaje(`Código "${codigo}" no encontrado.`, 'warning');
            barcodeInputRef.current?.select();
        }
    };
    
    const handleAgregarManual = () => {
        if (!selectedProductManual || !selectedProductManual.id) { mostrarMensaje("Busque y seleccione un producto válido.", 'warning'); return; }
        const cantidadNumerica = parseInt(cantidadVenta, 10);
        if (isNaN(cantidadNumerica) || cantidadNumerica <= 0) { mostrarMensaje("Ingrese una cantidad válida.", 'warning'); return; }
        
        if (agregarAlCarrito(selectedProductManual.id, cantidadNumerica)) {
            setSelectedProductManual(null);
            setCantidadVenta(1);
            manualProductSearchRef.current?.clearInput();
            barcodeInputRef.current?.focus();
        }
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
    
    const calculateTotal = () => cartItems.reduce((total, item) => total + (item.precio * item.cantidad), 0);
    const productosConStock = productos.filter(p => p.stock > 0);

    return (
        <div id="venta">
            <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-white">Nueva Venta</h2>
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
                        <div className="mb-3">
                            <label htmlFor="cantidad-venta" className="block text-sm font-medium text-zinc-300 mb-1">Cantidad:</label>
                            <input type="number" id="cantidad-venta" ref={cantidadInputRef} value={cantidadVenta} onChange={(e) => setCantidadVenta(e.target.value)} min="1" className="w-full p-2 border border-zinc-600 rounded-md bg-zinc-700 text-zinc-100" onKeyPress={(e) => { if (e.key === 'Enter') handleAgregarManual(); }}/>
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
            <PaymentModal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} total={calculateTotal()} cliente={selectedClientId ? clientes.find(c => c.id === selectedClientId) : null} onConfirm={handleConfirmPayment} formatCurrency={formatCurrency}/>
        </div>
    );
}
export default VentaTab;