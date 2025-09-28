import React, { useState } from 'react'; // Se añade useState
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
  LineChart,
  FileText,
  Settings,
  LogOut,
  Shield,
  UserPlus,
  Truck,
  BarChart3,
} from 'lucide-react';
import ChatbotModal from './ChatbotModal.jsx';
import SubscriptionStatusBanner from './SubscriptionStatusBanner.jsx';

function Layout() {
  // Dentro de function Layout() { ... }
  const [isChatOpen, setIsChatOpen] = useState(false);
  // Se obtiene 'isAdmin' para mostrar el enlace condicionalmente
  const { handleLogout, isAdmin } = useAppContext();
  const navigate = useNavigate();

  // Se usa 'useLocation' para detectar la ruta activa. Es la forma correcta en React Router.
  const location = useLocation();
  const currentPath = location.pathname;
  const [isChatButtonHovered, setIsChatButtonHovered] = useState(false);

  // Se definen las pestañas base que todos los usuarios ven
  const tabsData = [
    {
      id: 'venta',
      label: 'Nueva Venta',
      Icon: ShoppingCart,
      shortLabel: 'Venta',
      path: '/dashboard',
    },
    {
      id: 'productos',
      label: 'Productos',
      Icon: Package,
      shortLabel: 'Productos',
      path: '/dashboard/productos',
    },
    {
      id: 'clientes',
      label: 'Clientes',
      Icon: Users,
      shortLabel: 'Clientes',
      path: '/dashboard/clientes',
    },
    {
      id: 'vendedores',
      label: 'Vendedores',
      Icon: UserPlus,
      shortLabel: 'Vendedores',
      path: '/dashboard/vendedores',
    },
    {
      id: 'proveedores',
      label: 'Proveedores',
      Icon: /* Puedes usar un ícono que te guste, ej: Truck */ Package,
      shortLabel: 'Provs',
      path: '/dashboard/proveedores',
    },
    {
      id: 'pedidos',
      label: 'Pedidos',
      Icon: /*ClipboardList*/ Truck,
      shortLabel: 'Pedidos',
      path: '/dashboard/pedidos',
    },
    {
      id: 'estadisticas',
      label: 'Estadísticas',
      Icon: BarChart3,
      shortLabel: 'Stats',
      path: '/dashboard/estadisticas',
    },
    {
      id: 'reportes',
      label: 'Caja y Reportes',
      Icon: LineChart,
      shortLabel: 'Caja',
      path: '/dashboard/reportes',
    },
    {
      id: 'notas_cd',
      label: 'Notas C/D',
      Icon: FileText,
      shortLabel: 'Notas',
      path: '/dashboard/notas',
    },
    {
      id: 'configuracion',
      label: 'Configuración',
      Icon: Settings,
      shortLabel: 'Config',
      path: '/dashboard/configuracion',
    },
  ];

  // Si el usuario es admin, se añade dinámicamente la pestaña del panel
  if (isAdmin) {
    tabsData.push({
      id: 'admin',
      label: 'Panel Admin',
      Icon: Shield, // Ícono para la nueva pestaña
      shortLabel: 'Admin',
      path: '/admin',
    });
  }

  const onLogoClick = () => {
    navigate('/dashboard');
  };

  return (
    <div className="flex min-h-screen flex-col bg-zinc-900 text-zinc-200">
      <header className="p-3 md:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AppLogo
              onLogoClick={onLogoClick}
              className="text-white hover:text-blue-400"
            />
            <h1 className="hidden text-xl font-bold text-zinc-100 sm:text-2xl md:block">
              Khaleesi System
            </h1>
            <h1 className="text-xl font-bold text-zinc-100 sm:text-2xl md:hidden">
              POS
            </h1>
          </div>
        </div>

        <div className="border-b border-zinc-700">
          <nav
            className="-mb-px flex flex-wrap justify-center sm:justify-start"
            aria-label="Tabs"
          >
            {tabsData.map((tab) => (
              <motion.div key={tab.id}>
                <Link
                  to={tab.path}
                  className={`tab-button flex items-center px-3 py-2 text-center text-sm font-medium transition-colors duration-150 ${currentPath === tab.path ? 'active-nav-link' : 'inactive-nav-link'}`}
                >
                  <tab.Icon
                    className="mr-1 h-4 w-4 sm:mr-1.5"
                    strokeWidth={currentPath === tab.path ? 2.5 : 2}
                  />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.shortLabel}</span>
                </Link>
              </motion.div>
            ))}
            <motion.button
              onClick={() => {
                handleLogout();
                navigate('/login');
              }}
              className="tab-button inactive-nav-link ml-auto flex items-center px-3 py-2 text-center text-sm font-medium text-red-400 transition-colors duration-150 hover:border-red-500 hover:text-red-300"
            >
              <LogOut className="mr-1 h-4 w-4 sm:mr-1.5" strokeWidth={2} />
              <span className="hidden sm:inline">Salir</span>
              <span className="sm:hidden">Salir</span>
            </motion.button>
          </nav>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-3 md:p-6">
        <SubscriptionStatusBanner />
        <Outlet />
      </main>

      <Footer />
      {/* --- INICIO DEL CÓDIGO AÑADIDO --- */}

      {/* Nuevo código del botón con animación */}
      <motion.div
        className="fixed bottom-6 right-6 z-40"
        onHoverStart={() => setIsChatButtonHovered(true)}
        onHoverEnd={() => setIsChatButtonHovered(false)}
      >
        <button
          onClick={() => setIsChatOpen(true)}
          className={`flex items-center justify-center gap-2 rounded-full shadow-lg transition-all duration-300 ease-in-out ${isChatButtonHovered ? 'w-36 bg-blue-600' : 'w-14 bg-blue-700'} h-14 text-white focus:outline-none`}
          aria-label="Abrir asistente de chat"
        >
          {/* El ícono siempre es visible */}
          <Bot size={24} className="flex-shrink-0" />

          {/* El texto solo aparece si el mouse está encima y se anima con Framer Motion */}
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

      {/* El componente del modal del chatbot */}
      {/* Se muestra solo si isChatOpen es true */}
      <ChatbotModal isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />

      {/* --- FIN DEL CÓDIGO AÑADIDO --- */}
    </div>
  );
}

export default Layout;
