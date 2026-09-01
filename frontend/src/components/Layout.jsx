import React, { useState, useEffect } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import AppLogo from './AppLogo.jsx';
import Footer from './Footer.jsx';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  ShoppingCart,
  Package,
  Users,
  FileText,
  Settings,
  LogOut,
  Shield,
  UserPlus,
  Truck,
  BarChart3,
  Wallet,
  ClipboardList,
  FileMinus,
  Menu,
  PanelLeftClose,
  PanelLeft,
  Lock,
  ScanLine,
  ShoppingBag,
} from 'lucide-react';
import ChatbotModal from './ChatbotModal.jsx';
import SubscriptionStatusBanner from './SubscriptionStatusBanner.jsx';
import SucursalSelector from './SucursalSelector.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import AvisoPedidoOnline from './AvisoPedidoOnline.jsx';
import EstadoConexion from './EstadoConexion.jsx';
import ActualizacionApp from './ActualizacionApp.jsx';
import Swal from '../utils/swalTheme.js';
import {
  verificarDueno,
  emailDeLaCuenta,
} from '../utils/recuperarPinCajero.js';
import useModoCajero from '../hooks/useModoCajero.js';
import ErrorBoundary from './ErrorBoundary.jsx';
import {
  setModoCajero,
  getPinCajero,
  setPinCajero,
} from '../utils/modoCajero.js';

// Rutas permitidas en "modo cajero" (el resto se oculta).
// A dónde puede entrar el cajero.
//
// Caja y Reportes está acá porque es donde se reimprime un comprobante, y el
// que atiende es justo el que lo necesita: el cliente vuelve al rato pidiendo el
// ticket. Adentro, esa pantalla ya se muestra recortada —sin la columna de
// importes y sin los botones de ver, eliminar ni anular—, así que entrar no le
// deja ver los números del negocio.
//
// Notas de Crédito, por lo mismo: el cliente devuelve algo en el momento y hay
// que anular la factura ahí. Borrar una nota ya está cerrado adentro.
const CAJERO_PATHS = [
  '/dashboard',
  '/dashboard/productos',
  '/dashboard/clientes',
  '/dashboard/pistola',
  '/dashboard/pedidos-online',
  '/dashboard/pagos',
  '/dashboard/reportes',
  '/dashboard/notas',
];

function Layout() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isChatButtonHovered, setIsChatButtonHovered] = useState(false);
  const {
    handleLogout,
    isAdmin,
    canAccessMultisucursal,
    canAccessAI,
    canAccessAfip,
    datosNegocio,
    pedidosOnline,
    handleGuardarDatosNegocio,
  } = useAppContext();

  // Pedidos de la tienda esperando ser atendidos (badge del menú).
  const pedidosNuevos = (pedidosOnline || []).filter(
    (p) => p.estado === 'nuevo',
  ).length;
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  // Colapsado (solo desktop, se recuerda) y drawer abierto (mobile).
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('sidebarCollapsed') === '1',
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.innerWidth >= 768,
  );

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', collapsed ? '1' : '0');
  }, [collapsed]);

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Cierra el drawer al navegar (mobile).
  useEffect(() => {
    setMobileOpen(false);
  }, [currentPath]);

  // El colapsado solo aplica en desktop; en el drawer mobile va completo.
  const mini = isDesktop && collapsed;

  // Modo cajero: oculta secciones sensibles hasta ingresar un PIN.
  // El estado del modo vive en utils/modoCajero: Reportes también lo necesita
  // para esconder los importes, y con una copia en cada pantalla la segunda se
  // entera tarde.
  const modoCajero = useModoCajero();

  // El PIN del negocio manda sobre el de esta computadora: así es el mismo en
  // todas las máquinas del local, y estrenar una no deja a nadie afuera.
  const pinGuardado = datosNegocio?.pinCajero || getPinCajero();

  const entrarCajero = async () => {
    if (!pinGuardado) {
      const { value: nuevo } = await Swal.fire({
        title: 'PIN del modo cajero',
        input: 'text',
        inputLabel: 'Lo va a pedir para salir. Se guarda en tu cuenta.',
        inputPlaceholder: 'Ej: 1234',
        showCancelButton: true,
        confirmButtonText: 'Activar',
        cancelButtonText: 'Cancelar',
      });
      if (!nuevo || !nuevo.trim()) return;
      setPinCajero(nuevo.trim());
      // Guardado en la cuenta, que es lo que después permite recuperarlo desde
      // Configuración o desde otra computadora.
      handleGuardarDatosNegocio?.({ pinCajero: nuevo.trim() });
    }
    setModoCajero(true);
    navigate('/dashboard');
  };

  const salirCajero = async () => {
    const { value: intento, isDenied } = await Swal.fire({
      title: 'Salir del modo cajero',
      input: 'password',
      inputLabel: 'PIN',
      inputAttributes: { inputmode: 'numeric', autocomplete: 'off' },
      showCancelButton: true,
      // La salida de emergencia va a la vista y no escondida: alguien que no se
      // acuerda del PIN está trabado con el local abierto.
      showDenyButton: true,
      confirmButtonText: 'Salir',
      denyButtonText: 'Olvidé el PIN',
      cancelButtonText: 'Cancelar',
    });

    if (isDenied) {
      await recuperarConPassword();
      return;
    }
    if (intento === undefined) return; // canceló

    if (intento.trim() === pinGuardado) {
      setModoCajero(false);
      return;
    }

    const { isConfirmed } = await Swal.fire({
      icon: 'error',
      title: 'PIN incorrecto',
      text: 'Si no lo recordás, podés salir con la contraseña de tu cuenta.',
      showCancelButton: true,
      confirmButtonText: 'Usar mi contraseña',
      cancelButtonText: 'Cerrar',
    });
    if (isConfirmed) await recuperarConPassword();
  };

  /**
   * La salida de emergencia: la contraseña de la cuenta.
   *
   * No hace falta inventar una llave nueva. El dueño ya tiene una, es la que
   * protege todo lo demás, y Firebase la verifica contra sus servidores: no se
   * guarda ni viaja por acá.
   */
  const recuperarConPassword = async () => {
    const { value: pass } = await Swal.fire({
      title: 'Confirmá que sos vos',
      html: `Escribí la contraseña de <strong>${emailDeLaCuenta()}</strong>.`,
      input: 'password',
      inputAttributes: { autocomplete: 'current-password' },
      showCancelButton: true,
      confirmButtonText: 'Salir del modo cajero',
      cancelButtonText: 'Cancelar',
    });
    if (!pass) return;

    const { ok, motivo } = await verificarDueno(pass);
    if (!ok) {
      await Swal.fire({
        icon: 'error',
        title: 'No pudimos verificarte',
        text: motivo,
      });
      return;
    }
    setModoCajero(false);
    await Swal.fire({
      icon: 'success',
      title: 'Listo',
      html: pinGuardado
        ? `Saliste del modo cajero. Tu PIN es <strong>${pinGuardado}</strong>.`
        : 'Saliste del modo cajero.',
    });
  };
  useEffect(() => {
    if (modoCajero && !CAJERO_PATHS.includes(currentPath)) {
      navigate('/dashboard');
    }
  }, [modoCajero, currentPath, navigate]);

  // Navegación agrupada por categoría.
  const groups = [
    {
      title: 'Operar',
      items: [
        { label: 'Nueva Venta', Icon: ShoppingCart, path: '/dashboard' },
        { label: 'Pistola (celu)', Icon: ScanLine, path: '/dashboard/pistola' },
        ...(datosNegocio?.tiendaActiva && (canAccessAI || isAdmin)
          ? [
              {
                label: 'Pedidos online',
                Icon: ShoppingBag,
                path: '/dashboard/pedidos-online',
                badge: pedidosNuevos,
              },
            ]
          : []),
        ...(datosNegocio?.mpConfigurado || datosNegocio?.mpAccessToken
          ? [
              {
                label: 'Pagos recibidos',
                Icon: Wallet,
                path: '/dashboard/pagos',
              },
            ]
          : []),
        { label: 'Caja y Reportes', Icon: Wallet, path: '/dashboard/reportes' },
      ],
    },
    {
      title: 'Catálogo',
      items: [
        { label: 'Productos', Icon: Package, path: '/dashboard/productos' },
        { label: 'Proveedores', Icon: Truck, path: '/dashboard/proveedores' },
        { label: 'Pedidos', Icon: ClipboardList, path: '/dashboard/pedidos' },
      ],
    },
    {
      title: 'Gente',
      items: [
        { label: 'Clientes', Icon: Users, path: '/dashboard/clientes' },
        { label: 'Vendedores', Icon: UserPlus, path: '/dashboard/vendedores' },
      ],
    },
    {
      title: 'Documentos',
      items: [
        {
          label: 'Presupuestos',
          Icon: FileText,
          path: '/dashboard/presupuestos',
        },
        // Notas C/D es de facturación (AFIP) → solo Plan Completo.
        ...(canAccessAfip
          ? [
              {
                label: 'Notas de Crédito',
                Icon: FileMinus,
                path: '/dashboard/notas',
              },
            ]
          : []),
      ],
    },
    {
      title: 'Análisis',
      items: [
        {
          label: 'Estadísticas',
          Icon: BarChart3,
          path: '/dashboard/estadisticas',
        },
      ],
    },
    {
      title: 'Sistema',
      items: [
        {
          label: 'Configuración',
          Icon: Settings,
          path: '/dashboard/configuracion',
        },
        ...(isAdmin
          ? [{ label: 'Panel Admin', Icon: Shield, path: '/admin' }]
          : []),
      ],
    },
  ];

  const NavItem = ({ label, Icon, path, badge }) => {
    const active = currentPath === path;
    return (
      <Link
        to={path}
        title={mini ? label : undefined}
        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150 [@media(max-height:820px)]:py-1.5 ${
          mini ? 'justify-center' : ''
        } ${
          active
            ? 'bg-blue-600/15 text-blue-500 dark:text-blue-400'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        }`}
      >
        <span className="relative flex-none">
          <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
          {badge > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {badge}
            </span>
          )}
        </span>
        {!mini && <span className="truncate">{label}</span>}
      </Link>
    );
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground transition-colors duration-300">
      {/* Overlay del drawer en mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 transform-gpu flex-col border-r border-border bg-background transition-transform duration-200 ease-out will-change-transform md:sticky md:top-0 md:z-auto md:h-screen md:translate-x-0 md:transition-none ${
          mini ? 'md:w-16' : 'md:w-60'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        {/* Encabezado del sidebar */}
        <div
          className={`flex h-16 items-center gap-2 border-b border-border px-3 ${
            mini ? 'justify-center' : 'justify-between'
          }`}
        >
          {!mini && (
            <div className="flex flex-1 items-center gap-2 overflow-hidden">
              <AppLogo
                onLogoClick={() => navigate('/dashboard')}
                className="text-foreground"
              />
              <span className="truncate text-lg font-bold">Khaleesi</span>
            </div>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="hidden rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground md:block"
            aria-label={mini ? 'Expandir menú' : 'Colapsar menú'}
            title={mini ? 'Expandir' : 'Colapsar'}
          >
            {mini ? (
              <PanelLeft className="h-5 w-5" />
            ) : (
              <PanelLeftClose className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Navegación */}
        {/* En una notebook el menú no entra: ~15 ítems más los títulos de
            grupo pasan de 700px contra 640 de alto útil. Los ítems se achican
            solo en pantallas bajas —de ahí la variante `max-height`—, así en un
            monitor grande queda exactamente como estaba. El scroll se queda
            igual: es la salida correcta si aun así no entra. */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-2 [@media(max-height:820px)]:space-y-0.5">
          {(modoCajero
            ? groups
                .map((g) => ({
                  ...g,
                  items: g.items.filter((i) => CAJERO_PATHS.includes(i.path)),
                }))
                .filter((g) => g.items.length)
            : groups
          ).map((group, gi) => (
            <div key={group.title} className={gi > 0 ? 'pt-3' : ''}>
              {mini ? (
                gi > 0 && <div className="mx-2 mb-2 border-t border-border" />
              ) : (
                <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground [@media(max-height:820px)]:pb-0">
                  {group.title}
                </p>
              )}
              <div className="space-y-1">
                {group.items.map((item) => (
                  <NavItem key={item.path} {...item} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Salir */}
        <div className="border-t border-border p-2">
          <button
            onClick={() => {
              handleLogout();
              navigate('/login');
            }}
            title={mini ? 'Salir' : undefined}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-400 transition-colors duration-150 hover:bg-red-500/10 hover:text-red-300 [@media(max-height:820px)]:py-1.5 ${
              mini ? 'justify-center' : ''
            }`}
          >
            <LogOut className="h-5 w-5 flex-none" />
            {!mini && <span>Salir</span>}
          </button>
        </div>
      </aside>

      {/* COLUMNA PRINCIPAL */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barra superior */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background px-3 md:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
              aria-label="Abrir menú"
            >
              <Menu className="h-5 w-5" />
            </button>
            {canAccessMultisucursal && <SucursalSelector />}
          </div>
          <div className="flex items-center gap-2">
            {modoCajero ? (
              <button
                onClick={salirCajero}
                className="flex items-center gap-1 rounded-md bg-amber-500/15 px-2.5 py-1.5 text-xs font-semibold text-amber-400 hover:bg-amber-500/25"
                title="Salir de modo cajero"
              >
                <Lock className="h-4 w-4" /> Cajero
              </button>
            ) : (
              <button
                onClick={entrarCajero}
                className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                title="Entrar en modo cajero"
              >
                <Lock className="h-5 w-5" />
              </button>
            )}
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-3 md:p-6">
          <SubscriptionStatusBanner />
          {/* Cada pantalla envuelta por separado: si una se rompe, el menú y el
              resto del sistema siguen andando y se puede seguir trabajando. La
              clave por ruta hace que al cambiar de pantalla el error se limpie
              solo, sin tener que recargar.

              Antes no había ninguno acá: cualquier error dejaba la app entera
              en negro, sin una palabra de qué pasó. */}
          <ErrorBoundary key={currentPath}>
            <Outlet />
          </ErrorBoundary>
        </main>

        <Footer simple={true} />
      </div>

      {/* Asistente IA (flotante) */}
      {canAccessAI && (
        <motion.div
          className="fixed bottom-6 right-6 z-40"
          onHoverStart={() => setIsChatButtonHovered(true)}
          onHoverEnd={() => setIsChatButtonHovered(false)}
        >
          <button
            onClick={() => setIsChatOpen(true)}
            className={`flex h-14 items-center justify-center gap-2 rounded-full text-white shadow-lg transition-all duration-300 ease-in-out focus:outline-none ${
              isChatButtonHovered ? 'w-36 bg-blue-600' : 'w-14 bg-blue-700'
            }`}
            aria-label="Abrir asistente de chat"
          >
            <Bot size={24} className="flex-shrink-0" />
            <AnimatePresence>
              {isChatButtonHovered && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="whitespace-nowrap font-semibold"
                >
                  Asistente
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </motion.div>
      )}

      <AvisoPedidoOnline />
      <EstadoConexion />
      <ActualizacionApp />

      <ChatbotModal isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </div>
  );
}

export default Layout;
