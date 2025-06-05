import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from './context/AppContext.jsx'; // Importa el hook del contexto

// Componentes de las Rutas
import LoginScreen from './components/LoginScreen.jsx';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import VentaTab from './components/VentaTab.jsx';
import ProductosTab from './components/ProductosTab.jsx';
import ClientesTab from './components/ClientesTab.jsx';
import ReportesTab from './components/ReportesTab.jsx';
import NotasCDTab from './components/NotasCDTab.jsx';
import ConfiguracionTab from './components/ConfiguracionTab.jsx';

// Componentes de Modales y de Impresión (se pueden quedar aquí o moverse si se usan en contextos muy específicos)
import PrintReceipt from './components/PrintReceipt.jsx';
import PrintNota from './components/PrintNota.jsx';
import SaleDetailModal from './components/SaleDetailModal.jsx';
import NotaDetailModal from './components/NotaDetailModal.jsx';

// Helpers que se usan en App.jsx (si los modales los necesitan directamente)
import { formatCurrency, obtenerNombreMes } from './utils/helpers.js';

function App() {
    const {
        isLoggedIn, isLoadingData,
        // Datos que los modales podrían necesitar si no los obtienen directamente de su ruta/contexto
        ventas, clientes, notasCD, datosNegocio,
        mostrarMensaje, // Esta prop viene de AppProvider a través de main.jsx
    } = useAppContext();

    const location = useLocation(); // Para AnimatePresence

    // Estados para los modales y la impresión (estos pueden permanecer en App si los modales se quedan aquí)
    const [ventaToPrint, setVentaToPrint] = useState(null);
    const [clienteToPrint, setClienteToPrint] = useState(null);
    const printVentaRef = useRef();

    const [saleDetailModalOpen, setSaleDetailModalOpen] = useState(false);
    const [selectedSaleData, setSelectedSaleData] = useState(null);
    const [selectedSaleClientInfo, setSelectedSaleClientInfo] = useState(null);

    const [notaDetailModalOpen, setNotaDetailModalOpen] = useState(false);
    const [selectedNotaData, setSelectedNotaData] = useState(null);
    const [notaToPrint, setNotaToPrint] = useState(null);
    const printNotaRef = useRef();


    // Funciones para manejar la apertura/cierre de modales y la impresión
    // Estas funciones ahora usan `mostrarMensaje` del contexto si es necesario
    const handlePrintRequest = (venta, cliente) => {
        if (!venta || !venta.id ) { // Ya no se usa isValidFirestoreId aquí, se asume que la venta es válida
            if (mostrarMensaje) mostrarMensaje("ID de venta inválido para imprimir.", "warning");
            return;
        }
        setVentaToPrint(venta);
        setClienteToPrint(cliente);
    };

     useEffect(() => {
        if (ventaToPrint && printVentaRef.current) {
            const timer = setTimeout(() => {
                if (window.print) window.print();
                setVentaToPrint(null);
                setClienteToPrint(null);
            }, 150);
            return () => clearTimeout(timer);
        }
    }, [ventaToPrint]);


    const openSaleDetailModal = (ventaId) => {
        // Se asume que ventaId es válido
        const ventaSeleccionada = ventas.find(v => v.id === ventaId);
        if (ventaSeleccionada) {
            const clienteInfo = clientes.find(c => c.id === ventaSeleccionada.clienteId);
            setSelectedSaleData(ventaSeleccionada);
            setSelectedSaleClientInfo(clienteInfo || { nombre: ventaSeleccionada.clienteNombre || "Cons. Final", id: ventaSeleccionada.clienteId });
            setSaleDetailModalOpen(true);
        } else {
            if (mostrarMensaje) mostrarMensaje("Detalles de la venta no encontrados.", "error");
        }
    };
    const closeSaleDetailModal = () => {
        setSaleDetailModalOpen(false);
        setSelectedSaleData(null);
        setSelectedSaleClientInfo(null);
    };

    const openNotaDetailModal = (notaId) => {
        // Se asume que notaId es válido
        const notaSel = notasCD.find(n => n.id === notaId);
        if (notaSel) {
            setSelectedNotaData(notaSel);
            setNotaDetailModalOpen(true);
        } else {
            if (mostrarMensaje) mostrarMensaje("Detalles de la nota no encontrados.", "error");
        }
    };
    const closeNotaDetailModal = () => {
        setNotaDetailModalOpen(false);
        setSelectedNotaData(null);
    };

    const handlePrintNota = (notaId) => {
        // Se asume que notaId es válido
        const notaSel = notasCD.find(n => n.id === notaId);
        if (notaSel) {
            setNotaToPrint(notaSel);
        } else {
            if (mostrarMensaje) mostrarMensaje("Nota no encontrada para imprimir.", "error");
        }
    };

     useEffect(() => {
        if (notaToPrint && printNotaRef.current) {
            const timer = setTimeout(() => {
                if (window.print) window.print();
                setNotaToPrint(null);
            }, 150);
            return () => clearTimeout(timer);
        }
    }, [notaToPrint]);


    // Si aún está cargando el estado de login/datos iniciales, muestra un loader
    if (isLoadingData && localStorage.getItem('pos_loggedIn') === 'true' && !isLoggedIn) {
         return (
            <div className="flex justify-center items-center min-h-screen bg-zinc-900 text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                <p className="ml-3 text-lg">Cargando Khaleesi System...</p>
            </div>
        );
    }

    return (
        <>
            <AnimatePresence mode="wait">
                <Routes location={location} key={location.pathname}>
                    <Route path="/login" element={isLoggedIn ? <Navigate to="/" replace /> : <LoginScreen />} />
                    <Route element={<ProtectedRoute />}>
                        <Route path="/" element={<Layout />}>
                            {/* Ruta por defecto (ej. Venta) */}
                            <Route index element={<VentaTab />} />
                            <Route path="productos" element={<ProductosTab />} />
                            <Route path="clientes" element={<ClientesTab />} />
                            <Route path="reportes" element={
                                <ReportesTab
                                    onPrintRequest={handlePrintRequest} // Pasar los handlers de modales/impresión
                                    onViewDetailsRequest={openSaleDetailModal}
                                />
                            }/>
                            <Route path="notas" element={
                                <NotasCDTab
                                    onViewDetailsNotaCD={openNotaDetailModal}
                                    onPrintNotaCD={handlePrintNota}
                                />
                            }/>
                            <Route path="configuracion" element={<ConfiguracionTab />} />
                            {/* Ruta catch-all para redirigir a la página principal si no se encuentra la ruta */}
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Route>
                    </Route>
                </Routes>
            </AnimatePresence>

            {/* Componentes de Impresión y Modales (si se mantienen en App.jsx) */}
            <PrintReceipt ref={printVentaRef} venta={ventaToPrint} datosNegocio={datosNegocio} cliente={clienteToPrint} formatCurrency={formatCurrency} />
            <PrintNota ref={printNotaRef} nota={notaToPrint} datosNegocio={datosNegocio} clientes={clientes} formatCurrency={formatCurrency} />

            <AnimatePresence>
                {saleDetailModalOpen && (
                    <SaleDetailModal
                        key="sale-detail-modal"
                        isOpen={saleDetailModalOpen}
                        onClose={closeSaleDetailModal}
                        venta={selectedSaleData}
                        clienteInfo={selectedSaleClientInfo}
                        formatCurrency={formatCurrency}
                    />
                )}
                {notaDetailModalOpen && (
                    <NotaDetailModal
                        key="nota-detail-modal"
                        isOpen={notaDetailModalOpen}
                        onClose={closeNotaDetailModal}
                        nota={selectedNotaData}
                        clientes={clientes}
                        formatCurrency={formatCurrency}
                    />
                )}
            </AnimatePresence>
        </>
    );
}

export default App;