// src/components/VentaTab.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Cart from './Cart.jsx';
import PaymentModal from './PaymentModal.jsx';
import BalanzaEnVivoModal from './BalanzaEnVivoModal.jsx';
import EscanerCamaraModal from './EscanerCamaraModal.jsx';
import VentaPorVozModal, { soportaVoz } from './VentaPorVozModal.jsx';
import EscanerNombreModal from './EscanerNombreModal.jsx';
import SearchBar from './SearchBar.jsx';
import Swal from 'sweetalert2';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAppContext } from '../context/AppContext.jsx';
import SelectorVendedor from './SelectorVendedor';
import ShiftManager from './ShiftManager';
import PanelAlertas from './PanelAlertas';
import { formatCurrency } from '../utils/helpers.js';
import { ShoppingCart } from 'lucide-react';
import useAtajosTeclado from '../hooks/useAtajosTeclado.js';
import TeclaAtajo from './ui/TeclaAtajo.jsx';

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
    canAccessAI,
    handleClearCart, // lo usa el atajo F9
  } = useAppContext();

  // --- ESTADOS LOCALES DEL COMPONENTE ---
  const [selectedProductManual, setSelectedProductManual] = useState(null);
  const [cantidadVenta, setCantidadVenta] = useState(1);
  // const [selectedClientId, setSelectedClientId] = useState(null); // <--- ELIMINADO (ahora es global)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [descuentoVenta, setDescuentoVenta] = useState(0);

  const vendedorActual = vendedores.find((v) => v.id === vendedorActivoId) || {};
  const puedeModificarPrecios = vendedorActual.puedeModificarPrecios !== false;

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
  const [showBalanza, setShowBalanza] = useState(false); // modal balanza en vivo
  const [showEscaner, setShowEscaner] = useState(false); // escáner por cámara
  const [showVoz, setShowVoz] = useState(false); // venta por voz
  const [showFoto, setShowFoto] = useState(false); // producto por foto

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

  // --- ATAJOS DE TECLADO ---
  //
  // Con el mostrador lleno, ir al mouse por cada acción cuesta segundos que se
  // acumulan. Las teclas de función andan aunque el cursor esté dentro de un
  // campo, así que se termina de tipear el código y se cobra sin mover la mano.
  //
  // Quedan apagados mientras hay un modal abierto: si no, F2 abriría el cobro
  // por encima del escáner, o Escape cerraría las dos cosas de una.
  const hayModalAbierto =
    isPaymentModalOpen || showBalanza || showEscaner || showVoz || showFoto;

  const enfocarPorId = (id) => {
    const campo = document.getElementById(id);
    campo?.focus();
    campo?.select?.();
  };

  useAtajosTeclado(
    {
      // Cobrar. Sin nada en el carrito no hace nada, igual que el botón.
      F2: () => {
        if (cartItems.length > 0) setIsPaymentModalOpen(true);
      },
      // Buscar producto por nombre.
      F3: () => enfocarPorId('producto-buscar-manual-react'),
      // Buscar cliente: el campo vive en el carrito, se busca por su id.
      F4: () => enfocarPorId('cliente-buscar-react-cart'),
      // Volver al campo del código de barras, que es donde se pasa la mayor
      // parte del tiempo.
      F6: () => barcodeInputRef.current?.focus(),
      // Venta rápida por monto.
      F7: () => descripcionManualRef.current?.focus(),
      // Escanear con la cámara.
      F8: () => setShowEscaner(true),
      // Vaciar el carrito. handleClearCart ya pide confirmación.
      F9: () => {
        if (cartItems.length > 0) handleClearCart();
      },
    },
    !hayModalAbierto,
  );

  // --- LÓGICA PARA AGREGAR ITEMS AL CARRITO ---
  const handleAgregarPorCodigo = async (codigo) => {
    if (!codigo || !codigo.trim()) return;
    const barcode = codigo.trim();

    // QR de producto del sistema (URL .../product/{id}): resolvemos por id.
    const mProd = barcode.match(/\/product\/([^/?#\s]+)/);
    if (mProd) {
      const prod = productos.find((p) => p.id === mProd[1]);
      if (prod) {
        handleAddToCart(prod, 1, 0);
        if (barcodeInputRef.current) barcodeInputRef.current.value = '';
        safeFocus();
      } else {
        await mostrarMensaje('El producto de ese QR no existe.', 'warning');
      }
      return;
    }

    // --- LÓGICA PARA CÓDIGOS DE BALANZA (configurable) ---
    // Layout configurable en Configuración (con defaults = formato clásico:
    // prefijo 20, código en 2..7, precio en 7..12, 2 decimales).
    const bc = datosNegocio?.balanzaConfig || {};
    const prefijo = String(bc.prefijo ?? '20');
    const modo = bc.modo === 'peso' ? 'peso' : 'precio';
    const codInicio = Number(bc.codInicio ?? 2);
    const codLen = Number(bc.codLen ?? 5);
    const valInicio = Number(bc.valInicio ?? 7);
    const valLen = Number(bc.valLen ?? 5);
    const decimales = Number.isFinite(Number(bc.decimales))
      ? Number(bc.decimales)
      : 2;

    if (barcode.length === 13 && prefijo && barcode.startsWith(prefijo)) {
      const productCode = barcode.substring(codInicio, codInicio + codLen);
      const rawValue = parseInt(
        barcode.substring(valInicio, valInicio + valLen),
        10,
      );

      if (!isNaN(rawValue)) {
        const product = productos.find((p) => p.codigoBarras === productCode);

        if (product) {
          const factor = Math.pow(10, decimales);

          if (modo === 'peso') {
            // El código trae el PESO: usamos el precio por Kg del producto y
            // descontamos el peso real del stock (item por peso).
            const pesoKg = rawValue / factor;
            if (pesoKg > 0) {
              handleAddToCart({ ...product, vendidoPor: 'peso' }, pesoKg, 0);
              if (barcodeInputRef.current) barcodeInputRef.current.value = '';
              safeFocus();
              return;
            }
          } else {
            // El código trae el PRECIO ya calculado por la balanza.
            const price = rawValue / factor;
            const itemFromScale = {
              ...product,
              precioFinal: price,
              cantidad: 1, // Es 1 ticket
              vendidoPor: 'ticketBalanza',
            };
            handleAddToCart(itemFromScale, 1, 0);
            if (barcodeInputRef.current) barcodeInputRef.current.value = '';
            safeFocus();
            return;
          }
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

  // Producto identificado por foto (IA): lo buscamos en el catálogo.
  const handleProductoPorFoto = (nombreIA, _blob, codigo) => {
    setShowFoto(false);
    if (codigo) {
      const porCodigo = productos.find((p) => p.codigoBarras === codigo);
      if (porCodigo) {
        handleAddToCart(porCodigo, 1, 0);
        return;
      }
    }
    const q = String(nombreIA || '').toLowerCase();
    const palabras = q.split(/\s+/).filter((w) => w.length > 3);
    let mejor = null;
    let mejorPuntaje = 0;
    productos.forEach((p) => {
      const n = String(p.nombre || '').toLowerCase();
      const puntaje = palabras.filter((w) => n.includes(w)).length;
      if (puntaje > mejorPuntaje) {
        mejorPuntaje = puntaje;
        mejor = p;
      }
    });
    if (mejor) {
      handleAddToCart(mejor, 1, 0);
      mostrarMensaje(`Agregado: ${mejor.nombre}`, 'success');
    } else {
      mostrarMensaje(
        `No encontré "${nombreIA}" en tus productos. Cargalo primero.`,
        'warning',
      );
    }
  };

  // Relay "celu como pistola": escucha códigos escaneados desde el celu y los
  // agrega a la venta en tiempo real.
  useEffect(() => {
    const sucId = sucursalActual?.id;
    if (!sucId) return undefined;
    const ultimoTs = { current: Date.now() };
    const unsub = onSnapshot(doc(db, 'scannerRelay', sucId), (snap) => {
      const d = snap.data();
      if (d?.codigo && d?.ts && d.ts > ultimoTs.current) {
        ultimoTs.current = d.ts;
        handleAgregarPorCodigo(String(d.codigo));
      }
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sucursalActual]);

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

  const handleConfirmPayment = async (
    metodoPago,
    tipoFactura,
    vuelto = 0,
    propina = 0,
  ) => {
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

        // Vamos directo a facturar: el chequeo previo de estado de ARCA
        // duplicaba la espera. Si ARCA está caído, el propio createInvoice
        // falla y lo explicamos abajo.
        Swal.fire({
          title: 'Emitiendo factura…',
          text: 'Conectando con ARCA',
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading(),
        });

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

        // Aviso breve y NO bloqueante: la venta sigue sin esperar un "OK".
        Swal.fire({
          icon: afipResult.mock ? 'warning' : 'success',
          title: afipResult.mock
            ? 'Factura en MODO PRUEBA'
            : '¡Factura autorizada!',
          text: afipResult.cae ? `CAE ${afipResult.cae}` : '',
          timer: 1600,
          showConfirmButton: false,
        });
      } catch (error) {
        console.error('Error al facturar:', error);
        Swal.close();
        const msg = String(error?.message || '');
        const arcaCaido =
          /timeout|ETIMEDOUT|ECONNRESET|network|socket|unavailable|503|502/i.test(
            msg,
          );
        await mostrarMensaje(
          arcaCaido
            ? 'ARCA no responde en este momento. No se emitió la factura: probá de nuevo en unos minutos, o cobrá como "Ticket X" y facturá cuando vuelva.'
            : `Error al facturar: ${msg}`,
          arcaCaido ? 'warning' : 'error',
        );
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
      vuelto, // <--- Vuelto calculado en el modal de pago
      propina, // <--- Propina (no entra en el total fiscal)
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
      <div className="mb-4 flex flex-col justify-between sm:flex-row sm:items-center gap-4">
        <h2 className="flex items-center gap-2 text-xl font-semibold text-white sm:text-2xl">
          <ShoppingCart className="h-8 w-8 text-blue-500" />
          Nueva Venta
        </h2>
        <div>
          <PanelAlertas />
        </div>
      </div>
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

          {/* Acceso rápido: productos marcados como favoritos */}
          {productos.some((p) => p.favorito) && (
            <div>
              <h4 className="text-md mb-2 font-medium text-white">
                ⭐ Acceso rápido
              </h4>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                {productos
                  .filter((p) => p.favorito)
                  .map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleAddToCart(p, 1, 0)}
                      className="flex flex-col items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-900/50 p-2 text-center transition-colors hover:border-blue-500 hover:bg-zinc-700"
                      title={`Agregar ${p.nombre}`}
                    >
                      {p.imagenUrl ? (
                        <img
                          src={p.imagenUrl}
                          alt={p.nombre}
                          className="h-12 w-12 rounded object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded bg-zinc-700 text-xs font-bold text-zinc-400">
                          {(p.nombre || '?').substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span className="line-clamp-2 text-xs font-medium text-zinc-200">
                        {p.nombre}
                      </span>
                      <span className="text-xs text-zinc-400">
                        ${formatCurrency(p.precio)}
                      </span>
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* --- AGREGAR POR CÓDIGO DE BARRAS --- */}
          <div>
            <label
              htmlFor="scan-barcode-react"
              className="mb-1 block text-sm font-medium text-zinc-300"
            >
              Escanear Código de Barras:
              <TeclaAtajo className="border-zinc-500">F6</TeclaAtajo>
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
            {/* Escanear con la cámara (si el dispositivo tiene cámara) */}
            {typeof navigator !== 'undefined' &&
              navigator.mediaDevices &&
              navigator.mediaDevices.getUserMedia && (
              <button
                type="button"
                onClick={() => setShowEscaner(true)}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-md border border-sky-500 bg-sky-500/10 px-4 py-2 text-sm font-semibold text-sky-300 transition-colors hover:bg-sky-500 hover:text-white"
              >
                <i className="fas fa-camera"></i> Escanear con cámara
                <TeclaAtajo className="border-sky-400/50">F8</TeclaAtajo>
              </button>
            )}
            {/* Balanza en vivo: habilitada en Configuración + soporte del navegador */}
            {datosNegocio?.habilitarBalanzaEnVivo &&
              typeof navigator !== 'undefined' &&
              'serial' in navigator && (
              <button
                type="button"
                onClick={() => setShowBalanza(true)}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-md border border-indigo-500 bg-indigo-500/10 px-4 py-2 text-sm font-semibold text-indigo-300 transition-colors hover:bg-indigo-500 hover:text-white"
              >
                <i className="fas fa-balance-scale"></i> Balanza en vivo
              </button>
            )}
            {canAccessAI && soportaVoz() && (
              <button
                type="button"
                onClick={() => setShowVoz(true)}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-md border border-rose-500 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-300 transition-colors hover:bg-rose-500 hover:text-white"
              >
                <i className="fas fa-microphone"></i> Vender por voz
              </button>
            )}
            {canAccessAI &&
              typeof navigator !== 'undefined' &&
              navigator.mediaDevices &&
              navigator.mediaDevices.getUserMedia && (
                <button
                  type="button"
                  onClick={() => setShowFoto(true)}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-md border border-purple-500 bg-purple-500/10 px-4 py-2 text-sm font-semibold text-purple-300 transition-colors hover:bg-purple-500 hover:text-white"
                >
                  <i className="fas fa-camera"></i> Agregar por foto (IA)
                </button>
              )}
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
                <TeclaAtajo className="border-zinc-500">F3</TeclaAtajo>
              </label>
              <SearchBar
                ref={manualProductSearchRef}
                items={productos} // --- MODIFICADO: Mostrar todos los productos, incluso sin stock
                placeholder="Escriba para buscar..."
                onSelect={setSelectedProductManual}
                displayKey="nombre"
                filterKeys={['nombre', 'codigoBarras']}
                inputId="producto-buscar-manual-react"
                imageKey="imagenUrl"
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
                  disabled={!puedeModificarPrecios}
                  className={`w-full rounded-md border border-zinc-600 p-2 text-zinc-100 ${
                    !puedeModificarPrecios ? 'bg-zinc-800 cursor-not-allowed opacity-50' : 'bg-zinc-700'
                  }`}
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
                  <TeclaAtajo className="border-zinc-500">F7</TeclaAtajo>
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
        condicionEmisor={datosNegocio?.condicionIva}
      />

      {showBalanza && (
        <BalanzaEnVivoModal onClose={() => setShowBalanza(false)} />
      )}

      {showVoz && <VentaPorVozModal onClose={() => setShowVoz(false)} />}

      {showFoto && (
        <EscanerNombreModal
          onDetected={handleProductoPorFoto}
          onClose={() => setShowFoto(false)}
        />
      )}

      {showEscaner && (
        <EscanerCamaraModal
          onDetected={(codigo) => {
            setShowEscaner(false);
            handleAgregarPorCodigo(codigo);
          }}
          onClose={() => setShowEscaner(false)}
        />
      )}
    </div>
  );
}
export default VentaTab;
