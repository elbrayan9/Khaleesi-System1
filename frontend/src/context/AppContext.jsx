// src/context/AppContext.jsx
import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useRef,
} from 'react';
import { db, auth } from '../firebaseConfig';
import {
  collection,
  onSnapshot,
  query,
  where,
  doc,
  increment,
} from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import * as fsService from '../services/firestoreService';
import { obtenerFechaHoraActual } from '../utils/helpers';
import { getFunctions, httpsCallable } from 'firebase/functions';
import Swal from 'sweetalert2';

// --- Creación del Contexto ---
export const AppContext = createContext();
export const useAppContext = () => useContext(AppContext);

// --- Utilidades ---
const generateLocalId = (prefix = 'local_') =>
  `${prefix}${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
const isValidFirestoreId = (id) =>
  id && typeof id === 'string' && !id.startsWith('local_');
const ensureArray = (arr) => (Array.isArray(arr) ? arr : []);

export const AppProvider = ({ children, mostrarMensaje, confirmarAccion }) => {
  // --- Auth & carga ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null); // Changed from currentUserId to currentUser object
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
  const [presupuestos, setPresupuestos] = useState([]);
  const [datosNegocio, setDatosNegocio] = useState(null);
  const [turnos, setTurnos] = useState([]);

  const [turnoActivo, setTurnoActivo] = useState(null);

  // --- Sucursales ---
  const [sucursales, setSucursales] = useState([]);
  const [sucursalActual, setSucursalActual] = useState(null);
  const [isMigrating, setIsMigrating] = useState(false);

  // --- UI edición ---
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingClient, setEditingClient] = useState(null);
  const [vendedorActivoId, setVendedorActivoId] = useState(null);
  const [selectedClientId, setSelectedClientId] = useState(null); // <--- Nuevo estado persistente

  // --- TEMA ---
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') || 'dark';
    }
    return 'dark';
  });

  // ---- AUTH & SUCURSALES ----
  useEffect(() => {
    setIsLoadingData(true);
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const tokenResult = await user.getIdTokenResult();
        setIsAdmin(tokenResult.claims.admin === true);
        setCurrentUser(user); // Store full user object
        setIsLoggedIn(true);

        // --- Lógica de Sucursales y Migración ---
        try {
          const sucursalesExistentes = await fsService.getSucursales(user.uid);

          if (sucursalesExistentes.length === 0) {
            // MIGRACIÓN INICIAL: No hay sucursales, creamos la Principal
            setIsMigrating(true);
            console.log('Iniciando migración a sistema multisucursal...');
            const nuevaSucursalId = await fsService.addSucursal(user.uid, {
              nombre: 'Sucursal Principal',
              direccion: 'Dirección Principal',
              esPrincipal: true,
            });

            if (nuevaSucursalId) {
              // Asignar datos huérfanos a esta nueva sucursal
              const coleccionesAMigrar = [
                'productos',
                'ventas',
                'pedidos',
                'turnos',
                'egresos',
                'ingresos_manuales',
                'notas_cd',
                // 'clientes' y 'proveedores' podrían ser compartidos, pero por consistencia inicial los migramos
                'clientes',
                'proveedores',
                'vendedores',
              ];

              for (const coll of coleccionesAMigrar) {
                await fsService.migrarDocumentosASucursal(
                  user.uid,
                  nuevaSucursalId,
                  coll,
                );
              }

              // Recargar sucursales y setear actual
              const sucursalesActualizadas = await fsService.getSucursales(
                user.uid,
              );
              setSucursales(sucursalesActualizadas);
              setSucursalActual(
                sucursalesActualizadas.find((s) => s.id === nuevaSucursalId),
              );
              mostrarMensaje?.(
                'Sistema actualizado a Multisucursal. Se ha creado tu Sucursal Principal.',
                'success',
              );
            }
            setIsMigrating(false);
          } else {
            // Ya existen sucursales, seleccionamos la primera por defecto o la guardada
            setSucursales(sucursalesExistentes);
            // Podríamos guardar la última usada en localStorage, por ahora usamos la primera
            setSucursalActual(sucursalesExistentes[0]);
          }
        } catch (error) {
          console.error('Error cargando sucursales:', error);
          mostrarMensaje?.(
            'Error al cargar la configuración de sucursales.',
            'error',
          );
        }
      } else {
        setCurrentUser(null);
        setIsLoggedIn(false);
        setIsAdmin(false);
        setProductos([]);
        setClientes([]);
        setVendedores([]);
        setCartItems([]);
        setVentas([]);
        setEgresos([]);
        setIngresosManuales([]);
        setNotasCD([]);
        setDatosNegocio(null);
        setSucursales([]);
        setSucursalActual(null);
      }
      setIsLoadingData(false);
      setIsLoading(false);
    });
    return () => unsub();
  }, []);

  // --- Efecto de Tema ---
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // --- Lógica de Planes ---
  const plan = datosNegocio?.plan || 'basic'; // Default a basic si no hay dato
  const isPremium = plan === 'premium';

  // Admin tiene acceso total siempre
  const canAccessAfip = isPremium || isAdmin;
  const canAccessMultisucursal = isPremium || isAdmin;
  const canAccessDailyReport = isPremium || isAdmin;
  const canAccessAI = isPremium || isAdmin;

  // --- Persistencia por Sucursal (Carrito, Vendedor, Turno, Cliente) ---
  const prevSucursalRef = useRef(null);

  // 1. Cargar datos al cambiar de sucursal
  useEffect(() => {
    if (sucursalActual?.id) {
      const sucursalId = sucursalActual.id;
      console.log(`[Context] Cargando estado para sucursal ${sucursalId}`);

      // --- CARRITO ---
      const cartKey = `cart_${sucursalId}`;
      const savedCart = localStorage.getItem(cartKey);
      if (savedCart) {
        try {
          setCartItems(JSON.parse(savedCart));
        } catch (e) {
          console.error('Error loading cart:', e);
          setCartItems([]);
        }
      } else {
        setCartItems([]);
      }

      // --- VENDEDOR ---
      const sellerKey = `seller_${sucursalId}`;
      const savedSeller = localStorage.getItem(sellerKey);
      setVendedorActivoId(savedSeller || null);

      // --- TURNO (Estado local) ---
      // Nota: Esto solo guarda el ID/Estado en memoria local.
      // La validación real de si el turno está abierto debe venir de Firestore.
      const shiftKey = `shift_${sucursalId}`;
      const savedShift = localStorage.getItem(shiftKey);
      if (savedShift) {
        try {
          setTurnoActivo(JSON.parse(savedShift));
        } catch (e) {
          console.error('Error loading shift:', e);
          setTurnoActivo(null);
        }
      } else {
        setTurnoActivo(null);
      }

      // --- CLIENTE SELECCIONADO ---
      const clientKey = `client_${sucursalId}`;
      const savedClient = localStorage.getItem(clientKey);
      setSelectedClientId(savedClient || null);
    }
  }, [sucursalActual?.id]);

  // 2. Guardar datos al cambiar (Solo si no estamos cambiando de sucursal)
  useEffect(() => {
    if (!sucursalActual?.id) return;

    // Si acabamos de cambiar de sucursal, actualizamos la ref y NO guardamos
    // (para evitar sobrescribir los datos de la nueva sucursal con los de la vieja)
    if (prevSucursalRef.current !== sucursalActual.id) {
      prevSucursalRef.current = sucursalActual.id;
      return;
    }

    const sucursalId = sucursalActual.id;

    // Guardar Carrito
    localStorage.setItem(`cart_${sucursalId}`, JSON.stringify(cartItems));

    // Guardar Vendedor
    if (vendedorActivoId) {
      localStorage.setItem(`seller_${sucursalId}`, vendedorActivoId);
    } else {
      localStorage.removeItem(`seller_${sucursalId}`);
    }

    // Guardar Turno
    if (turnoActivo) {
      localStorage.setItem(`shift_${sucursalId}`, JSON.stringify(turnoActivo));
    } else {
      localStorage.removeItem(`shift_${sucursalId}`);
    }

    // Guardar Cliente
    if (selectedClientId) {
      localStorage.setItem(`client_${sucursalId}`, selectedClientId);
    } else {
      localStorage.removeItem(`client_${sucursalId}`);
    }
  }, [
    cartItems,
    vendedorActivoId,
    turnoActivo,
    selectedClientId,
    sucursalActual?.id,
  ]);

  // ---- Listeners en tiempo real (CON FILTRO DE SUCURSAL) ----
  useEffect(() => {
    if (!currentUser?.uid || !sucursalActual?.id) return;

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
      { name: 'presupuestos', setter: setPresupuestos },
      { name: 'turnos', setter: setTurnos },
    ];

    const unsubscribes = collectionsToListen.map(({ name, setter }) => {
      let q = query(
        collection(db, name),
        where('userId', '==', currentUser.uid),
      );

      // Aplicamos filtro de sucursal
      // Nota: Si decidimos que clientes/proveedores son globales, excluirlos aquí.
      // Por ahora, todo es por sucursal según el plan.
      q = query(q, where('sucursalId', '==', sucursalActual.id));

      return onSnapshot(
        q,
        (querySnapshot) => {
          const data = querySnapshot.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .sort((a, b) => {
              const ta = a?.timestamp?.toDate
                ? a.timestamp.toDate().getTime()
                : new Date(a.timestamp || 0).getTime();
              const tb = b?.timestamp?.toDate
                ? b.timestamp.toDate().getTime()
                : new Date(b.timestamp || 0).getTime();
              return tb - ta;
            });
          setter(ensureArray(data));
        },
        (error) => {
          console.error(`Error escuchando la colección ${name}:`, error);
          // Omitimos mostrar error en UI para no saturar si es permiso denegado temporal
        },
      );
    });

    // Listener de Datos de Negocio (POR SUCURSAL)
    // Primero intentamos inicializar si no existe
    const initSettings = async () => {
      await fsService.initializeBranchSettings(
        currentUser.uid,
        sucursalActual.id,
      );
    };
    initSettings();

    // AHORA ESCUCHAMOS EL DOCUMENTO DE LA SUCURSAL
    const unsubDatosNegocio = onSnapshot(
      doc(db, 'sucursales', sucursalActual.id),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          // Si tiene configuracion, la usamos. Si no, podríamos necesitar cargar la global.
          // Pero initializeBranchSettings ya debería haber copiado la global aquí.
          if (data.configuracion) {
            setDatosNegocio({ id: sucursalActual.id, ...data.configuracion });
          } else {
            // Fallback: Si por alguna razón no tiene config, podríamos intentar leer la global
            // Pero para simplificar y evitar loops, esperamos a que initialize haga su trabajo.
            // Opcional: setDatosNegocio(null) o mantener el anterior.
          }
        }
      },
      (error) => {
        console.error('Error escuchando datos del negocio (sucursal):', error);
      },
    );
    unsubscribes.push(unsubDatosNegocio);

    return () => {
      unsubscribes.forEach((u) => u && u());
    };
  }, [currentUser, sucursalActual]); // Dependencia clave: sucursalActual

  // ---- Handlers ----
  // frontend/src/context/AppContext.jsx
  const handleBackupData = async () => {
    setIsLoading(true); // Usaremos el estado de carga que ya tienes
    mostrarMensaje(
      'Generando backup... Esto puede tardar unos segundos.',
      'info',
    );
    try {
      const functions = getFunctions();
      const backupUserData = httpsCallable(functions, 'backupUserData');
      const result = await backupUserData();

      // Convertimos el objeto de datos a un string en formato JSON
      const jsonString = JSON.stringify(result.data, null, 2);
      // Creamos un archivo "blob" en la memoria del navegador
      const blob = new Blob([jsonString], { type: 'application/json' });
      // Creamos una URL temporal para ese archivo
      const url = URL.createObjectURL(blob);

      // Creamos un enlace invisible, le hacemos clic para iniciar la descarga y luego lo eliminamos
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-khaleesi-system-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url); // Liberamos la memoria

      mostrarMensaje('Backup descargado exitosamente.', 'success');
    } catch (error) {
      console.error('Error al generar el backup:', error);
      mostrarMensaje(
        'No se pudo generar el backup. Intenta de nuevo.',
        'error',
      );
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
      mostrarMensaje('Notificación enviada con éxito.', 'success');
      return true; // Devuelve true si tuvo éxito
    } catch (error) {
      console.error('Error al notificar el pago:', error);
      mostrarMensaje(
        'No se pudo enviar la notificación. Intenta de nuevo.',
        'error',
      );
      return false; // Devuelve false si falló
    } finally {
      setIsLoading(false);
    }
  };
  const handleLogout = async () => {
    await signOut(auth);
  };

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
      precioFinalConDescuento =
        precioTotalItem - (precioTotalItem * descuentoNum) / 100;

      newItem = {
        ...producto,
        cartId: isByWeight ? generateLocalId('cart_') : producto.id,
        cantidad: cantidad,
        precioOriginal: precioBase,
        descuentoPorcentaje: descuentoNum,
        precioFinal: precioFinalConDescuento,
      };
    }

    // La lógica para agrupar items solo se aplica si NO es por peso y NO es un ticket
    const itemExistente =
      !isByWeight && !isScaleTicket
        ? cartItems.find(
            (i) =>
              i.id === producto.id && i.descuentoPorcentaje === descuentoNum,
          )
        : null;

    if (itemExistente) {
      setCartItems((prev) =>
        prev.map((i) =>
          i.cartId === producto.id && i.descuentoPorcentaje === descuentoNum
            ? {
                ...i,
                cantidad: i.cantidad + cantidad,
                precioFinal: i.precioFinal + precioFinalConDescuento,
              }
            : i,
        ),
      );
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
    if (!sucursalActual) {
      mostrarMensaje?.('No hay una sucursal seleccionada.', 'error');
      return;
    }
    const productDataFirebase = {
      ...productDataFromForm,
      userId: currentUserId,
      sucursalId: sucursalActual.id, // Asignar sucursal
    };
    const isEditing = isValidFirestoreId(productDataFromForm.id);

    // Validación de código de barras duplicado
    if (productDataFirebase.codigoBarras) {
      const barcodeToCheck = String(productDataFirebase.codigoBarras).trim();
      if (barcodeToCheck) {
        const existsBarcode = productos.find((p) => {
          if (!p.codigoBarras) return false;
          const currentBarcode = String(p.codigoBarras).trim();

          // Si tiene ID y coincide, es el mismo producto -> NO es duplicado
          if (productDataFromForm.id && p.id === productDataFromForm.id)
            return false;

          return currentBarcode === barcodeToCheck;
        });

        if (existsBarcode) {
          mostrarMensaje?.(
            `Código de barras "${barcodeToCheck}" ya asignado a "${existsBarcode.nombre}".`,
            'warning',
          );
          return;
        }
      }
    }
    setIsLoadingData(true);
    if (isEditing) {
      const { id, ...dataToUpdate } = productDataFirebase;
      const ok = await fsService.updateProducto(id, dataToUpdate);
      mostrarMensaje?.(
        ok ? 'Producto actualizado.' : 'Error al actualizar producto.',
        ok ? 'success' : 'error',
      );
    } else {
      const { id, ...dataToAdd } = productDataFirebase;
      const newId = await fsService.addProducto(
        currentUserId,
        dataToAdd,
        sucursalActual.id,
      );
      mostrarMensaje?.(
        isValidFirestoreId(newId)
          ? 'Producto agregado.'
          : 'Error al agregar producto.',
        isValidFirestoreId(newId) ? 'success' : 'error',
      );
    }
    setIsLoadingData(false);
    setEditingProduct(null);
  };
  const handleEditProduct = (product) => setEditingProduct(product);
  const handleCancelEditProduct = () => setEditingProduct(null);
  const handleDeleteProduct = async (productId, productName) => {
    if (!isValidFirestoreId(productId)) {
      mostrarMensaje?.('ID de producto inválido.', 'error');
      return;
    }
    if (
      await confirmarAccion?.(
        '¿Eliminar Producto?',
        `¿Seguro de eliminar "${productName}"?`,
        'warning',
        'Sí, eliminar',
      )
    ) {
      setIsLoadingData(true);
      const ok = await fsService.deleteProducto(productId);
      mostrarMensaje?.(
        ok
          ? `Producto "${productName}" eliminado.`
          : 'Error al eliminar producto.',
        ok ? 'success' : 'error',
      );
      setIsLoadingData(false);
      if (editingProduct?.id === productId) setEditingProduct(null);
    }
  };

  const handleBulkPriceUpdate = async (percentage) => {
    const percentageNum = parseFloat(percentage);
    if (isNaN(percentageNum) || percentageNum <= 0) {
      mostrarMensaje(
        'Por favor, ingresa un porcentaje válido y mayor a cero.',
        'warning',
      );
      return;
    }

    const confirm = await confirmarAccion?.(
      '¿Actualizar Precios?',
      `Estás a punto de aumentar el precio de TODOS tus ${productos.length} productos en un ${percentageNum}%. Esta acción no se puede deshacer. ¿Continuar?`,
      'warning',
      'Sí, actualizar todos',
    );

    if (confirm) {
      setIsLoadingData(true);

      const productsToUpdate = productos.map((p) => {
        const currentPrice = p.precio || 0;
        const newPrice = currentPrice * (1 + percentageNum / 100);
        return {
          id: p.id,
          newPrice: parseFloat(newPrice.toFixed(2)), // Redondeamos a 2 decimales
        };
      });

      const ok = await fsService.bulkUpdatePrices(productsToUpdate);

      mostrarMensaje?.(
        ok
          ? 'Precios actualizados con éxito.'
          : 'Error al actualizar los precios.',
        ok ? 'success' : 'error',
      );
      setIsLoadingData(false);
    }
  };

  // Clientes
  const handleSaveClient = async (clientDataFromForm) => {
    if (!sucursalActual) return;
    const clientDataFirebase = {
      ...clientDataFromForm,
      userId: currentUserId,
      sucursalId: sucursalActual.id,
    };
    const isEditing = isValidFirestoreId(clientDataFromForm.id);
    setIsLoadingData(true);
    if (isEditing) {
      const { id, ...dataToUpdate } = clientDataFirebase;
      const ok = await fsService.updateCliente(id, dataToUpdate);
      mostrarMensaje?.(
        ok ? 'Cliente actualizado.' : 'Error al actualizar cliente.',
        ok ? 'success' : 'error',
      );
    } else {
      const { id, ...dataToAdd } = clientDataFirebase;
      const newId = await fsService.addCliente(
        currentUserId,
        dataToAdd,
        sucursalActual.id,
      );
      mostrarMensaje?.(
        isValidFirestoreId(newId)
          ? 'Cliente agregado.'
          : 'Error al agregar cliente.',
        isValidFirestoreId(newId) ? 'success' : 'error',
      );
    }
    setIsLoadingData(false);
    setEditingClient(null);
  };
  const handleEditClient = (client) => setEditingClient(client);
  const handleCancelEditClient = () => setEditingClient(null);
  const handleDeleteClient = async (clientId, clientName) => {
    if (!isValidFirestoreId(clientId)) {
      mostrarMensaje?.('ID de cliente inválido.', 'error');
      return;
    }
    if (
      await confirmarAccion?.(
        '¿Eliminar Cliente?',
        `¿Seguro de eliminar a "${clientName}"?`,
        'warning',
        'Sí, eliminar',
      )
    ) {
      setIsLoadingData(true);
      const ok = await fsService.deleteCliente(clientId);
      mostrarMensaje?.(
        ok
          ? `Cliente "${clientName}" eliminado.`
          : 'Error al eliminar cliente.',
        ok ? 'success' : 'error',
      );
      setIsLoadingData(false);
      if (editingClient?.id === clientId) setEditingClient(null);
    }
  };

  // Vendedores
  const handleSaveVendedor = async (vendedorData, vendedorId = null) => {
    if (!sucursalActual) return;
    setIsLoadingData(true);
    if (isValidFirestoreId(vendedorId)) {
      const ok = await fsService.updateVendedor(vendedorId, vendedorData);
      mostrarMensaje?.(
        ok ? 'Vendedor actualizado.' : 'Error al actualizar vendedor.',
        ok ? 'success' : 'error',
      );
    } else {
      const newId = await fsService.addVendedor(
        currentUserId,
        vendedorData,
        sucursalActual.id,
      );
      mostrarMensaje?.(
        isValidFirestoreId(newId)
          ? 'Vendedor agregado.'
          : 'Error al agregar vendedor.',
        isValidFirestoreId(newId) ? 'success' : 'error',
      );
    }
    setIsLoadingData(false);
  };
  const handleDeleteVendedor = async (vendedorId, vendedorName) => {
    if (!isValidFirestoreId(vendedorId)) return;
    if (
      await confirmarAccion?.(
        '¿Eliminar Vendedor?',
        `¿Seguro de eliminar a "${vendedorName}"?`,
        'warning',
        'Sí, eliminar',
      )
    ) {
      setIsLoadingData(true);
      const ok = await fsService.deleteDocument('vendedores', vendedorId);
      mostrarMensaje?.(
        ok
          ? `Vendedor "${vendedorName}" eliminado.`
          : 'Error al eliminar vendedor.',
        ok ? 'success' : 'error',
      );
      setIsLoadingData(false);
    }
  };

  // Proveedores
  const handleSaveProveedor = async (proveedorData, proveedorId = null) => {
    if (!sucursalActual) return;
    setIsLoadingData(true);
    // Ya no pasamos el userId como primer argumento, ya viene en proveedorData desde el form
    // y la función de servicio se encarga de agregarlo.
    if (isValidFirestoreId(proveedorId)) {
      // Al actualizar, no necesitamos enviar el userId de nuevo si no cambia
      const { userId, ...dataToUpdate } = proveedorData;
      const ok = await fsService.updateProveedor(proveedorId, dataToUpdate);
      mostrarMensaje?.(
        ok ? 'Proveedor actualizado.' : 'Error al actualizar proveedor.',
        ok ? 'success' : 'error',
      );
    } else {
      const newId = await fsService.addProveedor(
        currentUserId,
        proveedorData,
        sucursalActual.id,
      );
      mostrarMensaje?.(
        isValidFirestoreId(newId)
          ? 'Proveedor agregado.'
          : 'Error al agregar proveedor.',
        isValidFirestoreId(newId) ? 'success' : 'error',
      );
    }
    setIsLoadingData(false);
  };

  const handleDeleteProveedor = async (proveedorId, proveedorName) => {
    if (!isValidFirestoreId(proveedorId)) return;
    if (
      await confirmarAccion?.(
        '¿Eliminar Proveedor?',
        `¿Seguro de eliminar a "${proveedorName}"?`,
        'warning',
        'Sí, eliminar',
      )
    ) {
      setIsLoadingData(true);
      // Usamos la función genérica 'deleteDocument' que apunta a la colección correcta
      const ok = await fsService.deleteDocument('proveedores', proveedorId);
      mostrarMensaje?.(
        ok
          ? `Proveedor "${proveedorName}" eliminado.`
          : 'Error al eliminar proveedor.',
        ok ? 'success' : 'error',
      );
      setIsLoadingData(false);
    }
  };

  // Pedidos a Proveedores
  const handleSavePedido = async (pedidoData) => {
    if (!sucursalActual) return false;
    setIsLoadingData(true);
    const newId = await fsService.addPedido(
      currentUserId,
      pedidoData,
      sucursalActual.id,
    );
    const success = isValidFirestoreId(newId);
    mostrarMensaje?.(
      success ? 'Pedido creado con éxito.' : 'Error al crear el pedido.',
      success ? 'success' : 'error',
    );
    setIsLoadingData(false);
    return success; // Devolvemos true o false para que el formulario sepa si debe cerrarse
  };

  const handleUpdatePedidoEstado = async (pedidoId, nuevoEstado) => {
    setIsLoadingData(true);
    const ok = await fsService.updatePedido(pedidoId, { estado: nuevoEstado });
    mostrarMensaje?.(
      ok ? 'Estado del pedido actualizado.' : 'Error al actualizar estado.',
      ok ? 'success' : 'error',
    );
    setIsLoadingData(false);
  };

  const handleRecibirPedido = async (pedido) => {
    const confirm = await confirmarAccion?.(
      '¿Recibir Pedido?',
      'Esto marcará el pedido como "recibido" y sumará las cantidades al stock de tus productos. ¿Estás seguro?',
      'info',
      'Sí, recibir',
    );

    if (confirm) {
      setIsLoadingData(true);
      const ok = await fsService.recibirPedidoYActualizarStock(pedido);
      mostrarMensaje?.(
        ok ? 'Pedido recibido y stock actualizado.' : 'Error en la operación.',
        ok ? 'success' : 'error',
      );
      setIsLoadingData(false);
    }
  };

  const handleCancelarPedido = async (pedido) => {
    const confirm = await confirmarAccion?.(
      '¿Cancelar Pedido?',
      `¿Estás seguro de que quieres cancelar el pedido a "${pedido.proveedorNombre}"? Esta acción no se puede deshacer.`,
      'warning',
      'Sí, cancelar',
    );

    if (confirm) {
      setIsLoadingData(true);
      const ok = await fsService.updatePedido(pedido.id, {
        estado: 'cancelado',
      });
      mostrarMensaje?.(
        ok ? 'Pedido cancelado.' : 'Error al cancelar el pedido.',
        ok ? 'success' : 'error',
      );
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

    const confirm = await confirmarAccion?.(
      title,
      confirmMessage,
      'warning',
      'Sí, eliminar',
    );

    if (confirm) {
      setIsLoadingData(true);
      // Llamamos a la nueva función que maneja la reversión del stock
      const ok = await fsService.deletePedidoAndRevertStock(pedido);

      mostrarMensaje?.(
        ok
          ? 'Pedido eliminado y stock actualizado.'
          : 'Error al eliminar el pedido.',
        ok ? 'success' : 'error',
      );
      setIsLoadingData(false);
      return ok; // Para que el modal se pueda cerrar
    }
    return false;
  };

  // Venta confirmada

  const handleSaleConfirmed = async (
    itemsInCart,
    total,
    cliente,
    pagos,
    tipoFactura,
    overrideVendedorId = null,
    afipData = null, // <--- Nuevo parámetro opcional
  ) => {
    // Usamos el override si existe, sino el del contexto (cajero)
    const vendedorIdFinal = overrideVendedorId || vendedorActivoId;

    if (!vendedorIdFinal) {
      mostrarMensaje?.(
        'Debe seleccionar un vendedor para registrar la venta.',
        'warning',
      );
      return;
    }
    const vendedorSeleccionado = vendedores.find(
      (v) => v.id === vendedorIdFinal,
    );
    if (!vendedorSeleccionado) {
      mostrarMensaje?.('El vendedor seleccionado no es válido.', 'error');
      return;
    }

    setIsLoadingData(true);
    const { fecha, hora } = obtenerFechaHoraActual();
    const clienteIdFinal =
      cliente && isValidFirestoreId(cliente.id)
        ? cliente.id
        : 'consumidor_final';

    const totalPagado = ensureArray(pagos).reduce(
      (sum, p) => sum + (Number(p?.monto) || 0),
      0,
    );
    const vueltoFinal = totalPagado > total ? totalPagado - total : 0;

    // --- LÓGICA MODIFICADA PARA AÑADIR EL COSTO ---
    const itemsWithCost = ensureArray(itemsInCart).map((item) => {
      // Buscamos el producto original en nuestra lista de productos para obtener su costo actual
      const originalProduct = productos.find((p) => p.id === item.id);
      return {
        id: item.id,
        nombre: item.nombre,
        cantidad: item.cantidad,
        precioOriginal: item.precioOriginal || item.precio,
        descuentoPorcentaje: item.descuentoPorcentaje || 0,
        precioFinal: item.precioFinal || item.precio,
        // Añadimos el costo. Si el producto no se encuentra o no tiene costo, guardamos 0.
        costo: originalProduct ? originalProduct.costo || 0 : 0,
      };
    });
    // ---------------------------------------------

    const newSaleData = {
      fecha,
      hora,
      clienteId: clienteIdFinal,
      clienteNombre: cliente?.nombre || 'Consumidor Final',
      items: itemsWithCost,
      total,
      pagos: ensureArray(pagos),
      vuelto: vueltoFinal,
      tipoFactura,
      afipData: afipData || null, // <--- Guardamos datos de AFIP si existen
      userId: currentUserId,
      vendedorId: vendedorSeleccionado.id,
      vendedorNombre: vendedorSeleccionado.nombre,
    };

    try {
      // 1. Primero, creamos la venta como siempre
      const ventaId = await fsService.addVenta(
        currentUserId,
        newSaleData,
        sucursalActual.id,
      );

      if (isValidFirestoreId(ventaId)) {
        // 2. Si la venta se guardó bien Y HAY UN TURNO ACTIVO...
        if (turnoActivo) {
          // ...asociamos el ID de esta venta a ese turno.
          await fsService.addSaleToShift(turnoActivo.id, ventaId);
        }

        // 3. Limpiamos el carrito y mostramos el mensaje de éxito
        setCartItems([]);
        await mostrarMensaje?.('Venta registrada con éxito.', 'success');
      }
    } catch (error) {
      await mostrarMensaje?.(
        error.message || 'Error al procesar la venta.',
        'error',
      );
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleAbrirTurno = async (vendedorId, montoInicial) => {
    const vendedor = vendedores.find((v) => v.id === vendedorId);
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
      ventasIds: [],
    };

    const newDocRef = await fsService.startShift(turnoData, sucursalActual.id);
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
    const success = await fsService.endShift(
      turnoActivo.id,
      turnoFinalizadoData,
    );

    if (success) {
      setTurnoActivo(null);
      mostrarMensaje('Turno cerrado exitosamente.', 'success');
    } else {
      mostrarMensaje('Error al cerrar el turno.', 'error');
    }
  };
  // Ingresos / Egresos manuales
  const handleRegistrarIngresoManual = async (descripcion, monto) => {
    if (!sucursalActual) return;
    const { fecha, hora } = obtenerFechaHoraActual();
    const newIngresoData = {
      fecha,
      hora,
      descripcion,
      monto: Number(monto),
      userId: currentUserId,
      sucursalId: sucursalActual.id,
    };
    const newId = await fsService.addIngresoManual(
      currentUserId,
      newIngresoData,
      sucursalActual.id,
    );
    if (isValidFirestoreId(newId)) {
      mostrarMensaje('Ingreso registrado.', 'success');
    } else {
      mostrarMensaje('Error al registrar ingreso.', 'error');
    }
  };

  const handleEliminarIngresoManual = async (id, descripcion) => {
    if (!isValidFirestoreId(id)) return;
    if (
      await confirmarAccion?.(
        '¿Eliminar Ingreso?',
        `¿Eliminar "${descripcion || 'este ingreso'}"?`,
        'warning',
        'Sí, eliminar',
      )
    ) {
      const ok = await fsService.deleteIngresoManual(id);
      mostrarMensaje?.(
        ok ? 'Ingreso eliminado.' : 'Error al eliminar ingreso.',
        ok ? 'success' : 'error',
      );
    }
  };

  const handleRegistrarEgreso = async (descripcion, monto) => {
    if (!sucursalActual) return;
    const { fecha, hora } = obtenerFechaHoraActual();
    const newEgresoData = {
      fecha,
      hora,
      descripcion,
      monto: Number(monto),
      userId: currentUserId,
      sucursalId: sucursalActual.id,
    };
    const newId = await fsService.addEgreso(
      currentUserId,
      newEgresoData,
      sucursalActual.id,
    );
    if (isValidFirestoreId(newId)) {
      mostrarMensaje('Egreso registrado.', 'success');
    } else {
      mostrarMensaje('Error al registrar egreso.', 'error');
    }
  };

  const handleEliminarEgreso = async (id, descripcion) => {
    if (!isValidFirestoreId(id)) return;
    if (
      await confirmarAccion?.(
        '¿Eliminar Egreso?',
        `¿Eliminar "${descripcion || 'este egreso'}"?`,
        'warning',
        'Sí, eliminar',
      )
    ) {
      const ok = await fsService.deleteEgreso(id);
      mostrarMensaje?.(
        ok ? 'Egreso eliminado.' : 'Error al eliminar egreso.',
        ok ? 'success' : 'error',
      );
    }
  };

  // Notas de Crédito / Manuales
  const handleCrearNotaCreditoSimple = async (notaData) => {
    if (!sucursalActual) return;
    const newId = await fsService.addNotaCDSimple(
      currentUserId,
      notaData,
      sucursalActual.id,
    );
    if (isValidFirestoreId(newId)) {
      mostrarMensaje('Nota registrada.', 'success');
      return true;
    } else {
      mostrarMensaje('Error al registrar nota.', 'error');
      return false;
    }
  };

  const handleCrearNotaManual = async (notaData) => {
    if (!sucursalActual) return;
    const { fecha, hora } = obtenerFechaHoraActual();
    // Extracción robusta del nombre del cliente
    let clienteNombre = 'Consumidor Final';
    if (notaData.cliente) {
      if (typeof notaData.cliente === 'string') {
        clienteNombre = notaData.cliente;
      } else if (typeof notaData.cliente === 'object') {
        clienteNombre =
          notaData.cliente.nombre ||
          notaData.cliente.razonSocial ||
          notaData.cliente.name ||
          'Cliente Sin Nombre';
      }
    }

    const notaCompleta = {
      ...notaData,
      fecha,
      hora,
      clienteNombre,
      clienteId: notaData.cliente?.id || null,
    };

    const newId = await fsService.addNotaManual(
      currentUserId,
      notaCompleta,
      sucursalActual.id,
    );
    if (isValidFirestoreId(newId)) {
      mostrarMensaje('Nota creada y stock ajustado (si aplica).', 'success');
      return true;
    } else {
      mostrarMensaje('Error al crear nota.', 'error');
      return false;
    }
  };

  const handleAnularVenta = async (ventaOriginal) => {
    if (!ventaOriginal || !isValidFirestoreId(ventaOriginal.id)) {
      mostrarMensaje?.('Venta inválida para anular.', 'error');
      return;
    }

    // Verificar si ya existe una nota de crédito para esta venta
    const yaExisteNota = notasCD.some(
      (nota) => nota.ventaOriginalId === ventaOriginal.id,
    );
    if (yaExisteNota) {
      return mostrarMensaje?.(
        'Ya existe una nota de crédito para esta venta.',
        'warning',
      );
    }

    if (
      await confirmarAccion?.(
        '¿Anular Venta?',
        'Se generará una Nota de Crédito y se restaurará el stock de los productos. ¿Continuar?',
        'warning',
        'Sí, anular venta',
      )
    ) {
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
      const success = await fsService.anularVentaConNotaCredito(
        currentUserId,
        ventaOriginal,
        notaData,
      );
      mostrarMensaje?.(
        success
          ? 'Venta anulada y Nota de Crédito generada.'
          : 'Error al anular la venta.',
        success ? 'success' : 'error',
      );
      setIsLoadingData(false);
    }
  };

  const handleEliminarNotaCD = async (notaId) => {
    if (!isValidFirestoreId(notaId)) {
      mostrarMensaje?.('ID de nota inválido.', 'error');
      return;
    }
    const notaAEliminar = notasCD.find((n) => n.id === notaId);
    if (!notaAEliminar) {
      mostrarMensaje?.('No se encontró la nota a eliminar.', 'error');
      return;
    }

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
      customClass: {
        popup: 'text-sm rounded-lg',
        title: 'text-zinc-100 !text-lg',
        htmlContainer: 'text-zinc-300',
      },
    });

    if (result.isConfirmed) {
      const success = await fsService.deleteDocument('notas_cd', notaId);
      mostrarMensaje?.(
        success ? 'Nota eliminada con éxito.' : 'Error al eliminar la nota.',
        success ? 'success' : 'error',
      );
    }
  };

  // Gestión de Sucursales
  const handleCreateSucursal = async (
    nombre,
    direccion,
    importarDePrincipal,
  ) => {
    if (!nombre.trim()) {
      mostrarMensaje('El nombre de la sucursal es obligatorio.', 'warning');
      return;
    }

    setIsLoadingData(true);
    try {
      const newSucursalData = {
        nombre,
        direccion,
        esPrincipal: false,
      };

      const newSucursalId = await fsService.addSucursal(
        currentUserId,
        newSucursalData,
      );

      if (newSucursalId) {
        if (importarDePrincipal) {
          const sucursalPrincipal =
            sucursales.find((s) => s.esPrincipal) || sucursales[0];

          if (sucursalPrincipal) {
            mostrarMensaje(
              'Creando sucursal e importando productos...',
              'info',
            );
            await fsService.importarProductosDesdeSucursal(
              currentUserId,
              sucursalPrincipal.id,
              newSucursalId,
            );
          }
        }

        const sucursalesActualizadas =
          await fsService.getSucursales(currentUserId);
        setSucursales(sucursalesActualizadas);

        const nuevaSucursal = sucursalesActualizadas.find(
          (s) => s.id === newSucursalId,
        );
        setSucursalActual(nuevaSucursal);

        mostrarMensaje('Sucursal creada con éxito.', 'success');
      } else {
        mostrarMensaje('Error al crear la sucursal.', 'error');
      }
    } catch (error) {
      console.error('Error creando sucursal:', error);
      mostrarMensaje('Ocurrió un error inesperado.', 'error');
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleChangeSucursal = (sucursalId) => {
    const sucursal = sucursales.find((s) => s.id === sucursalId);
    if (sucursal) {
      setSucursalActual(sucursal);
      mostrarMensaje(`Cambiado a sucursal: ${sucursal.nombre}`, 'success');
    }
  };

  const handleDeleteSucursal = async (sucursalId) => {
    if (sucursales.length <= 1) {
      mostrarMensaje('No puedes eliminar la única sucursal.', 'warning');
      return;
    }

    if (
      await confirmarAccion(
        '¿Eliminar Sucursal?',
        'Esta acción no se puede deshacer. Los datos asociados podrían perderse o quedar inaccesibles.',
        'warning',
        'Sí, eliminar',
      )
    ) {
      setIsLoadingData(true);
      const success = await fsService.deleteSucursal(sucursalId);
      if (success) {
        const nuevasSucursales = sucursales.filter((s) => s.id !== sucursalId);
        setSucursales(nuevasSucursales);
        if (sucursalActual.id === sucursalId) {
          setSucursalActual(nuevasSucursales[0]);
        }
        mostrarMensaje('Sucursal eliminada.', 'success');
      } else {
        mostrarMensaje('Error al eliminar sucursal.', 'error');
      }
      setIsLoadingData(false);
    }
  };

  const handleMigrarDatosHuérfanos = async () => {
    if (!sucursalActual) return;
    setIsLoadingData(true);
    mostrarMensaje('Buscando y migrando datos huérfanos...', 'info');

    const collections = [
      'productos',
      'clientes',
      'proveedores',
      'ventas',
      'pedidos',
      'egresos',
      'ingresos_manuales',
      'notas_cd',
      'presupuestos',
    ];

    for (const col of collections) {
      await fsService.migrarDocumentosASucursal(
        currentUserId,
        sucursalActual.id,
        col,
      );
    }

    mostrarMensaje('Proceso de recuperación finalizado.', 'success');
    setIsLoadingData(false);
  };

  const handleForzarRecuperacionTotal = async () => {
    if (!sucursalActual) return;

    if (
      await confirmarAccion(
        '¿Recuperación TOTAL de Emergencia?',
        'ATENCIÓN: Esto tomará TODOS tus datos (productos, ventas, etc.) de TODAS las sucursales y los asignará a ESTA sucursal actual. Úsalo solo si no ves tus datos.',
        'warning',
        'Sí, traer TODO aquí',
      )
    ) {
      setIsLoadingData(true);
      mostrarMensaje('Iniciando recuperación forzada total...', 'info');

      const collections = [
        'productos',
        'clientes',
        'proveedores',
        'ventas',
        'pedidos',
        'egresos',
        'ingresos_manuales',
        'notas_cd',
        'turnos',
      ];

      let totalRecuperado = 0;

      for (const col of collections) {
        const count = await fsService.forceAssignAllDataToSucursal(
          currentUserId,
          sucursalActual.id,
          col,
        );
        totalRecuperado += count;
      }

      mostrarMensaje(
        `Recuperación completada. ${totalRecuperado} elementos reasignados.`,
        'success',
      );
      setIsLoadingData(false);

      // Recargar página para asegurar que todo se vea
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    }
  };

  // --- NUEVO: Eliminar selección masiva ---
  const handleDeleteSelected = async (productIds) => {
    if (!productIds || productIds.size === 0) return;

    const confirm = await confirmarAccion(
      '¿Estás seguro?',
      `Se eliminarán ${productIds.size} productos seleccionados.`,
    );
    if (!confirm) return;

    setIsLoadingData(true);
    const idsArray = Array.from(productIds);
    const success = await fsService.deleteProducts(idsArray);

    if (success) {
      mostrarMensaje('Productos eliminados correctamente.', 'success');
      // No necesitamos actualizar estado manual si el listener funciona,
      // pero para feedback inmediato podríamos filtrar.
      // El listener lo hará.
    } else {
      mostrarMensaje('Error al eliminar productos.', 'error');
    }
    setIsLoadingData(false);
    return success;
  };

  // --- NUEVO: Eliminar duplicados ---
  const handleDeleteDuplicates = async () => {
    // 1. Agrupar por código de barras
    const grupos = {};
    let duplicadosCount = 0;
    let productosAEliminar = [];

    productos.forEach((p) => {
      if (p.codigoBarras) {
        const codigo = String(p.codigoBarras).trim();
        if (!grupos[codigo]) grupos[codigo] = [];
        grupos[codigo].push(p);
      }
    });

    // 2. Identificar duplicados
    Object.values(grupos).forEach((grupo) => {
      if (grupo.length > 1) {
        // Ordenar: Mayor stock primero, luego fecha actualización más reciente
        grupo.sort((a, b) => {
          if (b.stock !== a.stock) return b.stock - a.stock;
          // Si stock es igual, el más nuevo (timestamp)
          const timeA = a.lastUpdated?.seconds || 0;
          const timeB = b.lastUpdated?.seconds || 0;
          return timeB - timeA;
        });

        // El primero (índice 0) es el "ganador", el resto se borran
        const [ganador, ...perdedores] = grupo;
        perdedores.forEach((p) => productosAEliminar.push(p.id));
        duplicadosCount += perdedores.length;
      }
    });

    if (duplicadosCount === 0) {
      mostrarMensaje('No se encontraron productos duplicados.', 'info');
      return;
    }

    const confirm = await confirmarAccion(
      'Eliminar Duplicados',
      `Se encontraron ${duplicadosCount} productos duplicados (mismo código de barras). Se conservará el que tenga mayor stock. ¿Deseas eliminarlos?`,
    );

    if (!confirm) return;

    setIsLoadingData(true);
    const success = await fsService.deleteProducts(productosAEliminar);
    if (success) {
      mostrarMensaje(
        `Se eliminaron ${duplicadosCount} productos duplicados.`,
        'success',
      );
    } else {
      mostrarMensaje('Error al eliminar duplicados.', 'error');
    }
    setIsLoadingData(false);
  };

  const handleImportarProductos = async (targetSucursalId) => {
    if (!targetSucursalId) return;

    // Buscar sucursal principal
    const sucursalPrincipal =
      sucursales.find((s) => s.esPrincipal) || sucursales[0];
    if (!sucursalPrincipal) {
      mostrarMensaje(
        'No se encontró una sucursal principal para importar.',
        'error',
      );
      return;
    }

    if (sucursalPrincipal.id === targetSucursalId) {
      mostrarMensaje(
        'No puedes importar a la misma sucursal principal.',
        'warning',
      );
      return;
    }

    if (
      await confirmarAccion(
        '¿Importar Productos?',
        `Se copiarán todos los productos de "${sucursalPrincipal.nombre}" a esta sucursal con STOCK 0.`,
        'info',
        'Sí, importar',
      )
    ) {
      setIsLoadingData(true);
      mostrarMensaje('Importando productos...', 'info');

      const success = await fsService.importarProductosDesdeSucursal(
        currentUserId,
        sucursalPrincipal.id,
        targetSucursalId,
      );

      if (success) {
        mostrarMensaje('Productos importados con éxito.', 'success');
        // Si estamos en la sucursal destino, recargar productos podría ser necesario
        // pero el listener de firestore debería encargarse.
      } else {
        mostrarMensaje('Error al importar productos.', 'error');
      }
      setIsLoadingData(false);
    }
  };

  const handleGuardarDatosNegocio = async (datosActualizados) => {
    const ok = await fsService.saveDatosNegocio(
      currentUserId,
      datosActualizados,
      sucursalActual?.id, // Pasamos la sucursal actual
    );
    if (ok) {
      mostrarMensaje('Datos del negocio actualizados.', 'success');
      setDatosNegocio((prev) => ({ ...prev, ...datosActualizados }));
    } else {
      mostrarMensaje('Error al actualizar datos.', 'error');
    }
  };

  const handleEliminarVenta = async (ventaId) => {
    if (!isValidFirestoreId(ventaId)) {
      mostrarMensaje?.('ID de venta inválido.', 'error');
      return;
    }
    if (
      await confirmarAccion?.(
        '¿Eliminar Venta?',
        'Esto restaurará el stock. ¿Continuar?',
        'warning',
        'Sí, eliminar',
      )
    ) {
      const ok = await fsService.deleteVentaAndRestoreStock(
        currentUserId,
        ventaId,
      );
      mostrarMensaje?.(
        ok
          ? 'Venta eliminada y stock restaurado.'
          : 'Error al eliminar la venta.',
        ok ? 'success' : 'error',
      );
    }
  };

  // --- PRESUPUESTOS ---
  const handleSaveBudget = async (itemsInCart, total, cliente) => {
    if (!itemsInCart || itemsInCart.length === 0) {
      mostrarMensaje('El carrito está vacío.', 'warning');
      return;
    }
    if (!sucursalActual) return;

    setIsLoadingData(true);
    const { fecha, hora } = obtenerFechaHoraActual();
    const clienteIdFinal =
      cliente && isValidFirestoreId(cliente.id)
        ? cliente.id
        : 'consumidor_final';

    const presupuestoData = {
      fecha,
      hora,
      clienteId: clienteIdFinal,
      clienteNombre: cliente?.nombre || 'Consumidor Final',
      items: itemsInCart,
      total,
      userId: currentUserId,
      sucursalId: sucursalActual.id,
    };

    const newId = await fsService.addPresupuesto(
      currentUserId,
      presupuestoData,
      sucursalActual.id,
    );

    if (isValidFirestoreId(newId)) {
      setCartItems([]); // Limpiar carrito
      mostrarMensaje('Presupuesto guardado con éxito.', 'success');
    } else {
      mostrarMensaje('Error al guardar el presupuesto.', 'error');
    }
    setIsLoadingData(false);
  };

  const handleDeleteBudget = async (presupuestoId) => {
    if (!isValidFirestoreId(presupuestoId)) return;
    if (
      await confirmarAccion?.(
        '¿Eliminar Presupuesto?',
        'Esta acción no se puede deshacer.',
        'warning',
        'Sí, eliminar',
      )
    ) {
      setIsLoadingData(true);
      const ok = await fsService.deletePresupuesto(presupuestoId);
      mostrarMensaje?.(
        ok ? 'Presupuesto eliminado.' : 'Error al eliminar.',
        ok ? 'success' : 'error',
      );
      setIsLoadingData(false);
    }
  };

  const value = {
    // Auth & Estado
    isLoggedIn,
    currentUser, // Now passing the full object
    isAdmin,
    isLoading,
    isLoadingData,
    // Datos
    productos,
    clientes,
    vendedores,
    proveedores,
    pedidos,
    cartItems,
    ventas,
    egresos,
    ingresosManuales,
    notasCD,
    presupuestos,
    datosNegocio,
    turnos,
    turnoActivo,
    // Sucursales
    sucursales,
    sucursalActual,
    isMigrating,
    handleCreateSucursal,
    handleChangeSucursal,
    handleDeleteSucursal,
    handleMigrarDatosHuérfanos,
    handleForzarRecuperacionTotal,
    handleImportarProductos,
    // UI Edición
    editingProduct,
    editingClient,
    vendedorActivoId,
    setVendedorActivoId,
    selectedClientId, // <--- Exportamos
    setSelectedClientId, // <--- Exportamos
    setTurnoActivo,
    // Handlers Productos
    handleSaveProduct,
    handleEditProduct,
    handleCancelEditProduct,
    handleDeleteProduct,
    handleBulkPriceUpdate,
    // Handlers Clientes
    handleSaveClient,
    handleEditClient,
    handleCancelEditClient,
    handleDeleteClient,
    // Handlers Vendedores
    handleSaveVendedor,
    handleDeleteVendedor,
    // Handlers Proveedores
    handleSaveProveedor,
    handleDeleteProveedor,
    // Handlers Pedidos
    handleSavePedido,
    handleUpdatePedidoEstado,
    handleRecibirPedido,
    handleCancelarPedido,
    handleDeletePedido,
    // Handlers Ventas / Carrito
    handleAddToCart,
    handleAddManualItemToCart,
    setCartItems,
    handleSaleConfirmed,
    handleEliminarVenta,
    handleSaveBudget,
    handleDeleteBudget,
    // Handlers Turnos
    handleAbrirTurno,
    handleCerrarTurno,
    // Handlers Ingresos/Egresos/Notas
    handleRegistrarIngresoManual,
    handleEliminarIngresoManual,
    handleRegistrarEgreso,
    handleEliminarEgreso,
    handleCrearNotaCreditoSimple,
    handleCrearNotaManual,
    handleEliminarNotaCD,
    handleAnularVenta,
    // Utils
    handleBackupData,
    handleNotifyPayment,
    handleLogout,
    handleGuardarDatosNegocio,
    // UI Utils
    mostrarMensaje,
    handleDeleteSelected,
    handleDeleteDuplicates,
    confirmarAccion,
    // Theme
    theme,
    toggleTheme,
    // Plan & Permissions
    plan,
    isPremium,
    canAccessAfip,
    canAccessMultisucursal,
    canAccessDailyReport,
    canAccessAI,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export default AppProvider;
