import React from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import AppLogo from './AppLogo.jsx'; //
import { motion } from 'framer-motion';
import { ShoppingCart, Package, Users, LineChart, FileText, Settings, LogOut } from 'lucide-react';

const tabsData = [
    { id: 'venta', label: 'Nueva Venta', Icon: ShoppingCart, shortLabel: 'Venta', path: '/' },
    { id: 'productos', label: 'Productos', Icon: Package, shortLabel: 'Productos', path: '/productos' },
    { id: 'clientes', label: 'Clientes', Icon: Users, shortLabel: 'Clientes', path: '/clientes' },
    { id: 'reportes', label: 'Caja y Reportes', Icon: LineChart, shortLabel: 'Caja', path: '/reportes' },
    { id: 'notas_cd', label: 'Notas C/D', Icon: FileText, shortLabel: 'Notas', path: '/notas' },
    { id: 'configuracion', label: 'Configuración', Icon: Settings, shortLabel: 'Config', path: '/configuracion' }
];

function Layout() {
    const { handleLogout } = useAppContext();
    const navigate = useNavigate();

    const onLogoClick = () => {
        navigate('/'); // Navegar a la ruta de venta al hacer clic en el logo
    };
    
    // Obtener la ruta actual para marcar la pestaña activa
    const currentPath = window.location.pathname;


    return (
        <div id="app-container" className="p-3 md:p-6 font-inter bg-zinc-900 text-zinc-200 min-h-screen">
            {/* Estilos globales (puedes moverlos a index.css o App.css si prefieres) */}
            <style>{` body { font-family: 'Inter', sans-serif; background-color: #18181b; } .active-nav-link { border-bottom-width: 2px; border-color: #60a5fa; color: #60a5fa !important; } .inactive-nav-link { border-bottom-width: 2px; border-color: transparent; color: #a1a1aa; } .inactive-nav-link:hover { border-color: #52525b; color: #e4e4e7 !important; } .tabs-container nav { flex-wrap: wrap; } .search-results { background-color: #27272a; border: 1px solid #3f3f46; } .search-results div { color: #d4d4d8; } .search-results div:hover { background-color: #3f3f46; } .monto-positivo { color: #22c55e; } .monto-negativo { color: #ef4444; } .tabla-scrollable { max-height: 65vh; overflow-y: auto; display: block; } .tabla-scrollable thead { position: sticky; top: 0; z-index: 1; background-color: #27272a; } .tabla-scrollable th { color: #a1a1aa; } `}</style>

            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                    <AppLogo onLogoClick={onLogoClick} className="text-white hover:text-blue-400"/>
                    <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 hidden md:block">Khaleesi System</h1>
                    <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 md:hidden">POS</h1>
                </div>
                {/* Puedes añadir un botón de logout aquí si quieres, o mantenerlo en Configuración */}
            </div>

            <div className="mb-4 border-b border-zinc-700 tabs-container">
                <nav className="flex flex-wrap -mb-px justify-center sm:justify-start" aria-label="Tabs">
                    {tabsData.map(tab => (
                        <motion.div key={tab.id}>
                            <Link
                                to={tab.path}
                                className={`tab-button flex items-center py-2 px-3 font-medium text-center text-sm transition-colors duration-150 ${currentPath === tab.path ? 'active-nav-link' : 'inactive-nav-link'}`}
                                whilehover={{ y: currentPath !== tab.path ? -2 : 0 }}
                                whiletap={{ scale: 0.97 }}
                            >
                                <tab.Icon className="mr-1 sm:mr-1.5 h-4 w-4" strokeWidth={currentPath === tab.path ? 2.5 : 2} />
                                <span className="hidden sm:inline">{tab.label.split('(')[0].trim()}</span>
                                <span className="sm:hidden">{tab.shortLabel}</span>
                                {tab.label.includes('(') && (<span className="hidden sm:inline">{' (' + tab.label.split('(')[1]}</span>)}
                            </Link>
                        </motion.div>
                    ))}
                     {/* Botón de Logout directo en la barra de navegación */}
                     <motion.button
                        onClick={() => {
                            handleLogout();
                            navigate('/login'); // Redirigir al login después de desloguear
                        }}
                        className="tab-button flex items-center py-2 px-3 font-medium text-center text-sm transition-colors duration-150 inactive-nav-link text-red-400 hover:text-red-300 hover:border-red-500 ml-auto" // ml-auto para alinear a la derecha
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.97 }}
                    >
                        <LogOut className="mr-1 sm:mr-1.5 h-4 w-4" strokeWidth={2} />
                        <span className="hidden sm:inline">Salir</span>
                        <span className="sm:hidden">Salir</span>
                    </motion.button>
                </nav>
            </div>

            <div id="tab-content-container">
                <Outlet /> {/* Aquí se renderizarán los componentes de las rutas anidadas */}
            </div>
        </div>
    );
}

export default Layout;