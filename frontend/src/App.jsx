// frontend/src/App.jsx

import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from './context/AppContext.jsx';
import LoginScreen from './components/LoginScreen.jsx';
import SignUpScreen from './components/SignUpScreen.jsx';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import VentaTab from './components/VentaTab.jsx';
import ProductosTab from './components/ProductosTab.jsx';
import ClientesTab from './components/ClientesTab.jsx';
import VendedoresTab from './components/VendedoresTab.jsx';
import ReportesTab from './components/ReportesTab.jsx';
import NotasCDTab from './components/NotasCDTab.jsx';
import ConfiguracionTab from './components/ConfiguracionTab.jsx';
import PrintReceipt from './components/PrintReceipt.jsx';
import PrintNota from './components/PrintNota.jsx';
import SaleDetailModal from './components/SaleDetailModal.jsx';
import NotaDetailModal from './components/NotaDetailModal.jsx';
import { formatCurrency } from './utils/helpers.js';
import AdminPanel from './screens/AdminPanel.jsx';
import UserDetailAdmin from './screens/UserDetailAdmin.jsx';
import LandingPage from './screens/LandingPage.jsx';
import PaymentInstructions from './screens/PaymentInstructions.jsx';

function App() {
    const { 
        isLoggedIn, isLoadingData,
        ventas, clientes, notasCD, datosNegocio, mostrarMensaje 
    } = useAppContext();

    const location = useLocation();
    const [ventaToPrint, setVentaToPrint] = useState(null);
    const [clienteToPrint, setClienteToPrint] = useState(null);
    const printVentaRef = useRef();
    const [saleDetailModalOpen, setSaleDetailModalOpen] = useState(false);
    const [selectedSaleData, setSelectedSaleData] = useState(null);
    const [notaToPrint, setNotaToPrint] = useState(null);
    const printNotaRef = useRef();
    const [notaDetailModalOpen, setNotaDetailModalOpen] = useState(false);
    const [selectedNotaData, setSelectedNotaData] = useState(null);
    


    useEffect(() => {
        if (notaToPrint && printNotaRef.current) {
            setTimeout(() => { window.print(); setNotaToPrint(null); }, 150);
        }
    }, [notaToPrint]);
    
const handlePrintRequest = (ventaObjeto) => {
    if (!ventaObjeto || !ventaObjeto.id) {
        mostrarMensaje('Datos de venta inválidos para imprimir.', 'error');
        return;
    }

    const cliente = clientes.find(c => c.id === ventaObjeto.clienteId);
    setVentaToPrint(ventaObjeto);
    setClienteToPrint(cliente);

    setTimeout(() => {
        const content = printVentaRef.current;
        if (content) {
            const iframe = document.createElement('iframe');
            iframe.style.position = 'absolute';
            iframe.style.width = '0';
            iframe.style.height = '0';
            iframe.style.border = '0';
            document.body.appendChild(iframe);

            const pri = iframe.contentWindow;
            pri.document.open();
            pri.document.write('<html><head><title>&zwnj;</title></head><body>');
            pri.document.write(content.innerHTML);
            pri.document.write('</body></html>');
            pri.document.close();

            pri.focus();
            pri.print();

            document.body.removeChild(iframe);
            setVentaToPrint(null);
            setClienteToPrint(null);
        }
    }, 200);
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
<Routes>
    {/* Rutas Públicas */}
    <Route path="/" element={isLoggedIn ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
    <Route path="/login" element={isLoggedIn ? <Navigate to="/dashboard" replace /> : <LoginScreen />} />
    <Route path="/signup" element={isLoggedIn ? <Navigate to="/dashboard" replace /> : <SignUpScreen />} />
    <Route path="/forgot-password" element={<ForgotPasswordScreen />} />

    {/* Rutas Protegidas */}
    <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Layout />}>
            <Route index element={<VentaTab />} />
            <Route path="productos" element={<ProductosTab />} />
            <Route path="clientes" element={<ClientesTab />} />
            <Route path="vendedores" element={<VendedoresTab />} />
            <Route 
                path="reportes" 
                element={<ReportesTab onPrintRequest={handlePrintRequest} onViewDetailsRequest={openSaleDetailModal} />} 
            />
            <Route 
                path="notas" 
                element={<NotasCDTab onPrintNotaCD={handlePrintNota} onViewDetailsNotaCD={openNotaDetailModal}/>} 
            />
            <Route path="configuracion" element={<ConfiguracionTab />} />
        </Route>
        {/* Rutas de Admin también protegidas */}
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/admin/user/:uid" element={<UserDetailAdmin />} />
        <Route path="payment-instructions" element={<PaymentInstructions />} />
    </Route>

    {/* Redirección para cualquier ruta no encontrada */}
    <Route path="*" element={<Navigate to={isLoggedIn ? "/dashboard" : "/"} replace />} />
</Routes>
            </AnimatePresence>

            <PrintReceipt ref={printVentaRef} venta={ventaToPrint} datosNegocio={datosNegocio} cliente={clienteToPrint} formatCurrency={formatCurrency} />
            <PrintNota ref={printNotaRef} nota={notaToPrint} datosNegocio={datosNegocio} clientes={clientes} formatCurrency={formatCurrency} />

            <AnimatePresence>
                {saleDetailModalOpen && (
                    <SaleDetailModal isOpen={saleDetailModalOpen} onClose={() => setSaleDetailModalOpen(false)} venta={selectedSaleData} clienteInfo={clientes.find(c => c.id === selectedSaleData?.clienteId)} formatCurrency={formatCurrency} datosNegocio={datosNegocio} />
                )}
                 {notaDetailModalOpen && (
                    <NotaDetailModal isOpen={notaDetailModalOpen} onClose={() => setNotaDetailModalOpen(false)} nota={selectedNotaData} clientes={clientes} formatCurrency={formatCurrency} />
                )}
            </AnimatePresence>
        </>
    );
}

export default App;