// src/components/VentaTab.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Cart from './Cart.jsx';
import PaymentModal from './PaymentModal.jsx';
import SearchBar from './SearchBar.jsx';
import { useAppContext } from '../context/AppContext.jsx';
import SelectorVendedor from './SelectorVendedor';
import ShiftManager from './ShiftManager';
import { formatCurrency } from '../utils/helpers.js';
import { ShoppingCart } from 'lucide-react';

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
    handleSaveBudget,
    sucursalActual,
    selectedClientId, // <--- Usamos el del contexto
    setSelectedClientId, // <--- Usamos el del contexto
  } = useAppContext();

  // --- ESTADOS LOCALES DEL COMPONENTE ---
  const [selectedProductManual, setSelectedProductManual] = useState(null);
  const [cantidadVenta, setCantidadVenta] = useState(1);
  // const [selectedClientId, setSelectedClientId] = useState(null); // <--- ELIMINADO (ahora es global)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [descuentoVenta, setDescuentoVenta] = useState(0);

  // Estado local para el vendedor DE LA VENTA (puede ser distinto al del turno)
  // const [saleSellerId, setSaleSellerId] = useState(vendedorActivoId); // ELIMINADO

  // Sincronizar si cambia el vendedor activo (opcional, por comodidad)
  /*
  useEffect(() => {
    if (vendedorActivoId) {
      setSaleSellerId(vendedorActivoId);
    }
  }, [vendedorActivoId]);
  */

  // --- Estados para la Venta Rápida ---
  const [descripcionManual, setDescripcionManual] = useState('');
  const [montoManual, setMontoManual] = useState('');

  // --- REFERENCIAS A ELEMENTOS DEL DOM ---
  const barcodeInputRef = useRef(null);
  const cantidadInputRef = useRef(null);
  const descripcionManualRef = useRef(null);
  const manualProductSearchRef = useRef(null);

  // --- HELPER PARA FOCO SEGURO (Evita conflicto con SweetAlert) ---
  const safeFocus = useCallback(() => {
    // Si hay un modal de SweetAlert abierto, esperamos
    if (document.querySelector('.swal2-container')) {
      setTimeout(safeFocus, 100);
      return;
    }
    barcodeInputRef.current?.focus();
  }, []);

  useEffect(() => {
    safeFocus();
  }, [safeFocus]);

  // --- LÓGICA PARA AGREGAR ITEMS AL CARRITO ---
  const handleAgregarPorCodigo = async (codigo) => {
    if (!codigo || !codigo.trim()) return;
    const barcode = codigo.trim();

    // --- LÓGICA INTELIGENTE PARA CÓDIGOS DE BALANZA ---
    // Asumimos un formato estándar: 13 dígitos que empieza con '20'
    if (barcode.length === 13 && barcode.startsWith('20')) {
      const productCode = barcode.substring(2, 7); // Los 5 dígitos del producto
      const priceInCents = parseInt(barcode.substring(7, 12), 10); // Los 5 dígitos del precio

      if (!isNaN(priceInCents)) {
        const product = productos.find((p) => p.codigoBarras === productCode);

        if (product) {
          const price = priceInCents / 100.0;
          // Creamos un item especial con el precio del ticket
          const itemFromScale = {
            ...product,
            precioFinal: price,
            cantidad: 1, // Es 1 ticket
            vendidoPor: 'ticketBalanza', // Un identificador especial
          };
          handleAddToCart(itemFromScale, 1, 0); // Lo añadimos al carrito
          if (barcodeInputRef.current) barcodeInputRef.current.value = '';
          safeFocus();
          return; // Terminamos la ejecución aquí
        }
      }
    }

    // Si no es un código de balanza, busca un producto normal
    const product = productos.find((p) => p.codigoBarras === barcode);
    if (product) {
      handleAddToCart(product, 1, 0);
      if (barcodeInputRef.current) barcodeInputRef.current.value = '';
      safeFocus();
    } else {
      await mostrarMensaje(`Código "${barcode}" no encontrado.`, 'warning');
      barcodeInputRef.current?.select();
    }
  };

  // REEMPLAZA 'handleAgregarManual' con esta versión:
  const handleAgregarManual = () => {
    if (!selectedProductManual || !selectedProductManual.id) {
      mostrarMensaje('Busque y seleccione un producto válido.', 'warning');
      return;
    }
    const cantidadNumerica = parseInt(cantidadVenta, 10);
    if (isNaN(cantidadNumerica) || cantidadNumerica <= 0) {
      mostrarMensaje('Ingrese una cantidad válida.', 'warning');
      return;
    }

    handleAddToCart(selectedProductManual, cantidadNumerica, descuentoVenta); // Llama a la nueva función

    // Reseteamos los campos
    setSelectedProductManual(null);
    setCantidadVenta(1);
    setDescuentoVenta(0); // También reseteamos el descuento
    manualProductSearchRef.current?.clearInput();
    safeFocus();
  };

  const handleAgregarVentaRapida = () => {
    if (handleAddManualItemToCart(descripcionManual, montoManual)) {
      setDescripcionManual('');
      setMontoManual('');
      descripcionManualRef.current?.focus();
    }
  };

  const handleConfirmPayment = async (metodoPago, tipoFactura) => {
    setIsPaymentModalOpen(false);
    const totalVenta = calculateTotal();
    const clienteFinal = selectedClientId
      ? clientes.find((c) => c.id === selectedClientId)
      : null;

    let afipResult = null;

    // Si es Factura A, B o C, llamamos a la Cloud Function
    if (['A', 'B', 'C'].includes(tipoFactura)) {
      try {
        // No esperamos este mensaje inicial para no bloquear la UI, o usamos un toast no bloqueante si existiera.
        // Pero como mostrarMensaje es Swal (modal), si lo esperamos, el usuario tiene que dar OK.
        // Lo mejor es mostrarlo y que se cierre solo o usar un loading.
        // Por ahora, para evitar el error de foco, lo comentamos o lo hacemos async si es informativo.
        // mostrarMensaje('Generando Factura Electrónica...', 'info');

        // O mejor, usamos un loading de Swal que no requiera interacción y se cierre programáticamente.
        // Como no tenemos esa función a mano en el context, simplemente esperaremos el resultado.

        // Importación dinámica para no romper si no se usa
        const { getFunctions, httpsCallable } =
          await import('firebase/functions');
        const functions = getFunctions();
        const createInvoice = httpsCallable(functions, 'createInvoice');

        // 1. Preparar Datos para AFIP
        // Priorizamos el Punto de Venta de la Sucursal, si existe. Si no, usamos el global.
        const ptoVta =
          sucursalActual?.puntoVenta ||
          sucursalActual?.configuracion?.puntoVenta ||
          datosNegocio?.puntoVenta ||
          1;
        const cbteTipo = tipoFactura === 'A' ? 1 : tipoFactura === 'B' ? 6 : 11;
        const concepto = 1; // Productos

        let docTipo = 99; // Consumidor Final
        let docNro = 0;

        // 2. Calcular Importes (Asumiendo IVA 21% incluido para RI)
        let importeNeto = totalVenta;
        let importeIva = 0;
        let importeExento = 0;

        if (tipoFactura === 'A' || tipoFactura === 'B') {
          importeNeto = totalVenta / 1.21;
          importeIva = totalVenta - importeNeto;
        }

        const result = await createInvoice({
          sucursalId: sucursalActual?.id,
          ptoVta,
          cbteTipo,
          concepto,
          docTipo,
          docNro,
          importeTotal: totalVenta,
          importeNeto,
          importeIva,
          importeExento,
        });

        // Agregamos datos locales importantes al resultado para guardarlos
        afipResult = {
          ...result.data,
          ptoVta,
          cbteTipo,
          docTipo,
          docNro,
        };

        if (afipResult.mock) {
          await mostrarMensaje('Factura generada en MODO PRUEBA.', 'warning');
        } else {
          await mostrarMensaje(
            'Factura Electrónica generada con éxito.',
            'success',
          );
        }
      } catch (error) {
        console.error('Error al facturar:', error);
        await mostrarMensaje(`Error al facturar: ${error.message}`, 'error');
        // Preguntar si desea continuar como Ticket X o cancelar
        // Por simplicidad, abortamos.
        return;
      }
    }

    await handleSaleConfirmed(
      cartItems,
      totalVenta,
      clienteFinal,
      metodoPago,
      tipoFactura,
      vendedorActivoId, // <--- USAMOS EL GLOBAL
      afipResult, // <--- Pasamos los datos de AFIP
    );
    setSelectedClientId(null);
    safeFocus();
  };

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => {
      // Cada 'item' en el carrito ya tiene su 'precioFinal' calculado
      // (sea por peso o por unidad con descuento).
      // Simplemente lo sumamos.
      return total + item.precioFinal;
    }, 0);
  };
  // const productosConStock = productos.filter((p) => p.stock > 0); // Eliminado para permitir venta sin stock

  return (
    <div id="venta">
      <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-white sm:text-2xl">
        <ShoppingCart className="h-8 w-8 text-blue-500" />
        Nueva Venta
      </h2>
      <div className="mb-4 max-w-md rounded-lg border border-zinc-700 bg-zinc-800 p-4">
        <label className="text-md mb-2 block font-medium text-zinc-200">
          Gestión de Turno y Venta
        </label>
        {/* --- CONTENEDOR PARA SELECTOR Y TURNO --- */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-1">
          {/* 1. CAJERO (Responsable del Turno) */}
          <div className="rounded-md border border-zinc-600 bg-zinc-900 p-3">
            <label className="mb-1 block text-xs font-bold text-zinc-400">
              CAJERO (Responsable Turno):
            </label>
            <div className="mb-2">
              <SelectorVendedor
                vendedores={vendedores}
                vendedorActivoId={vendedorActivoId}
                onSelectVendedor={setVendedorActivoId}
              />
            </div>
            {/* Manager del TURNO (usa vendedorActivoId global) */}
            <ShiftManager />
          </div>

          {/* 2. VENDEDOR (Para esta venta) */}
          <div className="rounded-md border border-zinc-600 bg-zinc-900 p-3">
            <label className="mb-1 block text-xs font-bold text-zinc-400">
              VENDEDOR (Para esta venta):
            </label>
            <SelectorVendedor
              vendedores={vendedores}
              vendedorActivoId={vendedorActivoId} // <--- USAMOS EL GLOBAL
              onSelectVendedor={setVendedorActivoId} // <--- USAMOS EL GLOBAL
            />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-3">
        <div className="space-y-4 rounded-lg bg-zinc-800 p-4 shadow-md sm:p-5 lg:col-span-2">
          <h3 className="border-b border-zinc-700 pb-2 text-lg font-medium text-white sm:text-xl">
            Agregar Productos
          </h3>

          {/* --- AGREGAR POR CÓDIGO DE BARRAS --- */}
          <div>
            <label
              htmlFor="scan-barcode-react"
              className="mb-1 block text-sm font-medium text-zinc-300"
            >
              Escanear Código de Barras:
            </label>
            <div className="flex">
              <input
                type="text"
                id="scan-barcode-react"
                ref={barcodeInputRef}
                placeholder="Ingrese o escanee código..."
                className="flex-grow rounded-l-md border border-zinc-600 bg-zinc-700 p-2 text-zinc-100"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') handleAgregarPorCodigo(e.target.value);
                }}
              />
              <button
                onClick={() =>
                  handleAgregarPorCodigo(barcodeInputRef.current?.value)
                }
                className="rounded-r-md bg-zinc-600 p-2 font-bold text-zinc-200 hover:bg-zinc-500"
              >
                <i className="fas fa-barcode"></i>
              </button>
            </div>
          </div>

          <hr className="border-zinc-700" />

          {/* --- BÚSQUEDA MANUAL DE PRODUCTOS CON STOCK --- */}
          <div>
            <h4 className="text-md mb-2 font-medium text-white">
              O Búsqueda Manual:
            </h4>
            <div className="mb-3">
              <label
                htmlFor="producto-buscar-manual-react"
                className="mb-1 block text-sm font-medium text-zinc-300"
              >
                Buscar Producto:
              </label>
              <SearchBar
                ref={manualProductSearchRef}
                items={productos} // --- MODIFICADO: Mostrar todos los productos, incluso sin stock
                placeholder="Escriba para buscar..."
                onSelect={setSelectedProductManual}
                displayKey="nombre"
                filterKeys={['nombre', 'codigoBarras']}
                inputId="producto-buscar-manual-react"
              />
            </div>
            <div className="mb-3 grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="cantidad-venta"
                  className="mb-1 block text-sm font-medium text-zinc-300"
                >
                  Cantidad:
                </label>
                <input
                  type="number"
                  id="cantidad-venta"
                  ref={cantidadInputRef}
                  value={cantidadVenta}
                  onChange={(e) => setCantidadVenta(e.target.value)}
                  min="1"
                  className="w-full rounded-md border border-zinc-600 bg-zinc-700 p-2 text-zinc-100"
                />
              </div>
              <div>
                <label
                  htmlFor="descuento-venta"
                  className="mb-1 block text-sm font-medium text-zinc-300"
                >
                  Descuento (%):
                </label>
                <input
                  type="number"
                  id="descuento-venta"
                  value={descuentoVenta}
                  onChange={(e) => setDescuentoVenta(e.target.value)}
                  min="0"
                  max="100"
                  placeholder="0"
                  className="w-full rounded-md border border-zinc-600 bg-zinc-700 p-2 text-zinc-100"
                />
              </div>
            </div>
            <button
              onClick={handleAgregarManual}
              disabled={!selectedProductManual || cantidadVenta <= 0}
              className={`w-full rounded-md px-4 py-2 font-bold transition ${!selectedProductManual || cantidadVenta <= 0 ? 'cursor-not-allowed bg-zinc-500 text-zinc-400' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
            >
              <i className="fas fa-cart-plus mr-2"></i>Agregar Manualmente
            </button>
          </div>

          {/* --- VENTA RÁPIDA (CONDICIONAL) --- */}
          {datosNegocio?.habilitarVentaRapida && (
            <>
              <hr className="border-zinc-700" />
              <div>
                <h4 className="text-md mb-2 font-medium text-white">
                  O Venta Rápida (sin stock):
                </h4>
                <div className="space-y-3">
                  <div>
                    <label
                      htmlFor="desc-venta-rapida"
                      className="mb-1 block text-sm font-medium text-zinc-300"
                    >
                      Descripción:
                    </label>
                    <input
                      type="text"
                      id="desc-venta-rapida"
                      ref={descripcionManualRef}
                      value={descripcionManual}
                      onChange={(e) => setDescripcionManual(e.target.value)}
                      placeholder="Ej: 150gr Salame, 2x Alfajores"
                      className="w-full rounded-md border border-zinc-600 bg-zinc-700 p-2 text-zinc-100"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="monto-venta-rapida"
                      className="mb-1 block text-sm font-medium text-zinc-300"
                    >
                      Monto Total ($):
                    </label>
                    <input
                      type="number"
                      id="monto-venta-rapida"
                      value={montoManual}
                      onChange={(e) => setMontoManual(e.target.value)}
                      placeholder="Ej: 550.50"
                      className="w-full rounded-md border border-zinc-600 bg-zinc-700 p-2 text-zinc-100"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') handleAgregarVentaRapida();
                      }}
                    />
                  </div>
                </div>
                <button
                  onClick={handleAgregarVentaRapida}
                  className="mt-3 w-full rounded-md bg-purple-600 px-4 py-2 font-bold text-white transition hover:bg-purple-700"
                >
                  <i className="fas fa-plus mr-2"></i>Agregar Venta Rápida
                </button>
              </div>
            </>
          )}
        </div>

        {/* --- CARRITO DE COMPRAS --- */}
        <Cart
          cartItems={cartItems}
          onRemoveItem={(index) =>
            setCartItems((prev) => prev.filter((_, i) => i !== index))
          }
          total={calculateTotal()}
          onCheckout={() => {
            if (cartItems.length > 0) setIsPaymentModalOpen(true);
            else mostrarMensaje('El carrito está vacío.', 'warning');
          }}
          onSaveBudget={() => {
            if (cartItems.length === 0) {
              mostrarMensaje('El carrito está vacío.', 'warning');
              return;
            }
            const cliente = selectedClientId
              ? clientes.find((c) => c.id === selectedClientId)
              : null;
            handleSaveBudget(cartItems, calculateTotal(), cliente);
          }}
          clients={clientes}
          selectedClientId={selectedClientId}
          onClientSelect={setSelectedClientId}
          formatCurrency={formatCurrency}
        />
      </div>

      {/* --- MODAL DE PAGO --- */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        total={calculateTotal()}
        cliente={
          selectedClientId
            ? clientes.find((c) => c.id === selectedClientId)
            : null
        }
        onConfirm={handleConfirmPayment}
        formatCurrency={formatCurrency}
        mostrarMensaje={mostrarMensaje}
      />
    </div>
  );
}
export default VentaTab;
