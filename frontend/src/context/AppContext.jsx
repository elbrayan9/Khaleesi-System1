// src/context/AppContext.jsx
import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useRef,
} from 'react';
import { db, auth, asegurarAppCheck, MARCA_SESION } from '../firebaseConfig';
import {
  collection,
  onSnapshot,
  query,
  where,
  doc,
  increment,
  deleteDoc,
  getDocs,
} from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import * as fsService from '../services/firestoreService';
import { obtenerFechaHoraActual, formatCurrency } from '../utils/helpers';
import { buscarDuplicados, resumenDuplicados } from '../utils/duplicados.js';
import { getFunctions, httpsCallable } from 'firebase/functions';
import Swal from '../utils/swalTheme.js'; // Swal con el tema del sistema
import { sonarEscaneo } from '../utils/sonido.js';

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
  const [currentUser, setCurrentUser] = useState(null); // Changed from currentUser?.uid to currentUser object
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // --- Datos ---
  const [productos, setProductos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [vendedores, setVendedores] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [pedidosOnline, setPedidosOnline] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [egresos, setEgresos] = useState([]);
  const [ingresosManuales, setIngresosManuales] = useState([]);
  const [notasCD, setNotasCD] = useState([]);
  const [presupuestos, setPresupuestos] = useState([]);
  const [movimientosCC, setMovimientosCC] = useState([]); // cuenta corriente
  const [datosNegocio, setDatosNegocio] = useState(null);
  const [turnos, setTurnos] = useState([]);

  const [turnoActivo, setTurnoActivo] = useState(null);

  // --- Sucursales ---
  const [sucursales, setSucursales] = useState([]);
  const [sucursalActual, setSucursalActual] = useState(null);
  const [isMigrating, setIsMigrating] = useState(false);

  // --- Alertas ---
  const [alertasBorrados, setAlertasBorrados] = useState([]);

  // --- UI edición ---
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingClient, setEditingClient] = useState(null);
  const [vendedorActivoId, setVendedorActivoId] = useState(null);
  const [selectedClientId, setSelectedClientId] = useState(null); // <--- Nuevo estado persistente

  // --- Seguridad PIN ---
  const [isSessionUnlocked, setIsSessionUnlocked] = useState(false);

  useEffect(() => {
    // Si acaba de hacer login manual, entra con el PIN bypass
    if (sessionStorage.getItem('freshLogin') === 'true') {
      setIsSessionUnlocked(true);
      sessionStorage.removeItem('freshLogin');
    }
  }, []);

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
        // Hay sesión: App Check tiene que estar en marcha aunque la persona
        // haya entrado por la landing, donde su arranque espera a la primera
        // interacción. Auth y Storage lo exigen.
        //
        // Va protegido a propósito: es un complemento, y si fallara no puede
        // llevarse puesto el inicio de sesión. Sin esto, cualquier tropiezo
        // suyo cortaba el callback y la sesión no llegaba a establecerse.
        try {
          asegurarAppCheck?.();
          // Queda anotado que este navegador tuvo sesión: la próxima vez, si
          // el dueño entra por la landing, App Check arranca de entrada y su
          // token se renueva sin que Auth lo rechace.
          localStorage.setItem(MARCA_SESION, '1');
        } catch (e) {
          console.warn('No se pudo iniciar App Check:', e);
        }
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
          const parsed = JSON.parse(savedCart);
          // Validar que sea un array y que cada item tenga los campos mínimos
          if (
            Array.isArray(parsed) &&
            parsed.every(
              (item) =>
                item.cartId && item.nombre != null && item.precioFinal != null,
            )
          ) {
            setCartItems(parsed);
          } else {
            console.warn(
              'Carrito en localStorage con formato incompatible, descartando.',
            );
            localStorage.removeItem(cartKey);
            setCartItems([]);
          }
        } catch (e) {
          console.error('Error loading cart:', e);
          localStorage.removeItem(cartKey);
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
          const parsed = JSON.parse(savedShift);
          // Validar que el turno tenga los campos mínimos esperados
          if (
            parsed &&
            typeof parsed === 'object' &&
            parsed.id &&
            parsed.estado
          ) {
            // Sanitizar: convertir cualquier objeto anidado (ej. Timestamps viejos) a string
            Object.keys(parsed).forEach((key) => {
              if (
                parsed[key] &&
                typeof parsed[key] === 'object' &&
                !Array.isArray(parsed[key])
              ) {
                // Si parece un Timestamp serializado, convertir a ISO string
                if (parsed[key].seconds != null) {
                  parsed[key] = new Date(
                    parsed[key].seconds * 1000,
                  ).toISOString();
                } else {
                  delete parsed[key]; // Eliminar otros objetos inesperados
                }
              }
            });
            setTurnoActivo(parsed);
          } else {
            console.warn(
              'Turno en localStorage con formato incompatible, descartando.',
            );
            localStorage.removeItem(shiftKey);
            setTurnoActivo(null);
          }
        } catch (e) {
          console.error('Error loading shift:', e);
          localStorage.removeItem(shiftKey);
          setTurnoActivo(null);
        }
      } else {
        setTurnoActivo(null);
      }

      // --- CLIENTE SELECCIONADO ---
      const clientKey = `client_${sucursalId}`;
      const savedClient = localStorage.getItem(clientKey);
      // Validar que sea un string válido (ID), no un objeto serializado por error
      if (
        savedClient &&
        typeof savedClient === 'string' &&
        !savedClient.startsWith('{')
      ) {
        setSelectedClientId(savedClient);
      } else {
        if (savedClient) localStorage.removeItem(clientKey);
        setSelectedClientId(null);
      }
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
      { name: 'pedidos_online', setter: setPedidosOnline },
      { name: 'ventas', setter: setVentas },
      { name: 'egresos', setter: setEgresos },
      { name: 'ingresos_manuales', setter: setIngresosManuales },
      { name: 'notas_cd', setter: setNotasCD },
      { name: 'presupuestos', setter: setPresupuestos },
      { name: 'turnos', setter: setTurnos },
      { name: 'alertas_borrados', setter: setAlertasBorrados },
      { name: 'movimientos_cc', setter: setMovimientosCC },
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
            .map((d) => {
              const raw = { id: d.id, ...d.data() };
              // Convertir Timestamps de Firestore a strings ISO (recursivo)
              const sanitize = (obj) => {
                if (!obj || typeof obj !== 'object') return obj;
                if (typeof obj.toDate === 'function')
                  return obj.toDate().toISOString();
                if (Array.isArray(obj)) return obj.map(sanitize);
                const result = {};
                Object.keys(obj).forEach((key) => {
                  result[key] = sanitize(obj[key]);
                });
                return result;
              };
              return sanitize(raw);
            })
            .sort((a, b) => {
              const ta = new Date(a.timestamp || 0).getTime();
              const tb = new Date(b.timestamp || 0).getTime();
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

    // --- Limpieza automática: borrar alertas de días anteriores ---
    const limpiarAlertasViejas = async () => {
      try {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const qAlertas = query(
          collection(db, 'alertas_borrados'),
          where('userId', '==', currentUser.uid),
          where('sucursalId', '==', sucursalActual.id),
        );
        const snapshot = await getDocs(qAlertas);
        snapshot.docs.forEach((d) => {
          const ts = d.data().timestamp;
          const fechaAlerta = ts?.toDate ? ts.toDate() : new Date(ts);
          if (fechaAlerta < hoy) {
            deleteDoc(doc(db, 'alertas_borrados', d.id));
          }
        });
      } catch (e) {
        console.error('Error limpiando alertas viejas:', e);
      }
    };
    limpiarAlertasViejas();

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
          // Convertir Timestamps de Firestore a strings ISO (recursivo)
          if (data.configuracion) {
            const sanitize = (obj) => {
              if (!obj || typeof obj !== 'object') return obj;
              if (typeof obj.toDate === 'function')
                return obj.toDate().toISOString();
              if (Array.isArray(obj)) return obj.map(sanitize);
              const result = {};
              Object.keys(obj).forEach((key) => {
                result[key] = sanitize(obj[key]);
              });
              return result;
            };
            // Fusionamos SIN pisar la suscripción/plan: esos son autoridad de
            // datosNegocio/{uid} (la config de sucursal puede tenerlos viejos
            // por la migración inicial).
            const cfg = sanitize({
              id: sucursalActual.id,
              ...data.configuracion,
            });
            delete cfg.subscriptionStatus;
            delete cfg.subscriptionEndDate;
            delete cfg.plan;
            setDatosNegocio((prev) => ({ ...(prev || {}), ...cfg }));
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

    // La SUSCRIPCIÓN y el PLAN viven en datosNegocio/{uid} (los escribe el admin
    // y el webhook de Mercado Pago). Los fusionamos para que el bloqueo por
    // vencimiento, el banner y el plan reflejen el estado real.
    const unsubSuscripcion = onSnapshot(
      doc(db, 'datosNegocio', currentUser.uid),
      (snap) => {
        if (!snap.exists()) return;
        const d = snap.data();
        const endDate =
          d.subscriptionEndDate &&
          typeof d.subscriptionEndDate.toDate === 'function'
            ? d.subscriptionEndDate.toDate().toISOString()
            : d.subscriptionEndDate || null;
        setDatosNegocio((prev) => ({
          ...(prev || {}),
          subscriptionStatus: d.subscriptionStatus ?? prev?.subscriptionStatus,
          subscriptionEndDate: endDate ?? prev?.subscriptionEndDate,
          plan: d.plan ?? prev?.plan,
          precioLegacy: d.precioLegacy ?? prev?.precioLegacy,
          precioLegacyHasta:
            d.precioLegacyHasta &&
            typeof d.precioLegacyHasta.toDate === 'function'
              ? d.precioLegacyHasta.toDate().toISOString()
              : (d.precioLegacyHasta ?? prev?.precioLegacyHasta),
        }));
      },
      (error) => console.error('Error escuchando suscripción:', error),
    );
    unsubscribes.push(unsubSuscripcion);

    return () => {
      unsubscribes.forEach((u) => u && u());
    };
  }, [currentUser, sucursalActual]); // Dependencia clave: sucursalActual

  // 3. Sincronizar Turno Activo con la lista de turnos (Fuente de verdad: Firestore)
  useEffect(() => {
    if (turnos.length > 0) {
      // Buscamos si hay algún turno abierto en la lista de turnos cargada
      const turnoAbierto = turnos.find((t) => t.estado === 'abierto');
      if (turnoAbierto) {
        // Si encontramos uno abierto, lo seteamos como activo
        // Esto corrige el problema de que al recargar o cambiar pestaña se pierda si no estaba en localStorage
        // O si localStorage estaba desactualizado.
        // Solo actualizamos si es diferente para evitar loops
        if (turnoActivo?.id !== turnoAbierto.id) {
          setTurnoActivo(turnoAbierto);
        }
      } else {
        // Si NO hay turnos abiertos en la lista, y tenemos uno activo, significa que se cerró remotamente o hubo error
        if (turnoActivo) {
          setTurnoActivo(null);
        }
      }
    } else if (turnos.length === 0 && turnoActivo) {
      // Si la lista de turnos se vació (ej. filtro) pero teniamos uno activo, validamos.
      // En este caso, si la carga terminó y no hay turnos, deberíamos limpiar.
      // Pero cuidado con el loading inicial.
      if (!isLoadingData) {
        setTurnoActivo(null);
      }
    }
  }, [turnos, turnoActivo, isLoadingData]);

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
    // Se borra la marca de sesión: si este equipo vuelve a ser el mostrador
    // que solo muestra la landing, que no cargue reCAPTCHA al pedo.
    try {
      localStorage.removeItem(MARCA_SESION);
    } catch (e) {
      /* sin acceso al almacenamiento no hay nada que borrar */
    }
  };

  // Carrito (agregar desde producto con descuento por línea)
  const handleAddToCart = (producto, cantidad, descuento = 0) => {
    if (!producto || cantidad <= 0) return;
    // Si no hay descuento manual, aplica la promo del producto (si tiene).
    const descuentoNum =
      Number(descuento) || Number(producto.descuentoPromo) || 0;
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

    // El agrupado se resuelve de forma FUNCIONAL (sobre el estado más reciente),
    // así dos clicks rápidos sobre el mismo producto no crean líneas duplicadas
    // ni desincronizan cantidad y precio. Por peso o ticket: siempre línea nueva.
    if (isByWeight || isScaleTicket) {
      setCartItems((prev) => [...prev, newItem]);
    } else {
      setCartItems((prev) => {
        const idx = prev.findIndex(
          (i) => i.id === producto.id && i.descuentoPorcentaje === descuentoNum,
        );
        if (idx === -1) return [...prev, newItem];
        return prev.map((i, k) =>
          k === idx
            ? {
                ...i,
                cantidad: i.cantidad + cantidad,
                precioFinal: i.precioFinal + precioFinalConDescuento,
              }
            : i,
        );
      });
    }

    // La confirmación sonora de que el producto entró. Es lo que deja al cajero
    // sacar la vista de la pantalla y seguir pasando mercadería.
    sonarEscaneo();
  };

  // Ítem manual a carrito
  const handleAddManualItemToCart = (descripcion, monto) => {
    if (!descripcion.trim() || isNaN(monto) || Number(monto) <= 0) {
      mostrarMensaje?.('Ingrese una descripción y un monto válido.', 'warning');
      return false;
    }
    const montoNum = Number(monto);
    const manualId = generateLocalId('manual_');
    const manualItem = {
      id: manualId,
      cartId: manualId, // cartId único: permite quitar/editar solo esta línea
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

  // --- ALERTAS Y GESTIÓN ABANZADA DEL CARRITO ---
  const handleLogAlertaBorrado = async (
    accion,
    descripcion,
    itemsBorrados,
    montoTotal,
  ) => {
    if (!currentUser?.uid || !sucursalActual?.id) return;
    try {
      const vendedorActual = vendedores.find(
        (v) => v.id === vendedorActivoId,
      ) || { nombre: 'Desconocido' };
      const alerta = {
        userId: currentUser.uid,
        sucursalId: sucursalActual.id,
        vendedorId: vendedorActivoId || null,
        vendedorNombre: vendedorActual.nombre,
        accion,
        descripcion,
        itemsBorrados,
        montoTotal,
        timestamp: new Date().toISOString(),
      };
      // fsService.addDocument(userId, collectionName, data, sucursalId)
      await fsService.addDocument(
        currentUser.uid,
        'alertas_borrados',
        alerta,
        sucursalActual.id,
      );
    } catch (error) {
      console.error('Error registrando alerta de borrado', error);
    }
  };

  const handleRemoveItemFromCart = (cartId) => {
    const itemToRemove = cartItems.find((item) => item.cartId === cartId);
    if (itemToRemove) {
      handleLogAlertaBorrado(
        'Borrado de Artículo',
        `Se eliminó el artículo: ${itemToRemove.nombre}`,
        [itemToRemove],
        itemToRemove.precioFinal,
      );
    }
    setCartItems((prevItems) =>
      prevItems.filter((item) => item.cartId !== cartId),
    );
  };

  // Ajusta la cantidad de una línea del carrito (botones - / +).
  // El permiso "modificar precios" NO bloquea esto: ajustar cantidad es una
  // corrección de cajero, no un cambio de precio. Cada unidad QUITADA se
  // registra en las alertas anti-robo (igual que un borrado).
  const handleUpdateCartQuantity = (cartId, change) => {
    const item = cartItems.find((i) => i.cartId === cartId);
    if (!item || item.vendidoPor === 'ticketBalanza') return;

    const newQuantity = item.cantidad + change;

    // Al aumentar, validar stock (solo productos por unidad).
    if (change > 0) {
      const productoInfo = productos.find((p) => p.id === item.id);
      if (
        productoInfo?.vendidoPor === 'unidad' &&
        newQuantity > productoInfo?.stock
      ) {
        mostrarMensaje?.(`Stock insuficiente para ${item.nombre}.`, 'warning');
        return;
      }
    }

    // Anti-robo: registrar la/s unidad/es quitada/s al reducir cantidad.
    if (change < 0) {
      const unidadesQuitadas = Math.min(Math.abs(change), item.cantidad);
      const precioUnitario =
        item.cantidad > 0 ? item.precioFinal / item.cantidad : item.precioFinal;
      handleLogAlertaBorrado(
        'Reducción de Cantidad',
        `Se quitó ${unidadesQuitadas} unidad(es) de: ${item.nombre}`,
        [{ ...item, cantidad: unidadesQuitadas }],
        precioUnitario * unidadesQuitadas,
      );
    }

    // Si llega a 0, se elimina la línea (ya quedó registrada arriba).
    if (newQuantity <= 0) {
      setCartItems((prev) => prev.filter((i) => i.cartId !== cartId));
      return;
    }

    // Actualización funcional: recalculamos cantidad y precioFinal a partir del
    // estado más reciente, así nunca se desincronizan (ni con clicks rápidos).
    // precioFinal SIEMPRE es el total de la línea = precioOriginal x cantidad.
    setCartItems((prev) =>
      prev.map((i) => {
        if (i.cartId !== cartId) return i;
        const qty = i.cantidad + change;
        if (qty <= 0) return i; // el caso <=0 ya se filtró arriba
        const totalLinea = i.precioOriginal * qty;
        const precioFinal =
          totalLinea - (totalLinea * (i.descuentoPorcentaje || 0)) / 100;
        return { ...i, cantidad: qty, precioFinal };
      }),
    );
  };

  const handleClearCart = () => {
    if (cartItems.length === 0) return;
    const totalMonto = cartItems.reduce(
      (acc, item) => acc + item.precioFinal,
      0,
    );
    handleLogAlertaBorrado(
      'Vaciado de Carrito',
      'Se vació el carrito completo',
      [...cartItems],
      totalMonto,
    );
    setCartItems([]);
  };

  // Productos
  const handleSaveProduct = async (productDataFromForm) => {
    if (!sucursalActual) {
      mostrarMensaje?.('No hay una sucursal seleccionada.', 'error');
      return;
    }
    const productDataFirebase = {
      ...productDataFromForm,
      userId: currentUser?.uid,
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
        currentUser?.uid,
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
      userId: currentUser?.uid,
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
        currentUser?.uid,
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
        currentUser?.uid,
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
        currentUser?.uid,
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
      currentUser?.uid,
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
    vueltoManual = null, // <--- Vuelto calculado en el modal de pago
    propina = 0, // <--- Propina (NO entra en el total facturado a AFIP)
  ) => {
    // Usamos el override si existe, sino el del contexto (cajero)
    const vendedorIdFinal = overrideVendedorId || vendedorActivoId;

    // VALIDACIÓN: Turno Abierto
    if (!turnoActivo) {
      mostrarMensaje?.(
        'No hay un turno abierto. Debe abrir caja para realizar ventas.',
        'error',
      );
      return;
    }

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

    // Fiado (cuenta corriente) requiere un cliente identificado.
    const hayFiado = ensureArray(pagos).some(
      (p) => p?.metodo === 'cuenta_corriente',
    );
    if (hayFiado && !(cliente && isValidFirestoreId(cliente.id))) {
      mostrarMensaje?.(
        'Para vender en Cuenta Corriente (fiado) tenés que seleccionar un cliente.',
        'warning',
      );
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
    // Preferimos el vuelto calculado en el modal (efectivo "paga con"); si no,
    // lo derivamos de la diferencia entre lo pagado y el total.
    const vueltoFinal =
      vueltoManual != null && vueltoManual > 0
        ? parseFloat(Number(vueltoManual).toFixed(2))
        : totalPagado > total
          ? totalPagado - total
          : 0;

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
      propina: Number(propina) || 0,
      pagos: ensureArray(pagos),
      vuelto: vueltoFinal,
      tipoFactura,
      afipData: afipData || null, // <--- Guardamos datos de AFIP si existen
      userId: currentUser?.uid,
      vendedorId: vendedorSeleccionado.id,
      vendedorNombre: vendedorSeleccionado.nombre,
    };

    try {
      // 1. Primero, creamos la venta como siempre
      const ventaId = await fsService.addVenta(
        currentUser?.uid,
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

        // 3b. Cuenta corriente: si se pagó (total o parte) como fiado,
        // registramos el cargo (deuda) del cliente.
        const montoFiado = ensureArray(pagos)
          .filter((p) => p?.metodo === 'cuenta_corriente')
          .reduce((s, p) => s + (Number(p?.monto) || 0), 0);
        if (montoFiado > 0 && clienteIdFinal !== 'consumidor_final') {
          fsService
            .addDocument(
              currentUser?.uid,
              'movimientos_cc',
              {
                clienteId: clienteIdFinal,
                clienteNombre: cliente?.nombre || '',
                tipo: 'cargo',
                monto: montoFiado,
                fecha,
                hora,
                ventaId,
                descripcion: `Venta a cuenta #${String(ventaId).substring(0, 6)}`,
              },
              sucursalActual.id,
            )
            .catch((e) => console.error('Error registrando cargo CC:', e));
        }

        // 3c. Fidelización: sumamos puntos al cliente identificado.
        const pesosPorPunto = Number(datosNegocio?.pesosPorPunto) || 0;
        if (
          datosNegocio?.puntosActivo &&
          pesosPorPunto > 0 &&
          clienteIdFinal !== 'consumidor_final' &&
          cliente
        ) {
          const suma = Math.floor((Number(total) || 0) / pesosPorPunto);
          if (suma > 0) {
            fsService
              .updateCliente(clienteIdFinal, {
                puntos: (Number(cliente.puntos) || 0) + suma,
              })
              .catch((e) => console.error('Error sumando puntos:', e));
          }
        }

        // 4. Impresión automática al cobrar.
        const ventaParaTicket = { id: ventaId, ...newSaleData };
        const onPrintError = (error) => {
          console.error('Error imprimiendo:', error);
          mostrarMensaje?.(`No se pudo imprimir: ${error.message}`, 'warning');
        };

        // 4a. Ticket térmico (58mm): USB o Bluetooth según preferencia.
        //
        // El servicio se carga recién acá. Estaba importado arriba, así que
        // entraba en el arranque de todos —landing incluida— cuando solo hace
        // falta en el momento de cobrar.
        import('../services/thermalPrinterService')
          .then((thermalPrinter) => {
            if (!thermalPrinter.isAutoPrintEnabled()) return undefined;
            if (localStorage.getItem('impresoraMetodo') === 'bluetooth') {
              return import('../services/bluetoothPrinter').then(
                ({ imprimirTicketBluetooth }) =>
                  imprimirTicketBluetooth(
                    ventaParaTicket,
                    datosNegocio,
                    cliente,
                    formatCurrency,
                  ),
              );
            }
            return thermalPrinter.printVentaTicket(
              ventaParaTicket,
              datosNegocio,
              cliente,
            );
          })
          .catch(onPrintError);

        // 4b. Factura/comprobante A4 en impresora normal (si está habilitado).
        if (localStorage.getItem('autoPrintA4') === '1') {
          const tf = ventaParaTicket.tipoFactura;
          const tipoDoc = ['A', 'B', 'C'].includes(tf)
            ? `Factura ${tf}`
            : 'Ticket X';
          import('../services/pdfService')
            .then(({ generarPdfVenta }) =>
              generarPdfVenta(
                ventaParaTicket,
                datosNegocio,
                cliente,
                tipoDoc,
                'print',
              ),
            )
            .catch(onPrintError);
        }
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

  // Emite la factura electrónica de una venta YA cobrada (ej: se cobró como
  // Ticket X porque ARCA estaba caído). Al obtener el CAE, actualiza la venta.
  const handleFacturarVentaExistente = async (ventaId) => {
    const venta = ventas.find((v) => v.id === ventaId);
    if (!venta) {
      mostrarMensaje?.('Venta no encontrada.', 'error');
      return;
    }
    if (venta.afipData?.cae) {
      mostrarMensaje?.('Esta venta ya tiene factura (CAE).', 'info');
      return;
    }

    const cliente = clientes.find((c) => c.id === venta.clienteId) || null;

    // Tipo de comprobante según la condición del emisor (y del cliente para A/B).
    const condEmisor = (datosNegocio?.condicionIva || '').toLowerCase();
    let tipoFactura = 'C';
    if (condEmisor.includes('inscripto')) {
      const clienteRI = (cliente?.condicionFiscal || '')
        .toLowerCase()
        .includes('inscripto');
      tipoFactura = clienteRI && cliente?.cuit ? 'A' : 'B';
    }

    const confirmado = await confirmarAccion?.(
      'Facturar venta',
      `Se va a emitir una Factura ${tipoFactura} por $${Number(venta.total).toFixed(2)}. ¿Continuar?`,
      'question',
      'Sí, facturar',
    );
    if (!confirmado) return;

    try {
      setIsLoadingData(true);
      const { getFunctions, httpsCallable } =
        await import('firebase/functions');
      const functions = getFunctions();

      // Chequeo previo: ¿ARCA está operativo?
      const checkAfipStatus = httpsCallable(functions, 'checkAfipStatus');
      const estado = await checkAfipStatus({
        sucursalId: sucursalActual?.id || null,
      });
      const s = estado?.data?.status;
      const arcaOperativo =
        estado?.data?.success &&
        s?.appServer === 'OK' &&
        s?.dbServer === 'OK' &&
        s?.authServer === 'OK';
      if (!arcaOperativo) {
        mostrarMensaje?.(
          'ARCA sigue sin estar disponible. Probá de nuevo en unos minutos.',
          'warning',
        );
        return;
      }

      // Importes y documento del receptor.
      const total = Number(venta.total) || 0;
      const cbteTipo = tipoFactura === 'A' ? 1 : tipoFactura === 'B' ? 6 : 11;
      let importeNeto = total;
      let importeIva = 0;
      if (tipoFactura === 'A' || tipoFactura === 'B') {
        importeNeto = total / 1.21;
        importeIva = total - importeNeto;
      }

      const cuitCliente = String(cliente?.cuit || '').replace(/\D/g, '');
      let docTipo = 99; // Consumidor Final
      let docNro = 0;
      if (cuitCliente.length === 11) {
        docTipo = 80; // CUIT
        docNro = cuitCliente;
      }

      const ptoVta =
        sucursalActual?.puntoVenta ||
        sucursalActual?.configuracion?.puntoVenta ||
        datosNegocio?.puntoVenta ||
        1;

      const createInvoice = httpsCallable(functions, 'createInvoice');
      const result = await createInvoice({
        sucursalId: sucursalActual?.id,
        ptoVta,
        cbteTipo,
        concepto: 1,
        docTipo,
        docNro,
        importeTotal: total,
        importeNeto,
        importeIva,
        importeExento: 0,
      });

      if (!result?.data?.success || !result?.data?.cae) {
        throw new Error(result?.data?.error || 'ARCA no devolvió un CAE.');
      }

      const afipData = { ...result.data, ptoVta, cbteTipo, docTipo, docNro };

      const ok = await fsService.updateDocument('ventas', venta.id, {
        afipData,
        tipoFactura,
      });
      if (!ok) {
        throw new Error(
          `La factura se emitió pero no se pudo guardar en la venta. Anotá el CAE: ${afipData.cae}`,
        );
      }

      await mostrarMensaje?.(
        `Factura ${tipoFactura} emitida con éxito. CAE: ${afipData.cae}`,
        'success',
      );
    } catch (error) {
      console.error('Error al facturar venta existente:', error);
      mostrarMensaje?.(`No se pudo facturar: ${error.message}`, 'error');
    } finally {
      setIsLoadingData(false);
    }
  };

  // --- CUENTA CORRIENTE (FIADO) ---
  // Saldo del cliente = cargos (ventas fiadas) - pagos a cuenta. Positivo = debe.
  const getSaldoCliente = (clienteId) =>
    movimientosCC
      .filter((m) => m.clienteId === clienteId)
      .reduce(
        (acc, m) => acc + (m.tipo === 'pago' ? -1 : 1) * (Number(m.monto) || 0),
        0,
      );

  const handleRegistrarPagoCuenta = async (
    cliente,
    monto,
    metodoPago = 'efectivo',
    descripcion = '',
  ) => {
    if (!cliente?.id || !sucursalActual) return false;
    const montoNum = Number(monto);
    if (isNaN(montoNum) || montoNum <= 0) {
      mostrarMensaje?.('Ingresá un monto válido.', 'warning');
      return false;
    }
    const { fecha, hora } = obtenerFechaHoraActual();
    const nuevoId = await fsService.addDocument(
      currentUser?.uid,
      'movimientos_cc',
      {
        clienteId: cliente.id,
        clienteNombre: cliente.nombre || '',
        tipo: 'pago',
        monto: montoNum,
        metodoPago,
        fecha,
        hora,
        descripcion: descripcion || 'Pago a cuenta',
      },
      sucursalActual.id,
    );
    const ok = isValidFirestoreId(nuevoId);
    mostrarMensaje?.(
      ok ? 'Pago a cuenta registrado.' : 'Error al registrar el pago.',
      ok ? 'success' : 'error',
    );
    return ok;
  };

  const handleAbrirTurno = async (vendedorId, montoInicial) => {
    const vendedor = vendedores.find((v) => v.id === vendedorId);
    if (!vendedor) return;

    const { fecha, hora } = obtenerFechaHoraActual();
    const turnoData = {
      userId: currentUser?.uid,
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
      const dif = datosCierre.diferenciaEfectivo || 0;
      let diffColor = dif === 0 ? '#4ade80' : dif > 0 ? '#60a5fa' : '#f87171';
      let difText =
        dif === 0
          ? 'Caja Cuadrada'
          : dif > 0
            ? `Sobrante: $${formatCurrency(dif)}`
            : `Faltante: $${formatCurrency(Math.abs(dif))}`;

      // 1. Armar Resumen Visual para la Alerta
      const htmlNormal = !datosCierre.cierreCiego
        ? `
        <div style="font-size: 1rem; color: #a1a1aa; margin-top: 15px;">
        <p><strong>Total Ventas:</strong> $${formatCurrency(datosCierre.totalVentas)}</p>
        <p><strong>Cierre Esperado:</strong> $${formatCurrency(datosCierre.totalFinal)}</p>
        </div>`
        : '';

      const htmlContent = `
        <p>Se ha guardado tu cierre de caja.</p>
        ${htmlNormal}
        <p style="margin-top:10px; font-size:1.2rem; color:${diffColor}; font-weight:bold;">${difText}</p>
      `;

      // 2. Preparar el Mensaje de WhatsApp
      const vendedorStr = turnoActivo.vendedorNombre || 'Admin';
      const watsappText =
        `*🎫 CIERRE DE CAJA ${datosCierre.cierreCiego ? 'CIEGO ' : ''}*\n\n` +
        `👤 *Vendedor:* ${vendedorStr}\n` +
        `⏰ *Apertura:* ${turnoActivo.fechaApertura} ${turnoActivo.horaApertura}\n` +
        `⏰ *Cierre:* ${fecha} ${hora}\n\n` +
        `📊 *Total Ventas:* $${formatCurrency(datosCierre.totalVentas)}\n` +
        `💵 *Esperado en Caja:* $${formatCurrency(datosCierre.totalFinal)}\n` +
        `💰 *Efectivo Declarado:* $${formatCurrency(datosCierre.montoDeclaradoEfectivo)}\n\n` +
        `${dif === 0 ? '✅ *CAJA CUADRADA*' : dif > 0 ? '🟢 *SOBRANTE:* $' + formatCurrency(dif) : '🔴 *FALTANTE:* $' + formatCurrency(Math.abs(dif))}`;

      const wsMsg = encodeURIComponent(watsappText);
      const telefonoJefe = datosNegocio?.whatsappDueño
        ? datosNegocio.whatsappDueño.replace(/[^0-9]/g, '')
        : '';

      // 3. Mostrar la alerta interactiva
      const swalResult = await Swal.fire({
        title: datosCierre.cierreCiego
          ? 'Cierre Ciego Guardado'
          : 'Turno Cerrado',
        html: htmlContent,
        icon: dif === 0 ? 'success' : 'warning',
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: 'Aceptar',
        denyButtonText: 'WhatsApp',
        denyButtonColor: '#25D366',
        cancelButtonText: 'Imprimir',
      });

      // Manejar envío de WhatsApp
      if (swalResult.isDenied) {
        window.open(`https://wa.me/${telefonoJefe}?text=${wsMsg}`, '_blank');
      }

      // Manejar Impresión
      if (swalResult.dismiss === Swal.DismissReason.cancel) {
        // Guardamos el texto en sessionStorage temporalmente para abrir una paginita o window de impresion simple
        sessionStorage.setItem('printTicketTurno', watsappText);
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
          <html>
            <head>
              <title>Ticket de Cierre</title>
              <style>
                body { font-family: monospace; width: 300px; padding: 20px; font-size: 14px; color: #000; }
                hr { border-top: 1px dashed #000; }
                .center { text-align: center; }
                .bold { font-weight: bold; }
              </style>
            </head>
            <body>
              <h2 class="center">CIERRE DE CAJA ${datosCierre.cierreCiego ? 'CIEGO' : ''}</h2>
              <p>Fecha Cierre: ${fecha} ${hora}</p>
              <p>Vendedor: ${vendedorStr}</p>
              <hr />
              <p>Apertura: ${turnoActivo.fechaApertura} ${turnoActivo.horaApertura}</p>
              <p>Total Ventas: $${formatCurrency(datosCierre.totalVentas)}</p>
              <p>Esperado en Caja: $${formatCurrency(datosCierre.totalFinal)}</p>
              <hr />
              <p>Efectivo Declarado: $${formatCurrency(datosCierre.montoDeclaradoEfectivo)}</p>
              <h3 class="center">${dif === 0 ? 'CAJA CUADRADA' : dif > 0 ? 'SOBRANTE: $' + formatCurrency(dif) : 'FALTANTE: $' + formatCurrency(Math.abs(dif))}</h3>
              <br/><br/>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 500);
      }
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
      userId: currentUser?.uid,
      sucursalId: sucursalActual.id,
    };
    const newId = await fsService.addIngresoManual(
      currentUser?.uid,
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
      userId: currentUser?.uid,
      sucursalId: sucursalActual.id,
    };
    const newId = await fsService.addEgreso(
      currentUser?.uid,
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
      currentUser?.uid,
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
      currentUser?.uid,
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
        userId: currentUser?.uid,
        tipo: 'credito',
        total: ventaOriginal.total,
        items: ventaOriginal.items,
        clienteId: ventaOriginal.clienteId,
        clienteNombre: ventaOriginal.clienteNombre,
        ventaOriginalId: ventaOriginal.id,
        motivo: `Anulación de venta #${ventaOriginal.id.substring(0, 6)}...`,
      };
      const success = await fsService.anularVentaConNotaCredito(
        currentUser?.uid,
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
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
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
        currentUser?.uid,
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
              currentUser?.uid,
              sucursalPrincipal.id,
              newSucursalId,
            );
          }
        }

        const sucursalesActualizadas = await fsService.getSucursales(
          currentUser?.uid,
        );
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
        currentUser?.uid,
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
          currentUser?.uid,
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

  // Limpiar productos repetidos.
  //
  // Agrupaba SOLO por código de barras, y con un `if (p.codigoBarras)` los que
  // no tienen código quedaban afuera. Son justo los que más se duplican: una
  // factura de proveedor que factura con su código interno no deja ningún EAN,
  // así que sus productos se crean sin código, y si esa factura se carga dos
  // veces quedan dos fichas de cada cosa. El botón las miraba y contestaba "no
  // se encontraron productos duplicados".
  const handleDeleteDuplicates = async () => {
    const { aEliminar, grupos } = buscarDuplicados(productos);

    if (aEliminar.length === 0) {
      mostrarMensaje('No se encontraron productos duplicados.', 'info');
      return;
    }

    // Se nombran los productos y no solo se cuentan: borrar fichas del catálogo
    // no se deshace, y un número suelto no alcanza para decidir.
    const confirm = await confirmarAccion(
      `¿Eliminar ${aEliminar.length} ficha(s) repetida(s)?`,
      `De cada producto repetido se conserva el de mayor stock:

${resumenDuplicados(grupos)}`,
      'warning',
      'Sí, limpiar',
    );
    if (!confirm) return;

    setIsLoadingData(true);
    const success = await fsService.deleteProducts(aEliminar);
    mostrarMensaje(
      success
        ? `Se eliminaron ${aEliminar.length} ficha(s) repetida(s).`
        : 'Error al eliminar duplicados.',
      success ? 'success' : 'error',
    );
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
        currentUser?.uid,
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

  // Registra un pedido online como venta al entregarlo. No usamos
  // handleSaleConfirmed porque exige turno y vendedor y vacía el carrito
  // (borraría la venta que el cajero tenga en curso).
  const handleEntregarPedidoOnline = async (pedido) => {
    if (!pedido?.id || !sucursalActual) return false;
    // Un pedido ya registrado no se vuelve a cobrar: evita duplicar la venta y
    // descontar el stock dos veces por un doble clic o dos cajas abiertas.
    if (pedido.ventaId) {
      mostrarMensaje?.('Este pedido ya fue registrado como venta.', 'info');
      return false;
    }
    const { fecha, hora } = obtenerFechaHoraActual();

    const items = (pedido.items || []).map((it) => {
      const prod = productos.find((p) => p.id === it.productoId);
      const unitario = Number(it.precioUnitario) || 0;
      const cantidad = Number(it.cantidad) || 0;
      return {
        id: it.productoId,
        nombre: it.nombre,
        cantidad,
        precioOriginal: unitario,
        descuentoPorcentaje: 0,
        // precioFinal es el TOTAL de la línea (igual que en el carrito).
        precioFinal: Math.round(unitario * cantidad * 100) / 100,
        costo: Number(prod?.costo) || 0,
      };
    });

    const total = Number(pedido.total) || 0;
    const vendedor = vendedores.find((v) => v.id === vendedorActivoId) || null;

    const newSaleData = {
      fecha,
      hora,
      clienteId: 'consumidor_final',
      clienteNombre: pedido.cliente?.nombre || 'Pedido online',
      items,
      total,
      propina: 0,
      pagos: [
        {
          metodo:
            pedido.metodoPago === 'qr_local' ? 'mercado_pago' : 'efectivo',
          monto: total,
        },
      ],
      vuelto: 0,
      tipoFactura: 'X',
      afipData: null,
      userId: currentUser?.uid,
      vendedorId: vendedor?.id || null,
      vendedorNombre: vendedor?.nombre || 'Pedido online',
      origen: 'tienda_online',
      pedidoOnlineId: pedido.id,
    };

    setIsLoadingData(true);
    try {
      // addVenta descuenta stock y falla si no alcanza.
      const ventaId = await fsService.addVenta(
        currentUser?.uid,
        newSaleData,
        sucursalActual.id,
      );
      if (!isValidFirestoreId(ventaId)) {
        throw new Error('No se pudo registrar la venta.');
      }

      if (turnoActivo?.id) {
        fsService
          .addSaleToShift(turnoActivo.id, ventaId)
          .catch((e) => console.error('Error sumando venta al turno:', e));
      }

      const { getFunctions, httpsCallable } =
        await import('firebase/functions');
      const fn = httpsCallable(getFunctions(), 'actualizarEstadoPedido');
      await fn({ pedidoId: pedido.id, estado: 'entregado', ventaId });

      mostrarMensaje?.(
        turnoActivo?.id
          ? 'Pedido entregado y registrado como venta.'
          : 'Pedido entregado y registrado. Ojo: no hay un turno de caja abierto.',
        'success',
      );
      return true;
    } catch (error) {
      console.error('Error entregando pedido online:', error);
      mostrarMensaje?.(
        error.message || 'No se pudo registrar la venta del pedido.',
        'error',
      );
      return false;
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleGuardarDatosNegocio = async (datosActualizados) => {
    const ok = await fsService.saveDatosNegocio(
      currentUser?.uid,
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
    // Una factura autorizada por ARCA (con CAE) NO se puede eliminar: para darla
    // de baja hay que emitir una Nota de Crédito (desde "Notas C/D").
    const venta = ventas.find((v) => v.id === ventaId);
    if (venta?.afipData?.cae) {
      mostrarMensaje?.(
        `Esta venta es una factura electrónica autorizada por ARCA (CAE ${venta.afipData.cae}). No se puede eliminar: para darla de baja emití una Nota de Crédito desde la pestaña "Notas C/D".`,
        'warning',
      );
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
        currentUser?.uid,
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
      userId: currentUser?.uid,
      sucursalId: sucursalActual.id,
    };

    const newId = await fsService.addPresupuesto(
      currentUser?.uid,
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

  const solicitarPin = async () => {
    const { value: pinResult } = await Swal.fire({
      title: 'Configuración Protegida',
      input: 'password',
      inputLabel: 'Ingresa tu PIN de Seguridad',
      inputPlaceholder: '••••',
      showCancelButton: true,
      confirmButtonText: 'Desbloquear',
      cancelButtonText: 'Cancelar',
      footer:
        '<p style="color: #9ca3af; font-size: 0.85rem;">¿Olviaste el PIN? Contactá al equipo de soporte para restablecerlo.</p>',
      inputAttributes: {
        autocapitalize: 'off',
        autocorrect: 'off',
      },
    });

    // Normal PIN Flow
    if (pinResult && pinResult === datosNegocio?.pinSeguridad) {
      setIsSessionUnlocked(true);
      return true;
    } else if (pinResult !== undefined) {
      Swal.fire({
        icon: 'error',
        title: 'PIN Incorrecto',
        text: 'El código ingresado no coincide.',
      });
      return false;
    }
    return false; // Cancelled
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
    pedidosOnline,
    handleEntregarPedidoOnline,
    cartItems,
    ventas,
    egresos,
    ingresosManuales,
    notasCD,
    presupuestos,
    datosNegocio,
    turnos,
    turnoActivo,
    alertasBorrados,
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
    handleRemoveItemFromCart,
    handleUpdateCartQuantity,
    handleClearCart,
    handleSaleConfirmed,
    handleFacturarVentaExistente,
    handleEliminarVenta,
    // Cuenta corriente (fiado)
    movimientosCC,
    getSaldoCliente,
    handleRegistrarPagoCuenta,
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
    // Seguridad
    isSessionUnlocked,
    solicitarPin,
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
