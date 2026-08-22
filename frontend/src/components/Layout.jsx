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
} from 'lucide-react';
import ChatbotModal from './ChatbotModal.jsx';
import SubscriptionStatusBanner from './SubscriptionStatusBanner.jsx';
import SucursalSelector from './SucursalSelector.jsx';
import ThemeToggle from './ThemeToggle.jsx';

// Rutas permitidas en "modo cajero" (el resto se oculta).
const CAJERO_PATHS = [
  '/dashboard',
  '/dashboard/productos',
  '/dashboard/clientes',
  '/dashboard/pistola',
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
  } = useAppContext();
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
  const [modoCajero, setModoCajero] = useState(
    () => localStorage.getItem('modoCajero') === '1',
  );
  const entrarCajero = () => {
    if (!localStorage.getItem('cajeroPin')) {
      const nuevo = window.prompt(
        'Creá un PIN para el modo cajero (lo pedirá para salir):',
      );
      if (!nuevo || !nuevo.trim()) return;
      localStorage.setItem('cajeroPin', nuevo.trim());
    }
    localStorage.setItem('modoCajero', '1');
    setModoCajero(true);
    navigate('/dashboard');
  };
  const salirCajero = () => {
    const intento = window.prompt('Ingresá el PIN para salir del modo cajero:');
    if (intento === null) return;
    if (intento.trim() === (localStorage.getItem('cajeroPin') || '')) {
      localStorage.setItem('modoCajero', '0');
      setModoCajero(false);
    } else {
      window.alert('PIN incorrecto.');
    }
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
          ? [{ label: 'Notas de Crédito', Icon: FileMinus, path: '/dashboard/notas' }]
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

  const NavItem = ({ label, Icon, path }) => {
    const active = currentPath === path;
    return (
      <Link
        to={path}
        title={mini ? label : undefined}
        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150 ${
          mini ? 'justify-center' : ''
        } ${
          active
            ? 'bg-blue-600/15 text-blue-500 dark:text-blue-400'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        }`}
      >
        <Icon className="h-5 w-5 flex-none" strokeWidth={active ? 2.5 : 2} />
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
        <nav className="flex-1 space-y-1 overflow-y-auto p-2">
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
              {mini
                ? gi > 0 && <div className="mx-2 mb-2 border-t border-border" />
                : (
                  <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
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
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-400 transition-colors duration-150 hover:bg-red-500/10 hover:text-red-300 ${
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
          <Outlet />
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

      <ChatbotModal isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </div>
  );
}

export default Layout;
