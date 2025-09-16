// src/context/AppContext.jsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import { db, auth } from '../firebaseConfig';
import { collection, onSnapshot, query, where, doc, increment } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import * as fsService from '../services/firestoreService';
import { obtenerFechaHoraActual } from '../utils/helpers';
import { getFunctions, httpsCallable } from "firebase/functions";
import Swal from 'sweetalert2';

// --- Creación del Contexto ---
export const AppContext = createContext();
export const useAppContext = () => useContext(AppContext);

// --- Utilidades ---
const generateLocalId = (prefix = 'local_') => `${prefix}${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
const isValidFirestoreId = (id) => id && typeof id === 'string' && !id.startsWith('local_');
const ensureArray = (arr) => (Array.isArray(arr) ? arr : []);

export const AppProvider = ({ children, mostrarMensaje, confirmarAccion }) => {
  // --- Auth & carga ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // --- Datos ---
  const [productos, setProductos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [vendedores, setVendedores] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [egresos, setEgresos] = useState([]);
  const [ingresosManuales, setIngresosManuales] = useState([]);
  const [notasCD, setNotasCD] = useState([]);
  const [datosNegocio, setDatosNegocio] = useState(null);
  const [turnos, setTurnos] = useState([]);
  const [turnoActivo, setTurnoActivo] = useState(null);

  // --- UI edición ---
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingClient, setEditingClient] = useState(null);
  const [vendedorActivoId, setVendedorActivoId] = useState(null);

  // ---- AUTH ----
  useEffect(() => {
    setIsLoadingData(true);
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const tokenResult = await user.getIdTokenResult();
        setIsAdmin(tokenResult.claims.admin === true);
        setCurrentUserId(user.uid);
        setIsLoggedIn(true);
      } else {
        setCurrentUserId(null);
        setIsLoggedIn(false);
        setIsAdmin(false);
        setProductos([]); setClientes([]); setVendedores([]); setCartItems([]);
        setVentas([]); setEgresos([]); setIngresosManuales([]); setNotasCD([]);
        setDatosNegocio(null);
      }
      setIsLoadingData(false);setIsLoading(false);
    });
    return () => unsub();
  }, []);

  // ---- Listeners en tiempo real (sin índices compuestos) ----
  useEffect(() => {
    if (!currentUserId) return;

    const collectionsToListen = [
      { name: 'productos', setter: setProductos },
      { name: 'clientes', setter: setClientes },
      { name: 'vendedores', setter: setVendedores },
      { name: 'proveedores', setter: setProveedores },
      { name: 'pedidos', setter: setPedidos },
      { name: 'ventas', setter: setVentas },
      { name: 'egresos', setter: setEgresos },
      { name: 'ingresos_manuales', setter: setIngresosManuales },
      { name: 'notas_cd', setter: setNotasCD },
      { name: 'turnos', setter: setTurnos },
    ];

    const unsubscribes = collectionsToListen.map(({ name, setter }) => {
      const q = query(collection(db, name), where('userId', '==', currentUserId));
      return onSnapshot(q,
        (querySnapshot) => {
          const data = querySnapshot.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            // Ordenamos en memoria por timestamp desc para evitar índices compuestos
            .sort((a, b) => {
              const ta = a?.timestamp?.toDate ? a.timestamp.toDate().getTime() : new Date(a.timestamp || 0).getTime();
              const tb = b?.timestamp?.toDate ? b.timestamp.toDate().getTime() : new Date(b.timestamp || 0).getTime();
              return tb - ta;
            });
          setter(ensureArray(data));
        },
        (error) => {
          console.error(`Error escuchando la colección ${name}:`, error);
          mostrarMensaje?.(`No se pudo conectar a ${name} en tiempo real.`, 'error');
        }
      );
    });

const unsubDatosNegocio = onSnapshot(doc(db, 'datosNegocio', currentUserId), (snap) => {
      setDatosNegocio(snap.exists() ? { id: snap.id, ...snap.data() } : null);
    },
    (error) => {
      console.error("Error escuchando datos del negocio:", error);
      mostrarMensaje?.('No se pudo conectar a los datos de tu negocio.', 'error');
    });
    unsubscribes.push(unsubDatosNegocio);

    return () => { unsubscribes.forEach((u) => u && u()); };
  }, [currentUserId]);

  // ---- Handlers ----
  // frontend/src/context/AppContext.jsx
const handleBackupData = async () => {
    setIsLoading(true); // Usaremos el estado de carga que ya tienes
    mostrarMensaje("Generando backup... Esto puede tardar unos segundos.", "info");
    try {
        const functions = getFunctions();
        const backupUserData = httpsCallable(functions, 'backupUserData');
        const result = await backupUserData();

        // Convertimos el objeto de datos a un string en formato JSON
        const jsonString = JSON.stringify(result.data, null, 2);
        // Creamos un archivo "blob" en la memoria del navegador
        const blob = new Blob([jsonString], { type: "application/json" });
        // Creamos una URL temporal para ese archivo
        const url = URL.createObjectURL(blob);

        // Creamos un enlace invisible, le hacemos clic para iniciar la descarga y luego lo eliminamos
        const a = document.createElement("a");
        a.href = url;
        a.download = `backup-khaleesi-system-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url); // Liberamos la memoria

        mostrarMensaje("Backup descargado exitosamente.", "success");

    } catch (error) {
        console.error("Error al generar el backup:", error);
        mostrarMensaje("No se pudo generar el backup. Intenta de nuevo.", "error");
    } finally {
        setIsLoading(false);
    }
};

const handleNotifyPayment = async () => {
  setIsLoading(true);
  try {
    const functions = getFunctions();
    const notifyAdmin = httpsCallable(functions, 'notifyAdminOfPayment');
    await notifyAdmin();
    mostrarMensaje("Notificación enviada con éxito.", "success");
    return true; // Devuelve true si tuvo éxito
  } catch (error) {
    console.error("Error al notificar el pago:", error);
    mostrarMensaje("No se pudo enviar la notificación. Intenta de nuevo.", "error");
    return false; // Devuelve false si falló
  } finally {
    setIsLoading(false);
  }
};
  const handleLogout = async () => { await signOut(auth); };

  // Carrito (agregar desde producto con descuento por línea)
 const handleAddToCart = (producto, cantidad, descuento = 0) => {
    if (!producto || cantidad <= 0) return;
    const descuentoNum = Number(descuento) || 0;
    if (descuentoNum < 0 || descuentoNum > 100) {
      mostrarMensaje?.('El descuento debe estar entre 0 y 100.', 'warning');
      return;
    }

    const isByWeight = producto.vendidoPor === 'peso';
    const isScaleTicket = producto.vendidoPor === 'ticketBalanza';

    let precioFinalConDescuento;
    let newItem;

    // SI ES UN TICKET DE BALANZA, EL PRECIO YA VIENE FIJADO
    if (isScaleTicket) {
        precioFinalConDescuento = producto.precioFinal;
        newItem = {
            ...producto,
            cartId: generateLocalId('ticket_'), // ID único siempre
            cantidad: 1,
            precioOriginal: producto.precioFinal, // El precio original es el del ticket
            descuentoPorcentaje: 0, // No se aplican descuentos a tickets
            precioFinal: precioFinalConDescuento,
        };
    } else {
        // LÓGICA NORMAL PARA PRODUCTOS POR PESO O UNIDAD
        const precioBase = producto.precio;
        const precioTotalItem = precioBase * cantidad;
        precioFinalConDescuento = precioTotalItem - (precioTotalItem * descuentoNum / 100);
        
        newItem = {
            ...producto,
            cartId: isByWeight ? generateLocalId('cart_') : producto.id,
            cantidad: cantidad,
            precioOriginal: precioBase,
            descuentoPorcentaje: descuentoNum,
            precioFinal: precioFinalConDescuento,
        };
    }

    const itemExistente = !isByWeight && !isScaleTicket ? cartItems.find((i) => i.id === producto.id && i.descuentoPorcentaje === descuentoNum) : null;

    if (itemExistente) {
      setCartItems((prev) => prev.map((i) => (i.cartId === producto.id && i.descuentoPorcentaje === descuentoNum)
        ? { ...i, cantidad: i.cantidad + cantidad, precioFinal: i.precioFinal + precioFinalConDescuento }
        : i));
    } else {
      setCartItems((prev) => [...prev, newItem]);
    }
};

  // Ítem manual a carrito
  const handleAddManualItemToCart = (descripcion, monto) => {
    if (!descripcion.trim() || isNaN(monto) || Number(monto) <= 0) {
      mostrarMensaje?.('Ingrese una descripción y un monto válido.', 'warning');
      return false;
    }
    const montoNum = Number(monto);
    const manualItem = {
      id: generateLocalId('manual_'),
      nombre: descripcion.trim(),
      cantidad: 1,
      precioOriginal: montoNum,
      descuentoPorcentaje: 0,
      precioFinal: montoNum,
      isTracked: false,
    };
    setCartItems((prev) => [...prev, manualItem]);
    return true;
  };

  // Productos
  const handleSaveProduct = async (productDataFromForm) => {
    const productDataFirebase = { ...productDataFromForm, userId: currentUserId };
    const isEditing = isValidFirestoreId(productDataFromForm.id);
    const existsBarcode = productos.find(
      (p) => p.codigoBarras && productDataFirebase.codigoBarras && p.codigoBarras === productDataFirebase.codigoBarras && p.id !== productDataFromForm.id
    );
    if (existsBarcode) { mostrarMensaje?.(`Código de barras "${productDataFirebase.codigoBarras}" ya asignado.`, 'warning'); return; }
    setIsLoadingData(true);
    if (isEditing) {
      const { id, ...dataToUpdate } = productDataFirebase;
      const ok = await fsService.updateProducto(id, dataToUpdate);
      mostrarMensaje?.(ok ? 'Producto actualizado.' : 'Error al actualizar producto.', ok ? 'success' : 'error');
    } else {
      const { id, ...dataToAdd } = productDataFirebase;
      const newId = await fsService.addProducto(currentUserId, dataToAdd);
      mostrarMensaje?.(isValidFirestoreId(newId) ? 'Producto agregado.' : 'Error al agregar producto.', isValidFirestoreId(newId) ? 'success' : 'error');
    }
    setIsLoadingData(false);
    setEditingProduct(null);
  };
  const handleEditProduct = (product) => setEditingProduct(product);
  const handleCancelEditProduct = () => setEditingProduct(null);
  const handleDeleteProduct = async (productId, productName) => {
    if (!isValidFirestoreId(productId)) { mostrarMensaje?.('ID de producto inválido.', 'error'); return; }
    if (await confirmarAccion?.('¿Eliminar Producto?', `¿Seguro de eliminar "${productName}"?`, 'warning', 'Sí, eliminar')) {
      setIsLoadingData(true);
      const ok = await fsService.deleteProducto(productId);
      mostrarMensaje?.(ok ? `Producto "${productName}" eliminado.` : 'Error al eliminar producto.', ok ? 'success' : 'error');
      setIsLoadingData(false);
      if (editingProduct?.id === productId) setEditingProduct(null);
    }
  };

  const handleBulkPriceUpdate = async (percentage) => {
    const percentageNum = parseFloat(percentage);
    if (isNaN(percentageNum) || percentageNum <= 0) {
        mostrarMensaje("Por favor, ingresa un porcentaje válido y mayor a cero.", "warning");
        return;
    }

    const confirm = await confirmarAccion?.(
        '¿Actualizar Precios?',
        `Estás a punto de aumentar el precio de TODOS tus ${productos.length} productos en un ${percentageNum}%. Esta acción no se puede deshacer. ¿Continuar?`,
        'warning',
        'Sí, actualizar todos'
    );

    if (confirm) {
        setIsLoadingData(true);

        const productsToUpdate = productos.map(p => {
            const currentPrice = p.precio || 0;
            const newPrice = currentPrice * (1 + percentageNum / 100);
            return {
                id: p.id,
                newPrice: parseFloat(newPrice.toFixed(2)) // Redondeamos a 2 decimales
            };
        });

        const ok = await fsService.bulkUpdatePrices(productsToUpdate);

        mostrarMensaje?.(ok ? 'Precios actualizados con éxito.' : 'Error al actualizar los precios.', ok ? 'success' : 'error');
        setIsLoadingData(false);
    }
};

  // Clientes
  const handleSaveClient = async (clientDataFromForm) => {
    const clientDataFirebase = { ...clientDataFromForm, userId: currentUserId };
    const isEditing = isValidFirestoreId(clientDataFromForm.id);
    setIsLoadingData(true);
    if (isEditing) {
      const { id, ...dataToUpdate } = clientDataFirebase;
      const ok = await fsService.updateCliente(id, dataToUpdate);
      mostrarMensaje?.(ok ? 'Cliente actualizado.' : 'Error al actualizar cliente.', ok ? 'success' : 'error');
    } else {
      const { id, ...dataToAdd } = clientDataFirebase;
      const newId = await fsService.addCliente(currentUserId, dataToAdd);
      mostrarMensaje?.(isValidFirestoreId(newId) ? 'Cliente agregado.' : 'Error al agregar cliente.', isValidFirestoreId(newId) ? 'success' : 'error');
    }
    setIsLoadingData(false);
    setEditingClient(null);
  };
  const handleEditClient = (client) => setEditingClient(client);
  const handleCancelEditClient = () => setEditingClient(null);
  const handleDeleteClient = async (clientId, clientName) => {
    if (!isValidFirestoreId(clientId)) { mostrarMensaje?.('ID de cliente inválido.', 'error'); return; }
    if (await confirmarAccion?.('¿Eliminar Cliente?', `¿Seguro de eliminar a "${clientName}"?`, 'warning', 'Sí, eliminar')) {
      setIsLoadingData(true);
      const ok = await fsService.deleteCliente(clientId);
      mostrarMensaje?.(ok ? `Cliente "${clientName}" eliminado.` : 'Error al eliminar cliente.', ok ? 'success' : 'error');
      setIsLoadingData(false);
      if (editingClient?.id === clientId) setEditingClient(null);
    }
  };

  // Vendedores
  const handleSaveVendedor = async (vendedorData, vendedorId = null) => {
    setIsLoadingData(true);
    if (isValidFirestoreId(vendedorId)) {
      const ok = await fsService.updateVendedor(vendedorId, vendedorData);
      mostrarMensaje?.(ok ? 'Vendedor actualizado.' : 'Error al actualizar vendedor.', ok ? 'success' : 'error');
    } else {
      const newId = await fsService.addVendedor(currentUserId, vendedorData);
      mostrarMensaje?.(isValidFirestoreId(newId) ? 'Vendedor agregado.' : 'Error al agregar vendedor.', isValidFirestoreId(newId) ? 'success' : 'error');
    }
    setIsLoadingData(false);
  };
  const handleDeleteVendedor = async (vendedorId, vendedorName) => {
    if (!isValidFirestoreId(vendedorId)) return;
    if (await confirmarAccion?.('¿Eliminar Vendedor?', `¿Seguro de eliminar a "${vendedorName}"?`, 'warning', 'Sí, eliminar')) {
      setIsLoadingData(true);
      const ok = await fsService.deleteDocument('vendedores', vendedorId);
      mostrarMensaje?.(ok ? `Vendedor "${vendedorName}" eliminado.` : 'Error al eliminar vendedor.', ok ? 'success' : 'error');
      setIsLoadingData(false);
    }
  };

// Proveedores
const handleSaveProveedor = async (proveedorData, proveedorId = null) => {
    setIsLoadingData(true);
    // Ya no pasamos el userId como primer argumento, ya viene en proveedorData desde el form
    // y la función de servicio se encarga de agregarlo.
    if (isValidFirestoreId(proveedorId)) {
        // Al actualizar, no necesitamos enviar el userId de nuevo si no cambia
        const { userId, ...dataToUpdate } = proveedorData; 
        const ok = await fsService.updateProveedor(proveedorId, dataToUpdate);
        mostrarMensaje?.(ok ? 'Proveedor actualizado.' : 'Error al actualizar proveedor.', ok ? 'success' : 'error');
    } else {
        const newId = await fsService.addProveedor(currentUserId, proveedorData);
        mostrarMensaje?.(isValidFirestoreId(newId) ? 'Proveedor agregado.' : 'Error al agregar proveedor.', isValidFirestoreId(newId) ? 'success' : 'error');
    }
    setIsLoadingData(false);
};

const handleDeleteProveedor = async (proveedorId, proveedorName) => {
    if (!isValidFirestoreId(proveedorId)) return;
    if (await confirmarAccion?.('¿Eliminar Proveedor?', `¿Seguro de eliminar a "${proveedorName}"?`, 'warning', 'Sí, eliminar')) {
        setIsLoadingData(true);
        // Usamos la función genérica 'deleteDocument' que apunta a la colección correcta
        const ok = await fsService.deleteDocument('proveedores', proveedorId);
        mostrarMensaje?.(ok ? `Proveedor "${proveedorName}" eliminado.` : 'Error al eliminar proveedor.', ok ? 'success' : 'error');
        setIsLoadingData(false);
    }
};

// Pedidos a Proveedores
const handleSavePedido = async (pedidoData) => {
    setIsLoadingData(true);
    const newId = await fsService.addPedido(currentUserId, pedidoData);
    const success = isValidFirestoreId(newId);
    mostrarMensaje?.(success ? 'Pedido creado con éxito.' : 'Error al crear el pedido.', success ? 'success' : 'error');
    setIsLoadingData(false);
    return success; // Devolvemos true o false para que el formulario sepa si debe cerrarse
};

const handleUpdatePedidoEstado = async (pedidoId, nuevoEstado) => {
    setIsLoadingData(true);
    const ok = await fsService.updatePedido(pedidoId, { estado: nuevoEstado });
    mostrarMensaje?.(ok ? 'Estado del pedido actualizado.' : 'Error al actualizar estado.', ok ? 'success' : 'error');
    setIsLoadingData(false);
};

const handleRecibirPedido = async (pedido) => {
    const confirm = await confirmarAccion?.(
        '¿Recibir Pedido?',
        'Esto marcará el pedido como "recibido" y sumará las cantidades al stock de tus productos. ¿Estás seguro?',
        'info',
        'Sí, recibir'
    );

    if (confirm) {
        setIsLoadingData(true);
        const ok = await fsService.recibirPedidoYActualizarStock(pedido);
        mostrarMensaje?.(ok ? 'Pedido recibido y stock actualizado.' : 'Error en la operación.', ok ? 'success' : 'error');
        setIsLoadingData(false);
    }
};

const handleCancelarPedido = async (pedido) => {
    const confirm = await confirmarAccion?.(
        '¿Cancelar Pedido?',
        `¿Estás seguro de que quieres cancelar el pedido a "${pedido.proveedorNombre}"? Esta acción no se puede deshacer.`,
        'warning',
        'Sí, cancelar'
    );

    if (confirm) {
        setIsLoadingData(true);
        const ok = await fsService.updatePedido(pedido.id, { estado: 'cancelado' });
        mostrarMensaje?.(ok ? 'Pedido cancelado.' : 'Error al cancelar el pedido.', ok ? 'success' : 'error');
        setIsLoadingData(false);
    }
};

const handleDeletePedido = async (pedido) => {
    let confirmMessage = `¿Estás seguro de que quieres eliminar el pedido a "${pedido.proveedorNombre}"? Esta acción es permanente.`;
    let title = '¿Eliminar Pedido?';

    // NUEVA LÓGICA: Mensaje y título personalizados si el pedido fue recibido
    if (pedido.estado === 'recibido') {
        title = '¿Eliminar y Revertir Stock?';
        confirmMessage = `Este pedido ya fue RECIBIDO. Al eliminarlo, se RESTARÁN las cantidades del stock de los productos correspondientes. ¿Continuar?`;
    }

    const confirm = await confirmarAccion?.(title, confirmMessage, 'warning', 'Sí, eliminar');

    if (confirm) {
        setIsLoadingData(true);
        // Llamamos a la nueva función que maneja la reversión del stock
        const ok = await fsService.deletePedidoAndRevertStock(pedido);
        
        mostrarMensaje?.(ok ? 'Pedido eliminado y stock actualizado.' : 'Error al eliminar el pedido.', ok ? 'success' : 'error');
        setIsLoadingData(false);
        return ok; // Para que el modal se pueda cerrar
    }
    return false;
};

  // Venta confirmada
  
const handleSaleConfirmed = async (itemsInCart, total, cliente, pagos, tipoFactura) => {
    if (!vendedorActivoId) { 
        mostrarMensaje?.('Debe seleccionar un vendedor para registrar la venta.', 'warning'); 
        return; 
    }
    const vendedorSeleccionado = vendedores.find((v) => v.id === vendedorActivoId);
    if (!vendedorSeleccionado) { 
        mostrarMensaje?.('El vendedor seleccionado no es válido.', 'error'); 
        return; 
    }

    setIsLoadingData(true);
    const { fecha, hora } = obtenerFechaHoraActual();
    const clienteIdFinal = cliente && isValidFirestoreId(cliente.id) ? cliente.id : 'consumidor_final';

    const totalPagado = ensureArray(pagos).reduce((sum, p) => sum + (Number(p?.monto) || 0), 0);
    const vueltoFinal = totalPagado > total ? totalPagado - total : 0;

    // --- LÓGICA MODIFICADA PARA AÑADIR EL COSTO ---
    const itemsWithCost = ensureArray(itemsInCart).map((item) => {
        // Buscamos el producto original en nuestra lista de productos para obtener su costo actual
        const originalProduct = productos.find(p => p.id === item.id);
        return {
            id: item.id,
            nombre: item.nombre,
            cantidad: item.cantidad,
            precioOriginal: item.precioOriginal || item.precio,
            descuentoPorcentaje: item.descuentoPorcentaje || 0,
            precioFinal: item.precioFinal || item.precio,
            // Añadimos el costo. Si el producto no se encuentra o no tiene costo, guardamos 0.
            costo: originalProduct ? (originalProduct.costo || 0) : 0, 
        };
    });
    // ---------------------------------------------

    const newSaleData = {
        fecha,
        hora,
        clienteId: clienteIdFinal,
        clienteNombre: cliente?.nombre || 'Consumidor Final',
        items: itemsWithCost, // <--- Usamos el nuevo array de items que incluye el costo
        total,
        pagos: ensureArray(pagos),
        vuelto: vueltoFinal,
        tipoFactura,
        userId: currentUserId,
        vendedorId: vendedorSeleccionado.id,
        vendedorNombre: vendedorSeleccionado.nombre,
    };

    try {
        // 1. Primero, creamos la venta como siempre
        const ventaId = await fsService.addVenta(currentUserId, newSaleData);

        if (isValidFirestoreId(ventaId)) {
            // 2. Si la venta se guardó bien Y HAY UN TURNO ACTIVO...
            if (turnoActivo) {
                // ...asociamos el ID de esta venta a ese turno.
                await fsService.addSaleToShift(turnoActivo.id, ventaId);
            }
            
            // 3. Limpiamos el carrito y mostramos el mensaje de éxito
            setCartItems([]);
            mostrarMensaje?.('Venta registrada con éxito.', 'success');
        }
    } catch (error) {
        mostrarMensaje?.(error.message || 'Error al procesar la venta.', 'error');
    } finally { 
        setIsLoadingData(false); 
    }
};

const handleAbrirTurno = async (vendedorId, montoInicial) => {
    const vendedor = vendedores.find(v => v.id === vendedorId);
    if (!vendedor) return;

    const { fecha, hora } = obtenerFechaHoraActual();
    const turnoData = {
        userId: currentUserId,
        vendedorId: vendedor.id,
        vendedorNombre: vendedor.nombre,
        montoInicial: Number(montoInicial) || 0,
        fechaApertura: fecha,
        horaApertura: hora,
        estado: 'abierto',
        ventasIds: []
    };

    const newDocRef = await fsService.startShift(turnoData);
    const newTurno = { id: newDocRef.id, ...turnoData };
    setTurnoActivo(newTurno);
    mostrarMensaje('Turno iniciado con éxito.', 'success');
};

const handleCerrarTurno = async (datosCierre) => {
    if (!turnoActivo) return;

    const { fecha, hora } = obtenerFechaHoraActual();
    const turnoFinalizadoData = {
        ...datosCierre,
        fechaCierre: fecha,
        horaCierre: hora,
        estado: 'cerrado',
    };

    // Esta variable 'success' ahora recibirá 'true' o 'false' correctamente
    const success = await fsService.endShift(turnoActivo.id, turnoFinalizadoData);
    
    if (success) {
        setTurnoActivo(null);
        mostrarMensaje('Turno cerrado exitosamente.', 'success');
    } else {
        mostrarMensaje('Error al cerrar el turno.', 'error');
    }
};
  // Ingresos / Egresos manuales
  const handleRegistrarIngresoManual = async (descripcion, monto) => {
    const { fecha, hora } = obtenerFechaHoraActual();
    const newIngresoData = { fecha, hora, descripcion, monto: Number(monto) || 0, userId: currentUserId };
    const newId = await fsService.addIngresoManual(currentUserId, newIngresoData);
    mostrarMensaje?.(isValidFirestoreId(newId) ? 'Ingreso manual registrado.' : 'Error al registrar ingreso.', isValidFirestoreId(newId) ? 'success' : 'error');
  };
  const handleEliminarIngresoManual = async (id, descripcion) => {
    if (!isValidFirestoreId(id)) return;
    if (await confirmarAccion?.('¿Eliminar Ingreso?', `¿Eliminar "${descripcion || 'este ingreso'}"?`, 'warning', 'Sí, eliminar')) {
      const ok = await fsService.deleteIngresoManual(id);
      mostrarMensaje?.(ok ? 'Ingreso eliminado.' : 'Error al eliminar ingreso.', ok ? 'success' : 'error');
    }
  };

  const handleRegistrarEgreso = async (descripcion, monto) => {
    const { fecha, hora } = obtenerFechaHoraActual();
    const newEgresoData = { fecha, hora, descripcion, monto: Number(monto) || 0, userId: currentUserId };
    const newId = await fsService.addEgreso(currentUserId, newEgresoData);
    mostrarMensaje?.(isValidFirestoreId(newId) ? 'Egreso registrado.' : 'Error al registrar egreso.', isValidFirestoreId(newId) ? 'success' : 'error');
  };
  const handleEliminarEgreso = async (id, descripcion) => {
    if (!isValidFirestoreId(id)) return;
    if (await confirmarAccion?.('¿Eliminar Egreso?', `¿Eliminar "${descripcion || 'este egreso'}"?`, 'warning', 'Sí, eliminar')) {
      const ok = await fsService.deleteEgreso(id);
      mostrarMensaje?.(ok ? 'Egreso eliminado.' : 'Error al eliminar egreso.', ok ? 'success' : 'error');
    }
  };

  // Notas (CD)
  const handleGenerarNotaManual = async (notaDataFromForm) => {
    setIsLoadingData(true);
    const { fecha, hora } = obtenerFechaHoraActual();
    const cliente = notaDataFromForm.cliente;
    const clienteIdFinal = cliente && isValidFirestoreId(cliente.id) ? cliente.id : 'consumidor_final';
    const clienteNombreFinal = cliente ? cliente.nombre : 'Consumidor Final';

    const notaCompleta = {
      ...notaDataFromForm,
      clienteId: clienteIdFinal,
      clienteNombre: clienteNombreFinal,
      fecha,
      hora,
      userId: currentUserId,
    };
    delete notaCompleta.cliente;

    const newNotaId = await fsService.addNotaManual(currentUserId, notaCompleta);
    mostrarMensaje?.(isValidFirestoreId(newNotaId) ? `Nota de ${notaCompleta.tipo} generada con éxito.` : `Error al generar nota de ${notaCompleta.tipo}.`, isValidFirestoreId(newNotaId) ? 'success' : 'error');
    setIsLoadingData(false);
  };

  const handleAnularVenta = async (ventaOriginal) => {
    if (!isValidFirestoreId(ventaOriginal?.id)) { return mostrarMensaje?.('ID de venta inválido.', 'error'); }
    const yaExisteNota = notasCD.some((nota) => nota.ventaOriginalId === ventaOriginal.id && nota.tipo === 'credito');
    if (yaExisteNota) { return mostrarMensaje?.('Ya existe una nota de crédito para esta venta.', 'warning'); }

    if (await confirmarAccion?.('¿Anular Venta?', 'Se generará una Nota de Crédito y se restaurará el stock de los productos. ¿Continuar?', 'warning', 'Sí, anular venta')) {
      setIsLoadingData(true);
      const { fecha, hora } = obtenerFechaHoraActual();
      const notaData = {
        fecha,
        hora,
        userId: currentUserId,
        tipo: 'credito',
        total: ventaOriginal.total,
        items: ventaOriginal.items,
        clienteId: ventaOriginal.clienteId,
        clienteNombre: ventaOriginal.clienteNombre,
        ventaOriginalId: ventaOriginal.id,
        motivo: `Anulación de venta #${ventaOriginal.id.substring(0, 6)}...`,
      };
      const success = await fsService.anularVentaConNotaCredito(currentUserId, ventaOriginal, notaData);
      mostrarMensaje?.(success ? 'Venta anulada y Nota de Crédito generada.' : 'Error al anular la venta.', success ? 'success' : 'error');
      setIsLoadingData(false);
    }
  };

  const handleEliminarNotaCD = async (notaId) => {
    if (!isValidFirestoreId(notaId)) { mostrarMensaje?.('ID de nota inválido.', 'error'); return; }
    const notaAEliminar = notasCD.find((n) => n.id === notaId);
    if (!notaAEliminar) { mostrarMensaje?.('No se encontró la nota a eliminar.', 'error'); return; }

    const result = await Swal.fire({
      title: '¿Eliminar Nota?',
      html: `¿Seguro de eliminar la nota de tipo <strong>${notaAEliminar.tipo}</strong> para "<strong>${notaAEliminar.clienteNombre}</strong>"?<br/>Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#52525b',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      background: '#27272a',
      color: '#d4d4d8',
      customClass: { popup: 'text-sm rounded-lg', title: 'text-zinc-100 !text-lg', htmlContainer: 'text-zinc-300' },
    });

    if (result.isConfirmed) {
      const success = await fsService.deleteDocument('notas_cd', notaId);
      mostrarMensaje?.(success ? 'Nota eliminada con éxito.' : 'Error al eliminar la nota.', success ? 'success' : 'error');
    }
  };

  const handleGuardarDatosNegocio = async (datosActualizados) => {
    const ok = await fsService.saveDatosNegocio(currentUserId, datosActualizados);
    mostrarMensaje?.(ok ? 'Configuración guardada.' : 'Error al guardar la configuración.', ok ? 'success' : 'error');
    if (ok) setDatosNegocio((prev) => ({ ...prev, ...datosActualizados }));
  };

  const contextValue = {
    // estado
    isLoggedIn, isLoadingData, currentUserId, isAdmin,
    productos, clientes, cartItems, ventas, egresos, ingresosManuales, notasCD, datosNegocio, vendedores, vendedorActivoId, proveedores, pedidos,
    editingProduct, editingClient, turnos, turnoActivo, 
    // setters
    setVendedorActivoId, setCartItems, setTurnoActivo,
    // acciones
    handleLogout,
    handleSaveProduct, handleEditProduct, handleCancelEditProduct, handleDeleteProduct,
    handleSaveClient, handleEditClient, handleCancelEditClient, handleDeleteClient,
    handleSaveVendedor, handleDeleteVendedor,  handleSaveProveedor, handleDeleteProveedor,  handleSavePedido, handleUpdatePedidoEstado, handleRecibirPedido, handleCancelarPedido, handleDeletePedido, handleBulkPriceUpdate, handleAbrirTurno, handleCerrarTurno, 
    handleSaleConfirmed, handleAddToCart, handleEliminarVenta: async (ventaId) => {
      if (!isValidFirestoreId(ventaId)) { mostrarMensaje?.('ID de venta inválido.', 'error'); return; }
      if (await confirmarAccion?.('¿Eliminar Venta?', 'Esto restaurará el stock. ¿Continuar?', 'warning', 'Sí, eliminar')) {
        const ok = await fsService.deleteVentaAndRestoreStock(currentUserId, ventaId);
        mostrarMensaje?.(ok ? 'Venta eliminada y stock restaurado.' : 'Error al eliminar la venta.', ok ? 'success' : 'error');
      }
    },
    handleRegistrarIngresoManual, handleEliminarIngresoManual,
    handleRegistrarEgreso, handleEliminarEgreso,
    handleGenerarNotaManual, handleEliminarNotaCD, handleAnularVenta,
    handleGuardarDatosNegocio,
    handleAddManualItemToCart, handleNotifyPayment,handleBackupData,
    // utilidades
    mostrarMensaje,
    confirmarAccion,
    isLoading,
  };

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
};

export default AppProvider;
