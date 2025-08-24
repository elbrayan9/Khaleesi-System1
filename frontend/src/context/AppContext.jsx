// src/context/AppContext.jsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import { db, auth } from '../firebaseConfig'; // Asegúrate que la ruta es correcta
import { collection, onSnapshot, query, where, doc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import * as fsService from '../services/firestoreService';
import { obtenerFechaHoraActual } from '../utils/helpers';
import { logOut as authLogOut } from '../services/authService';
import Swal from 'sweetalert2';

// --- Creación del Contexto ---
const AppContext = createContext();
export const useAppContext = () => useContext(AppContext);

// --- Funciones de Ayuda ---
const generateLocalId = (prefix = "local_") => `${prefix}${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
const isValidFirestoreId = (id) => id && typeof id === 'string' && !id.startsWith("local_");
const ensureArray = (arr) => Array.isArray(arr) ? arr : [];

// --- Componente Proveedor del Contexto ---
export const AppProvider = ({ children, mostrarMensaje, confirmarAccion }) => {
    const handleAddToCart = (producto, cantidad, descuento = 0) => {
    if (!producto || cantidad <= 0) return;

    const descuentoNum = Number(descuento) || 0;
    if (descuentoNum < 0 || descuentoNum > 100) {
        mostrarMensaje("El descuento debe estar entre 0 y 100.", "warning");
        return;
    }

    const precioOriginal = producto.precio;
    const precioFinal = precioOriginal - (precioOriginal * descuentoNum / 100);

    const itemExistente = cartItems.find(item => item.id === producto.id && item.descuentoPorcentaje === descuentoNum);

    if (itemExistente) {
        // Si ya existe un item con el mismo descuento, solo aumenta la cantidad
        setCartItems(prevItems =>
            prevItems.map(item =>
                item.id === producto.id && item.descuentoPorcentaje === descuentoNum
                    ? { ...item, cantidad: item.cantidad + cantidad }
                    : item
            )
        );
    } else {
        // Si es un producto nuevo o con un descuento diferente, lo añade como nueva línea
        const newItem = {
            ...producto,
            cantidad,
            precioOriginal,
            descuentoPorcentaje: descuentoNum,
            precioFinal
        };
        setCartItems(prevItems => [...prevItems, newItem]);
    }
};
    // --- ESTADOS DE AUTENTICACIÓN Y CARGA ---
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(true);

    // --- ESTADOS DE DATOS DE LA APLICACIÓN ---
    const [productos, setProductos] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [vendedores, setVendedores] = useState([]);
    const [cartItems, setCartItems] = useState([]);
    const [ventas, setVentas] = useState([]);
    const [egresos, setEgresos] = useState([]);
    const [ingresosManuales, setIngresosManuales] = useState([]);
    const [notasCD, setNotasCD] = useState([]);
    const [datosNegocio, setDatosNegocio] = useState(null);

    // --- ESTADOS DE UI (EDICIÓN) ---
    const [editingProduct, setEditingProduct] = useState(null);
    const [editingClient, setEditingClient] = useState(null);
    const [vendedorActivoId, setVendedorActivoId] = useState(null);

    // --- EFECTO 1: MANEJO DE AUTENTICACIÓN ---
    useEffect(() => {
        setIsLoadingData(true);
        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const tokenResult = await user.getIdTokenResult();
                setIsAdmin(tokenResult.claims.admin === true);
                setCurrentUserId(user.uid);
                setIsLoggedIn(true);
            } else {
                // Limpiamos todo al cerrar sesión
                setCurrentUserId(null);
                setIsLoggedIn(false);
                setIsAdmin(false);
                setProductos([]); setClientes([]); setVendedores([]); setCartItems([]);
                setVentas([]); setEgresos([]); setIngresosManuales([]); setNotasCD([]);
                setDatosNegocio(null);
            }
            setIsLoadingData(false);
        });
        return () => unsubscribeAuth();
    }, []);

        // --- EFECTO 2: LISTENERS DE DATOS EN TIEMPO REAL ---
    useEffect(() => {
        if (!currentUserId) return; // Si no hay usuario, no hacemos nada

        const collectionsToListen = [
            { name: 'productos', setter: setProductos },
            { name: 'clientes', setter: setClientes },
            { name: 'vendedores', setter: setVendedores },
            { name: 'ventas', setter: setVentas },
            { name: 'egresos', setter: setEgresos },
            { name: 'ingresos_manuales', setter: setIngresosManuales },
            { name: 'notas_cd', setter: setNotasCD },
        ];

        const unsubscribes = collectionsToListen.map(({ name, setter }) => {
            const q = query(collection(db, name), where("userId", "==", currentUserId));
            return onSnapshot(q, (querySnapshot) => {
                const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setter(ensureArray(data));
            }, (error) => {
                console.error(`Error escuchando la colección ${name}:`, error);
                mostrarMensaje(`No se pudo conectar a ${name} en tiempo real.`, "error");
            });
        });

        const unsubDatosNegocio = onSnapshot(doc(db, 'datosNegocio', currentUserId), (doc) => {
            setDatosNegocio(doc.exists() ? { id: doc.id, ...doc.data() } : null);
        });
        unsubscribes.push(unsubDatosNegocio);

        return () => {
            unsubscribes.forEach(unsub => unsub());
        };
    }, [currentUserId]);


    const loadAllDataForUser = async (userId) => {
        if (!userId) return;
        try {
            const [p, c, v, e, i, nc, dn, vend] = await Promise.all([
                fsService.getProductos(userId), fsService.getClientes(userId), fsService.getVentas(userId),
                fsService.getEgresos(userId), fsService.getIngresosManuales(userId), fsService.getNotasCD(userId),
                fsService.getDatosNegocio(userId), fsService.getAllDataForUser(userId, 'vendedores')
            ]);
            setProductos(ensureArray(p)); setClientes(ensureArray(c)); setVentas(ensureArray(v));
            setEgresos(ensureArray(e)); setIngresosManuales(ensureArray(i)); setNotasCD(ensureArray(nc));
            setDatosNegocio(dn); setVendedores(ensureArray(vend));
        } catch (error) {
            console.error("Error crítico cargando datos del usuario:", error);
            if (error.code === 'permission-denied') {
                mostrarMensaje("Tu suscripción puede haber vencido o no tienes permisos. Contacta al soporte.", "error");
            } else {
                mostrarMensaje("Error al cargar datos desde la nube. Intente recargar la página.", "error");
            }
        }
    };
    
    // --- INICIO DE TODOS LOS HANDLERS DE LA APLICACIÓN ---

    const handleLogout = async () => { await authLogOut(); };
    
    const handleSaveProduct = async (productDataFromForm) => {
        const isEditing = isValidFirestoreId(productDataFromForm.id);
        if (isEditing) {
            await fsService.updateProducto(productDataFromForm.id, productDataFromForm);
            mostrarMensaje("Producto actualizado.", 'success');
        } else {
            await fsService.addProducto(currentUserId, productDataFromForm);
            mostrarMensaje("Producto agregado.", 'success');
        }
        setEditingProduct(null);
    };
    
    const handleEditProduct = (product) => setEditingProduct(product);
    const handleCancelEditProduct = () => setEditingProduct(null);
    
    const handleDeleteProduct = async (productId, productName) => {
        if (await confirmarAccion('¿Eliminar Producto?', `¿Seguro de eliminar "${productName}"?`, 'warning', 'Sí, eliminar')) {
            await fsService.deleteProducto(productId);
            mostrarMensaje(`Producto "${productName}" eliminado.`, 'success');
        }
    };
    
    const handleSaveClient = async (clientDataFromForm) => {
        const isEditing = isValidFirestoreId(clientDataFromForm.id);
        if (isEditing) {
            await fsService.updateCliente(clientDataFromForm.id, clientDataFromForm);
            mostrarMensaje("Cliente actualizado.", 'success');
        } else {
            await fsService.addCliente(currentUserId, clientDataFromForm);
            mostrarMensaje("Cliente agregado.", 'success');
        }
        setEditingClient(null);
    };

    const handleEditClient = (client) => setEditingClient(client);
    const handleCancelEditClient = () => setEditingClient(null);

    const handleDeleteClient = async (clientId, clientName) => {
        if (await confirmarAccion('¿Eliminar Cliente?', `¿Seguro de eliminar a "${clientName}"?`, 'warning', 'Sí, eliminar')) {
            await fsService.deleteCliente(clientId);
            mostrarMensaje(`Cliente "${clientName}" eliminado.`, 'success');
        }
    };

    const handleSaveVendedor = async (vendedorData, vendedorId = null) => {
        if (isValidFirestoreId(vendedorId)) {
            await fsService.updateVendedor(vendedorId, vendedorData);
            mostrarMensaje('Vendedor actualizado.', 'success');
        } else {
            await fsService.addVendedor(currentUserId, vendedorData);
            mostrarMensaje('Vendedor agregado.', 'success');
        }
    };

    const handleDeleteVendedor = async (vendedorId, vendedorName) => {
        if (await confirmarAccion('¿Eliminar Vendedor?', `¿Seguro de eliminar a "${vendedorName}"?`, 'warning', 'Sí, eliminar')) {
            await fsService.deleteVendedor(vendedorId);
            mostrarMensaje(`Vendedor "${vendedorName}" eliminado.`, 'success');
        }
    };


const handleAddManualItemToCart = (descripcion, monto) => {
    if (!descripcion.trim() || isNaN(monto) || monto <= 0) {
        mostrarMensaje("Ingrese una descripción y un monto válido.", "warning");
        return false;
    }

    const montoNum = Number(monto);

    // --- NUEVA ESTRUCTURA DEL ITEM ---
    const manualItem = { 
        id: generateLocalId("manual_"), 
        nombre: descripcion.trim(), 
        cantidad: 1, 
        precioOriginal: montoNum, // El precio original es el monto
        descuentoPorcentaje: 0,  // Sin descuento por defecto
        precioFinal: montoNum,     // El precio final es el mismo que el original
        isTracked: false 
    };
    // --- FIN DE LA NUEVA ESTRUCTURA ---

    setCartItems(prev => [...prev, manualItem]);
    return true;
};;

// src/context/AppContext.jsx

// En AppContext.jsx, reemplaza esta función

const handleSaleConfirmed = async (itemsInCart, total, cliente, pagos, tipoFactura) => {
    // La validación del vendedor activo se mantiene igual
    if (!vendedorActivoId) {
        mostrarMensaje("Debe seleccionar un vendedor para registrar la venta.", "warning");
        return;
    }
    const vendedorSeleccionado = vendedores.find(v => v.id === vendedorActivoId);
    if (!vendedorSeleccionado) {
        mostrarMensaje("El vendedor seleccionado no es válido.", "error");
        return;
    }

    setIsLoadingData(true);
    const { fecha, hora, timestamp } = obtenerFechaHoraActual();
    const clienteIdFinal = cliente && isValidFirestoreId(cliente.id) ? cliente.id : "consumidor_final";

    // --- CÁLCULO DE VUELTO FINAL ---
    const totalPagado = pagos.reduce((sum, p) => sum + p.monto, 0);
    const vueltoFinal = totalPagado > total ? totalPagado - total : 0;

    const newSaleData = {
        fecha, hora, timestamp,
        clienteId: clienteIdFinal,
        clienteNombre: cliente?.nombre || "Consumidor Final",
        items: itemsInCart.map(item => ({
            id: item.id,
            nombre: item.nombre,
            cantidad: item.cantidad,
            precioOriginal: item.precioOriginal || item.precio,
            descuentoPorcentaje: item.descuentoPorcentaje || 0,
            precioFinal: item.precioFinal || item.precio,
        })),
        total,
        // --- NUEVA ESTRUCTURA DE PAGO ---
        pagos: pagos,
        vuelto: vueltoFinal,
        tipoFactura,
        userId: currentUserId,
        vendedorId: vendedorSeleccionado.id,
        vendedorNombre: vendedorSeleccionado.nombre
    };

    try {
        const ventaId = await fsService.addVenta(currentUserId, newSaleData);
        if (isValidFirestoreId(ventaId)) {
            setVentas(prev => [...prev, { ...newSaleData, id: ventaId }]);
            // ...lógica para actualizar stock...
            setCartItems([]);
            mostrarMensaje('Venta registrada con éxito.', 'success');
        }
    } catch (error) { 
        mostrarMensaje(error.message || "Error al procesar la venta.", 'error'); 
    } finally { 
        setIsLoadingData(false); 
    }
};
    const handleEliminarVenta = async (ventaId) => {
        if (!isValidFirestoreId(ventaId)) { mostrarMensaje("ID de venta inválido.", "error"); return; }
        if (await confirmarAccion('¿Eliminar Venta?', 'Esto restaurará el stock. ¿Continuar?', 'warning', 'Sí, eliminar')) {
            setIsLoadingData(true);
            if (await fsService.deleteVentaAndRestoreStock(currentUserId, ventaId)) {
                setVentas(prev => prev.filter(v => v.id !== ventaId));
                await loadAllDataForUser(currentUserId);
                mostrarMensaje('Venta eliminada y stock restaurado.', 'success');
            } else { mostrarMensaje("Error al eliminar la venta.", 'error'); }
            setIsLoadingData(false);
        }
    };

    const handleRegistrarIngresoManual = async (descripcion, monto) => {
        const { fecha, hora, timestamp } = obtenerFechaHoraActual();
        const newIngresoData = { fecha, hora, timestamp, descripcion, monto: Number(monto) || 0, userId: currentUserId };
        const newId = await fsService.addIngresoManual(currentUserId, newIngresoData);
        if (isValidFirestoreId(newId)) {
            setIngresosManuales(prev => [...prev, { ...newIngresoData, id: newId }]);
            mostrarMensaje("Ingreso manual registrado.", 'success');
        } else { mostrarMensaje("Error al registrar ingreso.", 'error'); }
    };

    const handleEliminarIngresoManual = async (id, descripcion) => {
        if (!isValidFirestoreId(id)) return;
        if (await confirmarAccion('¿Eliminar Ingreso?', `¿Eliminar "${descripcion || 'este ingreso'}"?`, 'warning', 'Sí, eliminar')) {
            if (await fsService.deleteIngresoManual(id)) {
                setIngresosManuales(prev => prev.filter(i => i.id !== id));
                mostrarMensaje("Ingreso eliminado.", "success");
            } else { mostrarMensaje("Error al eliminar ingreso.", "error"); }
        }
    };
    
    const handleRegistrarEgreso = async (descripcion, monto) => {
        const { fecha, hora, timestamp } = obtenerFechaHoraActual();
        const newEgresoData = { fecha, hora, timestamp, descripcion, monto: Number(monto) || 0, userId: currentUserId };
        const newId = await fsService.addEgreso(currentUserId, newEgresoData);
        if (isValidFirestoreId(newId)) {
            setEgresos(prev => [...prev, { ...newEgresoData, id: newId }]);
            mostrarMensaje("Egreso registrado.", 'success');
        } else { mostrarMensaje("Error al registrar egreso.", 'error'); }
    };

    const handleEliminarEgreso = async (id, descripcion) => {
        if (!isValidFirestoreId(id)) return;
        if (await confirmarAccion('¿Eliminar Egreso?', `¿Eliminar "${descripcion || 'este egreso'}"?`, 'warning', 'Sí, eliminar')) {
            if (await fsService.deleteEgreso(id)) {
                setEgresos(prev => prev.filter(e => e.id !== id));
                mostrarMensaje("Egreso eliminado.", "success");
            } else { mostrarMensaje("Error al eliminar egreso.", "error"); }
        }
    };

const handleGenerarNotaManual = async (notaDataFromForm) => {
    setIsLoadingData(true);
    const { fecha, hora, timestamp } = obtenerFechaHoraActual();

    // --- LÓGICA AÑADIDA para manejar cliente opcional ---
    const cliente = notaDataFromForm.cliente;
    const clienteIdFinal = cliente && isValidFirestoreId(cliente.id) ? cliente.id : "consumidor_final";
    const clienteNombreFinal = cliente ? cliente.nombre : "Consumidor Final";

    const notaCompleta = { 
        ...notaDataFromForm,
        clienteId: clienteIdFinal,
        clienteNombre: clienteNombreFinal,
        fecha, 
        hora, 
        timestamp, 
        userId: currentUserId 
    };
    delete notaCompleta.cliente; // Limpiamos el objeto 'cliente' que ya no es necesario

    const newNotaId = await fsService.addNotaManual(currentUserId, notaCompleta);

    if (isValidFirestoreId(newNotaId)) {
        await loadAllDataForUser(currentUserId);
        mostrarMensaje(`Nota de ${notaCompleta.tipo} generada con éxito.`, 'success');
    } else {
        mostrarMensaje(`Error al generar nota de ${notaCompleta.tipo}.`, 'error');
    }
    setIsLoadingData(false);
};
const handleAnularVenta = async (ventaOriginal) => {
    if (!isValidFirestoreId(ventaOriginal?.id)) {
        return mostrarMensaje("ID de venta inválido.", "error");
    }
    
    const yaExisteNota = notasCD.some(nota => nota.ventaOriginalId === ventaOriginal.id && nota.tipo === 'credito');
    if (yaExisteNota) {
        return mostrarMensaje("Ya existe una nota de crédito para esta venta.", "warning");
    }

    if (await confirmarAccion('¿Anular Venta?', 'Se generará una Nota de Crédito y se restaurará el stock de los productos. ¿Continuar?', 'warning', 'Sí, anular venta')) {
        setIsLoadingData(true);
        const { fecha, hora, timestamp } = obtenerFechaHoraActual();
        const notaData = {
            fecha, hora, timestamp, userId: currentUserId,
            tipo: 'credito',
            total: ventaOriginal.total,
            items: ventaOriginal.items,
            clienteId: ventaOriginal.clienteId,
            clienteNombre: ventaOriginal.clienteNombre,
            ventaOriginalId: ventaOriginal.id,
            motivo: `Anulación de venta #${ventaOriginal.id.substring(0, 6)}...`
        };

        const success = await fsService.anularVentaConNotaCredito(currentUserId, ventaOriginal, notaData);
        if (success) {
            await loadAllDataForUser(currentUserId);
            mostrarMensaje("Venta anulada y Nota de Crédito generada.", "success");
        } else {
            mostrarMensaje("Error al anular la venta.", "error");
        }
        setIsLoadingData(false);
    }
};
// En AppContext.jsx, reemplaza esta función

const handleEliminarNotaCD = async (notaId) => {
    if (!isValidFirestoreId(notaId)) {
        mostrarMensaje("ID de nota inválido.", "error");
        return;
    }

    const notaAEliminar = notasCD.find(n => n.id === notaId);
    if (!notaAEliminar) {
        mostrarMensaje("No se encontró la nota a eliminar.", "error");
        return;
    }

    // Usamos Swal.fire directamente para tener control sobre la propiedad 'html'
    const result = await Swal.fire({
        title: '¿Eliminar Nota?',
        // Aquí está el cambio clave: usamos la propiedad 'html'
        html: `¿Seguro de eliminar la nota de tipo <strong>${notaAEliminar.tipo}</strong> para "<strong>${notaAEliminar.clienteNombre}</strong>"?<br/>Esta acción no se puede deshacer.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#52525b',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
        background: '#27272a',
        color: '#d4d4d8',
        customClass: {
            popup: 'text-sm rounded-lg',
            title: 'text-zinc-100 !text-lg',
            htmlContainer: 'text-zinc-300',
        }
    });

    if (result.isConfirmed) {
        setIsLoadingData(true);
        // Usamos la función de servicio genérica que ya tenías
        const success = await fsService.deleteDocument('notas_cd', notaId); 
        if (success) {
            setNotasCD(prev => prev.filter(n => n.id !== notaId));
            mostrarMensaje("Nota eliminada con éxito.", "success");
        } else {
            mostrarMensaje("Error al eliminar la nota.", "error");
        }
        setIsLoadingData(false);
    }
};

    const handleGuardarDatosNegocio = async (datosActualizados) => {
        setIsLoadingData(true);
        if (await fsService.saveDatosNegocio(currentUserId, datosActualizados)) {
            setDatosNegocio(prev => ({ ...prev, ...datosActualizados }));
            mostrarMensaje("Configuración guardada.", "success");
        } else { mostrarMensaje("Error al guardar la configuración.", "error"); }
        setIsLoadingData(false);
    };

    // --- FIN DE TODOS LOS HANDLERS ---

    const contextValue = {
        isLoggedIn, isLoadingData, currentUserId, isAdmin,
        productos, clientes, cartItems, ventas, egresos, ingresosManuales, notasCD, datosNegocio, vendedores, vendedorActivoId, 
        editingProduct, editingClient,
        setVendedorActivoId,  
        setCartItems,
        handleLogout,
        handleSaveProduct, handleEditProduct, handleCancelEditProduct, handleDeleteProduct,
        handleSaveClient, handleEditClient, handleCancelEditClient, handleDeleteClient, handleSaveVendedor,
        handleDeleteVendedor,
        handleSaleConfirmed, handleAddToCart, handleEliminarVenta,
        handleRegistrarIngresoManual, handleEliminarIngresoManual,
        handleRegistrarEgreso, handleEliminarEgreso,
        handleGenerarNotaManual,handleEliminarNotaCD, handleAnularVenta,
        handleGuardarDatosNegocio,
        handleAddManualItemToCart,
        mostrarMensaje,
        confirmarAccion,
    };

    return (
        <AppContext.Provider value={contextValue}>
            {children}
        </AppContext.Provider>
    );
};