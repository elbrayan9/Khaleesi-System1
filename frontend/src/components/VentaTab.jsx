import React, { useState, useEffect, useRef, useCallback } from 'react';
import Cart from './Cart.jsx';
import PaymentModal from './PaymentModal.jsx';
import SearchBar from './SearchBar.jsx';
import { useAppContext } from '../context/AppContext.jsx'; // Importar hook
import { formatCurrency, mostrarMensaje as mostrarMensajeHelper } from '../utils/helpers.js'; // Importar helpers directamente si son puros

function VentaTab() { // Ya no recibe props directamente, las toma del contexto
    const {
        productos,
        clientes,
        cartItems,
        setCartItems,
        handleSaleConfirmed, // Renombrado desde onSaleConfirmed
        mostrarMensaje, // Usar la función de mensaje del contexto
    } = useAppContext();

    // El resto del estado local de VentaTab se mantiene
    const [selectedProductManual, setSelectedProductManual] = useState(null);
    const [cantidadVenta, setCantidadVenta] = useState(1);
    const [selectedClientId, setSelectedClientId] = useState(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [searchTermManual, setSearchTermManual] = useState('');

    const barcodeInputRef = useRef(null);
    const cantidadInputRef = useRef(null);
    const manualProductSearchRef = useRef(null);

    useEffect(() => {
        barcodeInputRef.current?.focus();
    }, []);

    const handleProductSelectedManual = (product) => {
        setSelectedProductManual(product);
        if (product && cantidadInputRef.current) {
            setTimeout(() => cantidadInputRef.current.focus(), 0);
        }
    };

    const handleClientSelected = (clientId) => {
        setSelectedClientId(clientId);
    };

    const agregarAlCarrito = useCallback((prodId, cant = 1) => {
        if (!prodId || typeof prodId !== 'string') {
            mostrarMensaje("ID de producto inválido.", 'error');
            return false;
        }
        if (isNaN(cant) || cant <= 0) {
            mostrarMensaje("Cantidad inválida.", 'warning');
            return false;
        }
        const product = productos.find(p => p.id === prodId);
        if (!product) {
            mostrarMensaje("Producto no encontrado.", 'error');
            return false;
        }
        if (product.stock <= 0) {
            mostrarMensaje(`"${product.nombre}" no tiene stock disponible.`, 'warning');
            return false;
        }
        const cantidadActualEnCarrito = cartItems.reduce((acc, item) => item.id === prodId ? acc + item.cantidad : acc, 0);
        if (cant + cantidadActualEnCarrito > product.stock) {
            mostrarMensaje(`Stock insuficiente para "${product.nombre}". Disponible: ${product.stock}, En carrito: ${cantidadActualEnCarrito}. Solicitado: ${cant}.`, 'warning');
            return false;
        }
        setCartItems(prevCart => {
            const existingItemIndex = prevCart.findIndex(item => item.id === prodId);
            if (existingItemIndex > -1) {
                const updatedCart = [...prevCart];
                updatedCart[existingItemIndex] = { ...updatedCart[existingItemIndex], cantidad: updatedCart[existingItemIndex].cantidad + cant };
                return updatedCart;
            } else {
                return [...prevCart, { id: product.id, nombre: product.nombre, precio: product.precio, cantidad: cant }];
            }
        });
        // mostrarMensaje(`"${product.nombre}" (x${cant}) agregado.`, 'success'); // El componente App/Context mostrará el mensaje
        return true;
    }, [productos, cartItems, setCartItems, mostrarMensaje]);

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
        const success = agregarAlCarrito(selectedProductManual.id, cantidadNumerica);
        if (success) {
            setSelectedProductManual(null);
            setCantidadVenta(1);
            setSearchTermManual('');
            if (manualProductSearchRef.current && typeof manualProductSearchRef.current.clearInput === 'function') {
                 manualProductSearchRef.current.clearInput();
            }
            barcodeInputRef.current?.focus();
        }
    };

    const handleAgregarPorCodigo = (codigo) => {
        if (!codigo || !codigo.trim()) return;
        const product = productos.find(p => p.codigoBarras === codigo.trim());
        if (product && product.id) {
            const success = agregarAlCarrito(product.id, 1);
            if (success && barcodeInputRef.current) barcodeInputRef.current.value = '';
        } else {
            mostrarMensaje(`Código "${codigo}" no encontrado o producto inválido.`, 'warning');
            barcodeInputRef.current?.select();
        }
    };

    const handleBarcodeKeyPress = (e) => { if (e.key === 'Enter') { e.preventDefault(); handleAgregarPorCodigo(e.target.value); }};
    const handleRemoveFromCart = (index) => { const itemToRemove = cartItems[index]; setCartItems(prevCart => prevCart.filter((_, i) => i !== index)); mostrarMensaje(`"${itemToRemove.nombre}" quitado.`, 'info'); };
    const calculateTotal = () => cartItems.reduce((total, item) => total + (item.precio * item.cantidad), 0);

    const handleCheckout = () => {
        if (cartItems.length === 0) {
            mostrarMensaje("El carrito está vacío.", 'warning');
            return;
        }
        setIsPaymentModalOpen(true);
    };

    const handleConfirmPayment = (metodoPago, tipoFactura) => {
        setIsPaymentModalOpen(false);
        const totalVenta = calculateTotal();
        let clienteFinalParaVenta = selectedClientId ? clientes.find(c => c.id === selectedClientId) : { id: "consumidor_final", nombre: "Consumidor Final" };
        if (!clienteFinalParaVenta && selectedClientId !== "consumidor_final" && selectedClientId !== null) { // Si se seleccionó un ID pero no se encontró el cliente
            mostrarMensaje("Cliente seleccionado no es válido, se usará Consumidor Final.", "warning");
            clienteFinalParaVenta = { id: "consumidor_final", nombre: "Consumidor Final" };
        } else if (!clienteFinalParaVenta) { // Fallback si selectedClientId es null o "consumidor_final"
            clienteFinalParaVenta = { id: "consumidor_final", nombre: "Consumidor Final" };
        }

        for (const item of cartItems) {
            const productInStock = productos.find(p => p.id === item.id);
            if (!productInStock) { mostrarMensaje(`Error: Producto "${item.nombre}" no disponible. Venta cancelada.`, 'error'); return; }
            if (item.cantidad > productInStock.stock) { mostrarMensaje(`Stock insuficiente para "${item.nombre}". Disponible: ${productInStock.stock}. Venta cancelada.`, 'error'); return; }
        }
        handleSaleConfirmed(cartItems, totalVenta, clienteFinalParaVenta, metodoPago, tipoFactura);
        setSelectedClientId(null);
        barcodeInputRef.current?.focus();
    };

    const productosConStock = productos.filter(p => p.stock > 0);

    return (
        <div id="venta">
            <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-white">Nueva Venta</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                <div className="lg:col-span-2 bg-zinc-800 p-4 sm:p-5 rounded-lg shadow-md space-y-4">
                    <h3 className="text-lg sm:text-xl font-medium text-white border-b border-zinc-700 pb-2">Agregar Productos</h3>
                    <div>
                        <label htmlFor="scan-barcode-react" className="block text-sm font-medium text-zinc-300 mb-1">Escanear Código de Barras:</label>
                        <div className="flex">
                            <input type="text" id="scan-barcode-react" ref={barcodeInputRef} placeholder="Ingrese o escanee código..." className="flex-grow p-2 border border-zinc-600 rounded-l-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-zinc-700 text-zinc-100 placeholder-zinc-400" onKeyPress={handleBarcodeKeyPress} />
                            <button onClick={() => handleAgregarPorCodigo(barcodeInputRef.current?.value)} className="bg-zinc-600 hover:bg-zinc-500 text-zinc-200 font-bold p-2 rounded-r-md transition" title="Agregar por código"><i className="fas fa-barcode"></i> <span className="sr-only">Agregar</span></button>
                        </div>
                        <p className="text-xs text-zinc-400 mt-1">Presione Enter o el botón.</p>
                    </div>
                    <hr className="border-zinc-700"/>
                    <div>
                        <h4 className="text-md font-medium text-white mb-2">O Búsqueda Manual:</h4>
                        <div className="mb-3">
                             <label htmlFor="producto-buscar-manual-react" className="block text-sm font-medium text-zinc-300 mb-1">Buscar Producto (Nombre):</label>
                             <SearchBar ref={manualProductSearchRef} items={productosConStock} placeholder="Escriba para buscar..." onSelect={handleProductSelectedManual} displayKey="nombre" filterKeys={['nombre', 'codigoBarras']} inputId="producto-buscar-manual-react" resultId="producto-resultados-manual-react" initialValue={searchTermManual} formatCurrency={formatCurrency} />
                        </div>
                        <div className="mb-3">
                            <label htmlFor="cantidad-venta" className="block text-sm font-medium text-zinc-300 mb-1">Cantidad:</label>
                            <input type="number" id="cantidad-venta" ref={cantidadInputRef} value={cantidadVenta} onChange={(e) => setCantidadVenta(e.target.value)} min="1" className="w-full p-2 border border-zinc-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-zinc-700 text-zinc-100" onKeyPress={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAgregarManual(); }}}/>
                        </div>
                        <button onClick={handleAgregarManual} disabled={!selectedProductManual || cantidadVenta <= 0} className={`w-full font-bold py-2 px-4 rounded-md transition ${(!selectedProductManual || cantidadVenta <= 0) ? 'bg-zinc-500 text-zinc-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}><i className="fas fa-cart-plus mr-2"></i>Agregar Manualmente</button>
                    </div>
                </div>
                <Cart cartItems={cartItems} onRemoveItem={handleRemoveFromCart} total={calculateTotal()} onCheckout={handleCheckout} clients={clientes} selectedClientId={selectedClientId} onClientSelect={handleClientSelected} formatCurrency={formatCurrency}/>
            </div>
            <PaymentModal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} total={calculateTotal()} cliente={selectedClientId ? clientes.find(c => c.id === selectedClientId) : { id: "consumidor_final", nombre: "Consumidor Final" }} onConfirm={handleConfirmPayment} formatCurrency={formatCurrency}/>
        </div>
    );
}
export default VentaTab;