// src/App.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from './context/AppContext.jsx';

// --- Componentes de Rutas Principales ---
import LoginScreen from './components/LoginScreen.jsx';
import SignUpScreen from './components/SignUpScreen.jsx'; // Nuevo
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

// --- Componentes para las Pestañas (Rutas Anidadas) ---
import VentaTab from './components/VentaTab.jsx';
import ProductosTab from './components/ProductosTab.jsx';
import ClientesTab from './components/ClientesTab.jsx';
import ReportesTab from './components/ReportesTab.jsx';
import NotasCDTab from './components/NotasCDTab.jsx';
import ConfiguracionTab from './components/ConfiguracionTab.jsx';

// --- Componentes para Modales e Impresión ---
import PrintReceipt from './components/PrintReceipt.jsx';
import PrintNota from './components/PrintNota.jsx';
import SaleDetailModal from './components/SaleDetailModal.jsx';
import NotaDetailModal from './components/NotaDetailModal.jsx';

// --- Helpers ---
import { formatCurrency } from './utils/helpers.js';

function App() {
    const { 
        isLoggedIn, isLoadingData,
        ventas, clientes, notasCD, datosNegocio, mostrarMensaje 
    } = useAppContext();

    const location = useLocation();

    // --- Estados para Modales e Impresión (se mantienen en App para ser globales) ---
    const [ventaToPrint, setVentaToPrint] = useState(null);
    const [clienteToPrint, setClienteToPrint] = useState(null);
    const printVentaRef = useRef();

    const [saleDetailModalOpen, setSaleDetailModalOpen] = useState(false);
    const [selectedSaleData, setSelectedSaleData] = useState(null);

    const [notaToPrint, setNotaToPrint] = useState(null);
    const printNotaRef = useRef();
    
    const [notaDetailModalOpen, setNotaDetailModalOpen] = useState(false);
    const [selectedNotaData, setSelectedNotaData] = useState(null);
    
    // --- Lógica de Impresión ---
    useEffect(() => {
        if (ventaToPrint && printVentaRef.current) {
            setTimeout(() => { window.print(); setVentaToPrint(null); setClienteToPrint(null); }, 150);
        }
    }, [ventaToPrint]);

    useEffect(() => {
        if (notaToPrint && printNotaRef.current) {
            setTimeout(() => { window.print(); setNotaToPrint(null); }, 150);
        }
    }, [notaToPrint]);
    
    // --- Handlers para abrir modales y solicitar impresiones ---
    const handlePrintRequest = (ventaId) => {
        const venta = ventas.find(v => v.id === ventaId);
        if (venta) {
            const cliente = clientes.find(c => c.id === venta.clienteId);
            setVentaToPrint(venta);
            setClienteToPrint(cliente);
        } else {
            mostrarMensaje("Venta no encontrada para imprimir.", "error");
        }
    };
    
    const openSaleDetailModal = (ventaId) => {
        const venta = ventas.find(v => v.id === ventaId);
        if (venta) {
            setSelectedSaleData(venta);
            setSaleDetailModalOpen(true);
        } else {
            mostrarMensaje("Detalles de la venta no encontrados.", "error");
        }
    };
    
    const handlePrintNota = (notaId) => {
        const nota = notasCD.find(n => n.id === notaId);
        if (nota) {
            setNotaToPrint(nota);
        } else {
            mostrarMensaje("Nota no encontrada para imprimir.", "error");
        }
    };

    const openNotaDetailModal = (notaId) => {
        const nota = notasCD.find(n => n.id === notaId);
        if (nota) {
            setSelectedNotaData(nota);
            setNotaDetailModalOpen(true);
        } else {
            mostrarMensaje("Detalles de la nota no encontrados.", "error");
        }
    };
    
    // Pantalla de carga mientras se verifica el estado de autenticación
    if (isLoadingData) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-zinc-900">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <>
            <AnimatePresence mode="wait">
                <Routes location={location} key={location.pathname}>
                    {/* Rutas Públicas */}
                    <Route path="/login" element={isLoggedIn ? <Navigate to="/" replace /> : <LoginScreen />} />
                    <Route path="/signup" element={isLoggedIn ? <Navigate to="/" replace /> : <SignUpScreen />} />
                    
                    {/* Rutas Protegidas */}
                    <Route element={<ProtectedRoute />}>
                        <Route path="/" element={<Layout />}>
                            {/* La ruta raíz (index) ahora es VentaTab */}
                            <Route index element={<VentaTab />} />
                            
                            {/* Las demás pestañas son rutas anidadas */}
                            <Route path="productos" element={<ProductosTab />} />
                            <Route path="clientes" element={<ClientesTab />} />
                            <Route 
                                path="reportes" 
                                element={<ReportesTab onPrintRequest={handlePrintRequest} onViewDetailsRequest={openSaleDetailModal} />} 
                            />
                            <Route 
                                path="notas" 
                                element={<NotasCDTab onPrintNotaCD={handlePrintNota} onViewDetailsNotaCD={openNotaDetailModal}/>} 
                            />
                            <Route path="configuracion" element={<ConfiguracionTab />} />
                            
                            {/* Ruta "catch-all" para redirigir a la página principal si no se encuentra */}
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Route>
                    </Route>
                    <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
                </Routes>
            </AnimatePresence>

            {/* --- Modales e Impresión (Globales) --- */}
            <PrintReceipt ref={printVentaRef} venta={ventaToPrint} datosNegocio={datosNegocio} cliente={clienteToPrint} formatCurrency={formatCurrency} />
            <PrintNota ref={printNotaRef} nota={notaToPrint} datosNegocio={datosNegocio} clientes={clientes} formatCurrency={formatCurrency} />

            <AnimatePresence>
                {saleDetailModalOpen && (
                    <SaleDetailModal
                        isOpen={saleDetailModalOpen}
                        onClose={() => setSaleDetailModalOpen(false)}
                        venta={selectedSaleData}
                        clienteInfo={clientes.find(c => c.id === selectedSaleData?.clienteId)}
                        formatCurrency={formatCurrency}
                    />
                )}
                 {notaDetailModalOpen && (
                    <NotaDetailModal
                        isOpen={notaDetailModalOpen}
                        onClose={() => setNotaDetailModalOpen(false)}
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