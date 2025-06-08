import React from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import AppLogo from './AppLogo.jsx';
import Footer from './Footer.jsx'; // Importamos el Footer
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
    
    // --- CAMBIO 1: Usamos el hook useLocation ---
    // Esta es la forma correcta en React Router para saber la ruta actual.
    const location = useLocation();
    const currentPath = location.pathname;

    const onLogoClick = () => {
        navigate('/'); 
    };

    return (
        // --- CAMBIO 2: Estructura mejorada para el Footer ---
        <div className="flex flex-col min-h-screen p-3 md:p-6 font-inter bg-zinc-900 text-zinc-200">
            
            <header>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                        <AppLogo onLogoClick={onLogoClick} className="text-white hover:text-blue-400"/>
                        <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 hidden md:block">Khaleesi System</h1>
                        <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 md:hidden">POS</h1>
                    </div>
                </div>

                <div className="mb-4 border-b border-zinc-700 tabs-container">
                    <nav className="flex flex-wrap -mb-px justify-center sm:justify-start" aria-label="Tabs">
                        {tabsData.map(tab => (
                            <motion.div key={tab.id}>
                                <Link
                                    to={tab.path}
                                    className={`tab-button flex items-center py-2 px-3 font-medium text-center text-sm transition-colors duration-150 ${currentPath === tab.path ? 'active-nav-link' : 'inactive-nav-link'}`}
                                >
                                    <tab.Icon className="mr-1 sm:mr-1.5 h-4 w-4" strokeWidth={currentPath === tab.path ? 2.5 : 2} />
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
                            className="tab-button flex items-center py-2 px-3 font-medium text-center text-sm transition-colors duration-150 inactive-nav-link text-red-400 hover:text-red-300 hover:border-red-500 ml-auto"
                        >
                            <LogOut className="mr-1 sm:mr-1.5 h-4 w-4" strokeWidth={2} />
                            <span className="hidden sm:inline">Salir</span>
                            <span className="sm:hidden">Salir</span>
                        </motion.button>
                    </nav>
                </div>
            </header>
            
            {/* El contenido principal ahora es flexible y crece */}
            <main className="flex-1">
                 <Outlet />
            </main>

            {/* --- CAMBIO 3: Footer añadido --- */}
            <Footer />
        </div>
    );
}

export default Layout;