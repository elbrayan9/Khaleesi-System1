// src/components/VentaTab.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Cart from './Cart.jsx';
import PaymentModal from './PaymentModal.jsx';
import SearchBar from './SearchBar.jsx'; // Asegúrate que SearchBar devuelva el objeto completo del producto, incluido el ID de Firestore.

function VentaTab({
    productos,          // Productos con IDs de Firestore
    clientes,           // Clientes con IDs de Firestore
    cartItems,
    setCartItems,       // Para actualizar el carrito local
    onSaleConfirmed,    // Prop de App.jsx para procesar la venta con Firestore
    formatCurrency,
    mostrarMensaje      // Prop de App.jsx para mostrar mensajes (ya adaptada a dark mode)
}) {
    const [selectedProductManual, setSelectedProductManual] = useState(null);
    const [cantidadVenta, setCantidadVenta] = useState(1);
    const [selectedClientId, setSelectedClientId] = useState(null); // Este será el ID de Firestore del cliente
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [searchTermManual, setSearchTermManual] = useState(''); // Para limpiar el SearchBar manual

    const barcodeInputRef = useRef(null);
    const cantidadInputRef = useRef(null);
    const manualProductSearchRef = useRef(null); // Ref para el SearchBar si necesitas interactuar con él

    useEffect(() => {
        barcodeInputRef.current?.focus();
    }, []);

    const handleProductSelectedManual = (product) => {
        setSelectedProductManual(product); // product aquí DEBERÍA tener el ID de Firestore
        if (product && cantidadInputRef.current) {
            setTimeout(() => cantidadInputRef.current.focus(), 0);
        }
    };

    const handleClientSelected = (clientId) => { // clientId es el ID de Firestore
        setSelectedClientId(clientId);
    };

    const agregarAlCarrito = useCallback((prodId, cant = 1) => {
        if (!prodId || typeof prodId !== 'string') { // ID de Firestore suele ser string
            mostrarMensaje("ID de producto inválido.", 'error');
            console.error("Intento de agregar al carrito con ID de producto inválido:", prodId);
            return false;
        }
        if (isNaN(cant) || cant <= 0) {
            mostrarMensaje("Cantidad inválida.", 'warning');
            return false;
        }

        const product = productos.find(p => p.id === prodId); // p.id es el ID de Firestore

        if (!product) {
            mostrarMensaje("Producto no encontrado en el listado.", 'error');
            return false;
        }
        if (product.stock < 0) { // A veces el stock puede ser negativo si hay errores, mejor ser explícito
             mostrarMensaje(`"${product.nombre}" no tiene stock (Stock: ${product.stock}).`, 'warning');
            return false;
        }
         if (product.stock === 0) {
            mostrarMensaje(`"${product.nombre}" no tiene stock disponible.`, 'warning');
            return false;
        }


        const cantidadActualEnCarrito = cartItems.reduce((acc, item) => item.id === prodId ? acc + item.cantidad : acc, 0);

        if (cant + cantidadActualEnCarrito > product.stock) {
            mostrarMensaje(
                `Stock insuficiente para "${product.nombre}". Disponible: ${product.stock}, En carrito: ${cantidadActualEnCarrito}. Solicitado adicional: ${cant}.`,
                'warning'
            );
            return false;
        }

        setCartItems(prevCart => {
            const existingItemIndex = prevCart.findIndex(item => item.id === prodId);
            if (existingItemIndex > -1) {
                const updatedCart = [...prevCart];
                updatedCart[existingItemIndex] = {
                    ...updatedCart[existingItemIndex],
                    cantidad: updatedCart[existingItemIndex].cantidad + cant
                };
                return updatedCart;
            } else {
                return [...prevCart, {
                    id: product.id, // ID de Firestore del producto
                    nombre: product.nombre,
                    precio: product.precio,
                    cantidad: cant
                }];
            }
        });

        mostrarMensaje(`"${product.nombre}" (x${cant}) agregado al carrito.`, 'success');
        return true;
    }, [productos, cartItems, setCartItems, mostrarMensaje]);

    const handleAgregarManual = () => {
        if (!selectedProductManual || !selectedProductManual.id) { // Verificar que hay un producto y tiene ID
            mostrarMensaje("Busque y seleccione un producto válido de la lista.", 'warning');
            return;
        }
        const cantidadNumerica = parseInt(cantidadVenta, 10);
        if (isNaN(cantidadNumerica) || cantidadNumerica <= 0) {
            mostrarMensaje("Ingrese una cantidad válida.", 'warning');
            return;
        }

        const success = agregarAlCarrito(selectedProductManual.id, cantidadNumerica);
        if (success) {
            setSelectedProductManual(null); // Limpiar producto seleccionado
            setCantidadVenta(1);          // Resetear cantidad
            setSearchTermManual('');      // Limpiar término de búsqueda del SearchBar
            if (manualProductSearchRef.current && typeof manualProductSearchRef.current.clearInput === 'function') {
                 manualProductSearchRef.current.clearInput(); // Si SearchBar tiene un método para limpiar
            }
            if (barcodeInputRef.current) { // Devolver foco al input de código de barras
                barcodeInputRef.current.focus();
            }
        }
    };

    const handleAgregarPorCodigo = (codigo) => {
        if (!codigo || !codigo.trim()) return;
        const product = productos.find(p => p.codigoBarras === codigo.trim());
        if (product && product.id) { // Asegurarse que el producto encontrado tiene un ID de Firestore
            const success = agregarAlCarrito(product.id, 1);
            if (success && barcodeInputRef.current) {
                barcodeInputRef.current.value = '';
                // No es necesario mostrar mensaje aquí, agregarAlCarrito lo hace
            }
        } else {
            mostrarMensaje(`Código de barras "${codigo}" no encontrado o producto inválido.`, 'warning');
            if (barcodeInputRef.current) {
                barcodeInputRef.current.select();
            }
        }
    };

    const handleBarcodeKeyPress = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAgregarPorCodigo(e.target.value);
        }
    };

    const handleRemoveFromCart = (index) => {
        const itemToRemove = cartItems[index];
        setCartItems(prevCart => prevCart.filter((_, i) => i !== index));
        mostrarMensaje(`"${itemToRemove.nombre}" quitado del carrito.`, 'info');
    };

    const calculateTotal = () => {
        return cartItems.reduce((total, item) => total + (item.precio * item.cantidad), 0);
    };

    const handleCheckout = () => {
        if (cartItems.length === 0) {
            mostrarMensaje("El carrito está vacío. Agregue productos antes de proceder.", 'warning');
            return;
        }
        setIsPaymentModalOpen(true);
    };

    const handleConfirmPayment = (metodoPago, tipoFactura) => {
        setIsPaymentModalOpen(false);
        const totalVenta = calculateTotal();

        // Determinar cliente: usa ID de Firestore o un identificador para "Consumidor Final"
        let clienteFinalParaVenta;
        if (selectedClientId && selectedClientId !== 0 && selectedClientId !== "consumidor_final") {
            const clienteEncontrado = clientes.find(c => c.id === selectedClientId);
            if (clienteEncontrado) {
                clienteFinalParaVenta = clienteEncontrado; // Objeto cliente completo
            } else {
                // Esto no debería pasar si selectedClientId viene de una selección válida
                mostrarMensaje("Cliente seleccionado no es válido. Se usará Consumidor Final.", "warning");
                clienteFinalParaVenta = { id: "consumidor_final", nombre: "Consumidor Final", cuit: "" };
            }
        } else {
            clienteFinalParaVenta = { id: "consumidor_final", nombre: "Consumidor Final", cuit: "" };
        }


        // Volver a verificar stock justo antes de confirmar (App.jsx también lo hará en el servicio)
        for (const item of cartItems) {
            const productInStock = productos.find(p => p.id === item.id); // item.id es el ID de Firestore
            if (!productInStock) {
                 mostrarMensaje(`Error: Producto "${item.nombre}" ya no se encuentra disponible. Venta cancelada.`, 'error');
                return;
            }
            if (item.cantidad > productInStock.stock) {
                mostrarMensaje(`Error de stock al confirmar: "${item.nombre}". Disponible: ${productInStock.stock}. Solicitado: ${item.cantidad}. Venta cancelada.`, 'error');
                return;
            }
        }

        // onSaleConfirmed es la prop de App.jsx (handleSaleConfirmed en App.jsx)
        console.log("VentaTab: Llamando a onSaleConfirmed con:", cartItems, totalVenta, clienteFinalParaVenta, metodoPago, tipoFactura);
        onSaleConfirmed(cartItems, totalVenta, clienteFinalParaVenta, metodoPago, tipoFactura);

        setSelectedClientId(null); // Resetear cliente seleccionado en VentaTab
        if(barcodeInputRef.current) barcodeInputRef.current.focus();
    };

    const productosConStock = productos.filter(p => p.stock > 0);

    return (
        <div id="venta">
            <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-white">Nueva Venta</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                {/* Panel Izquierdo: Agregar Productos */}
                <div className="lg:col-span-2 bg-zinc-800 p-4 sm:p-5 rounded-lg shadow-md space-y-4">
                    <h3 className="text-lg sm:text-xl font-medium text-white border-b border-zinc-700 pb-2">Agregar Productos</h3>
                    {/* Código Barras */}
                    <div>
                        <label htmlFor="scan-barcode-react" className="block text-sm font-medium text-zinc-300 mb-1">Escanear Código de Barras:</label>
                        <div className="flex">
                            <input
                                type="text"
                                id="scan-barcode-react"
                                ref={barcodeInputRef}
                                placeholder="Ingrese o escanee código..."
                                className="flex-grow p-2 border border-zinc-600 rounded-l-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-zinc-700 text-zinc-100 placeholder-zinc-400"
                                onKeyPress={handleBarcodeKeyPress}
                            />
                            <button
                                onClick={() => handleAgregarPorCodigo(barcodeInputRef.current?.value)}
                                className="bg-zinc-600 hover:bg-zinc-500 text-zinc-200 font-bold p-2 rounded-r-md transition duration-150 ease-in-out"
                                title="Agregar por código"
                            >
                                <i className="fas fa-barcode"></i> <span className="sr-only">Agregar</span>
                            </button>
                        </div>
                        <p className="text-xs text-zinc-400 mt-1">Presione Enter o el botón.</p>
                    </div>
                    <hr className="border-zinc-700"/>
                     {/* Búsqueda Manual */}
                     <div>
                        <h4 className="text-md font-medium text-white mb-2">O Búsqueda Manual:</h4>
                        <div className="mb-3">
                             <label htmlFor="producto-buscar-manual-react" className="block text-sm font-medium text-zinc-300 mb-1">Buscar Producto (Nombre):</label>
                             <SearchBar
                                ref={manualProductSearchRef} // Asignar ref
                                items={productosConStock} // Solo productos con stock
                                placeholder="Escriba para buscar producto..."
                                onSelect={handleProductSelectedManual} // product.id debe ser de Firestore
                                displayKey="nombre"
                                filterKeys={['nombre', 'codigoBarras']} // Permitir buscar por código también
                                inputId="producto-buscar-manual-react"
                                resultId="producto-resultados-manual-react"
                                initialValue={searchTermManual} // Para poder limpiarlo
                                formatCurrency={formatCurrency}
                                // Puedes añadir una prop a SearchBar para que devuelva el objeto completo en onSelect
                             />
                        </div>
                        <div className="mb-3">
                            <label htmlFor="cantidad-venta" className="block text-sm font-medium text-zinc-300 mb-1">Cantidad:</label>
                            <input
                                type="number"
                                id="cantidad-venta"
                                ref={cantidadInputRef}
                                value={cantidadVenta}
                                onChange={(e) => setCantidadVenta(e.target.value)}
                                min="1"
                                className="w-full p-2 border border-zinc-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-zinc-700 text-zinc-100"
                                onKeyPress={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAgregarManual(); }}}
                            />
                        </div>
                        <button
                            onClick={handleAgregarManual}
                            disabled={!selectedProductManual || cantidadVenta <= 0}
                            className={`w-full font-bold py-2 px-4 rounded-md transition duration-150 ease-in-out ${
                                (!selectedProductManual || cantidadVenta <= 0)
                                ? 'bg-zinc-500 text-zinc-400 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                        >
                            <i className="fas fa-cart-plus mr-2"></i>Agregar Manualmente
                        </button>
                    </div>
                </div>

                {/* Panel Derecho: Carrito */}
                <Cart
                    cartItems={cartItems}
                    onRemoveItem={handleRemoveFromCart}
                    total={calculateTotal()}
                    onCheckout={handleCheckout}
                    clients={clientes} // Clientes con IDs de Firestore
                    selectedClientId={selectedClientId} // ID de Firestore
                    onClientSelect={handleClientSelected} // maneja ID de Firestore
                    formatCurrency={formatCurrency}
                />
            </div>

            {/* Modal de Pago */}
            <PaymentModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                total={calculateTotal()}
                // Pasar el objeto cliente completo o la información necesaria
                cliente={selectedClientId ? clientes.find(c => c.id === selectedClientId) : { id: "consumidor_final", nombre: "Consumidor Final" }}
                onConfirm={handleConfirmPayment}
                formatCurrency={formatCurrency}
            />
        </div>
    );
}

export default VentaTab;