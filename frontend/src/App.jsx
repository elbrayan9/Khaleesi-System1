// frontend/src/App.jsx

import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from './context/AppContext.jsx';
import AppLogo from './components/AppLogo.jsx';
import LoginScreen from './components/LoginScreen.jsx';
import SignUpScreen from './components/SignUpScreen.jsx';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import Layout from './components/Layout.jsx';
import PublicProductView from './screens/PublicProductView';
import BulkPrintView from './screens/BulkPrintView';
import PriceCheckerView from './screens/PriceCheckerView.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import VentaTab from './components/VentaTab.jsx';
import ProductosTab from './components/ProductosTab.jsx';
import ClientesTab from './components/ClientesTab.jsx';
import VendedoresTab from './components/VendedoresTab.jsx';
import ProveedoresTab from './components/ProveedoresTab.jsx';
import PedidosTab from './components/PedidosTab.jsx';
import PresupuestosTab from './components/PresupuestosTab.jsx';
import EstadisticasTab from '@/components/EstadisticasTab.jsx';
import ReportesTab from './components/ReportesTab.jsx';
import NotasCDTab from './components/NotasCDTab.jsx';
import ConfiguracionTab from './components/ConfiguracionTab.jsx';
import PrintReceipt from './components/PrintReceipt.jsx';
import PrintNota from './components/PrintNota.jsx';
import SaleDetailModal from './components/SaleDetailModal.jsx';
import NotaDetailModal from './components/NotaDetailModal.jsx';
import { formatCurrency } from './utils/helpers.js';
import { generarPdfVenta } from './services/pdfService'; // Importar servicio PDF
import AdminPanel from './screens/AdminPanel.jsx';
import UserDetailAdmin from './screens/UserDetailAdmin.jsx';
import LandingPage from './screens/LandingPage.jsx';
import PaymentInstructions from './screens/PaymentInstructions.jsx';

function App() {
  const {
    isLoggedIn,
    isLoadingData,
    ventas,
    clientes,
    notasCD,
    datosNegocio,
    mostrarMensaje,
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
      setTimeout(() => {
        window.print();
        setNotaToPrint(null);
      }, 150);
    }
  }, [notaToPrint]);

  const handlePrintRequest = async (ventaObjeto, accion = 'print') => {
    if (!ventaObjeto || !ventaObjeto.id) {
      mostrarMensaje('Datos de venta inválidos para imprimir.', 'error');
      return;
    }

    try {
      const cliente = clientes.find((c) => c.id === ventaObjeto.clienteId) || {
        nombre: ventaObjeto.clienteNombre || 'Consumidor Final',
        cuit: ventaObjeto.clienteCuit || '',
        direccion: '',
        condicionFiscal: 'Consumidor Final',
      };

      // Determinar Tipo de Documento
      let tipoDoc = 'Ticket X';
      if (ventaObjeto.afipData) {
        const tipo = parseInt(ventaObjeto.afipData.cbteTipo, 10);
        if (tipo === 1) tipoDoc = 'Factura A';
        if (tipo === 6) tipoDoc = 'Factura B';
        if (tipo === 11) tipoDoc = 'Factura C';
      } else if (ventaObjeto.tipo === 'Presupuesto') {
        tipoDoc = 'Presupuesto';
      }

      await generarPdfVenta(
        ventaObjeto,
        datosNegocio,
        cliente,
        tipoDoc,
        accion,
      );

      if (accion === 'download') {
        mostrarMensaje('PDF descargado.', 'success');
      } else {
        mostrarMensaje('Abriendo impresión...', 'info');
      }
    } catch (error) {
      console.error('Error generando PDF de venta:', error);
      mostrarMensaje('Error al generar PDF.', 'error');
    }
  };

  const openSaleDetailModal = (ventaId) => {
    const venta = ventas.find((v) => v.id === ventaId);
    if (venta) {
      setSelectedSaleData(venta);
      setSaleDetailModalOpen(true);
    } else {
      mostrarMensaje('Detalles de la venta no encontrados.', 'error');
    }
  };

  const handlePrintNota = async (notaId, accion = 'print') => {
    const nota = notasCD.find((n) => n.id === notaId);
    if (!nota) {
      mostrarMensaje('Nota no encontrada para imprimir.', 'error');
      return;
    }

    try {
      const cliente = clientes.find((c) => c.id === nota.clienteId) || {
        nombre: nota.clienteNombre,
        cuit: nota.clienteCuit, // Si existe en la nota
        direccion: '',
        condicionFiscal: 'Consumidor Final',
      };

      // Determinar Tipo de Documento para el PDF
      let tipoDoc = 'Nota de Crédito X'; // Default Interna
      if (nota.tipo === 'debito') tipoDoc = 'Nota de Débito X';

      // Si es fiscal (tiene CAE), usamos el tipo correcto
      if (nota.cae && nota.cbteTipo) {
        const tipo = parseInt(nota.cbteTipo, 10);
        if (tipo === 3) tipoDoc = 'Nota de Crédito A';
        if (tipo === 8) tipoDoc = 'Nota de Crédito B';
        if (tipo === 13) tipoDoc = 'Nota de Crédito C';
        if (tipo === 2) tipoDoc = 'Nota de Débito A';
        if (tipo === 7) tipoDoc = 'Nota de Débito B';
        if (tipo === 12) tipoDoc = 'Nota de Débito C';
      }

      // Adaptar objeto nota a formato venta para el servicio PDF
      const notaParaPdf = {
        id: nota.id,
        fecha: nota.fecha, // Asumiendo formato DD/MM/YYYY
        total: nota.monto,
        clienteNombre: nota.clienteNombre,
        clienteCuit: nota.clienteCuit || cliente.cuit,
        metodoPago: nota.metodoPago || 'Cuenta Corriente',
        items:
          nota.itemsDevueltos && nota.itemsDevueltos.length > 0
            ? nota.itemsDevueltos.map((item) => ({
                codigoBarras: item.id ? item.id.substring(0, 5) : 'ITEM',
                nombre: item.nombre,
                cantidad: item.cantidad,
                precioOriginal: item.precioOriginal || 0,
                descuentoPorcentaje: 0,
                precioFinal: item.precioOriginal || 0,
              }))
            : [
                {
                  codigoBarras: 'SERV',
                  nombre: nota.motivo || 'Ajuste / Concepto',
                  cantidad: 1,
                  precioOriginal: nota.monto,
                  descuentoPorcentaje: 0,
                  precioFinal: nota.monto,
                },
              ],
        afipData: {
          cae: nota.cae,
          caeFchVto: nota.caeFchVto,
          ptoVta: nota.ptoVta,
          cbteTipo: nota.cbteTipo,
          cbteNro: nota.cbteNro,
          docTipo: nota.docTipo || 99,
          docNro: nota.docNro || 0,
        },
      };

      await generarPdfVenta(
        notaParaPdf,
        datosNegocio,
        cliente,
        tipoDoc,
        accion,
      );
      if (accion === 'download') {
        mostrarMensaje('PDF descargado.', 'success');
      } else {
        mostrarMensaje('Abriendo impresión...', 'info');
      }
    } catch (error) {
      console.error('Error generando PDF de nota:', error);
      mostrarMensaje('Error al generar PDF.', 'error');
    }
  };

  const openNotaDetailModal = (notaId) => {
    const nota = notasCD.find((n) => n.id === notaId);
    if (nota) {
      setSelectedNotaData(nota);
      setNotaDetailModalOpen(true);
    } else {
      mostrarMensaje('Detalles de la nota no encontrados.', 'error');
    }
  };

  if (isLoadingData) {
    // ...ahora mostramos tu animación personalizada
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-900 text-white">
        <div className="relative flex h-40 w-40 items-center justify-center">
          <motion.svg
            className="absolute h-full w-full"
            viewBox="0 0 100 100"
            initial="hidden"
            animate="visible"
          >
            <motion.circle
              cx="50"
              cy="50"
              r="45"
              stroke="#3b82f6"
              strokeWidth="5"
              fill="transparent"
              strokeLinecap="round"
              variants={{
                hidden: { pathLength: 0, opacity: 0 },
                visible: {
                  pathLength: 1,
                  opacity: 1,
                  transition: {
                    pathLength: {
                      type: 'spring',
                      duration: 1.5,
                      bounce: 0,
                      repeat: Infinity,
                    },
                    opacity: { duration: 0.1 },
                  },
                },
              }}
            />
          </motion.svg>
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2.5, ease: 'easeInOut', repeat: Infinity }}
          >
            <AppLogo width="90" height="90" />
          </motion.div>
        </div>
        <p className="mt-6 text-lg font-semibold text-zinc-300">Cargando...</p>
      </div>
    );
  }

  return (
    <>
      <AnimatePresence mode="wait">
        <Routes>
          {/* Rutas Públicas */}
          <Route
            path="/"
            element={
              isLoggedIn ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <LandingPage />
              )
            }
          />
          <Route path="/product/:productId" element={<PublicProductView />} />
          <Route path="/print-labels" element={<BulkPrintView />} />
          <Route path="/verificador" element={<PriceCheckerView />} />
          <Route
            path="/login"
            element={
              isLoggedIn ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <LoginScreen />
              )
            }
          />
          <Route
            path="/signup"
            element={
              isLoggedIn ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <SignUpScreen />
              )
            }
          />
          <Route path="/forgot-password" element={<ForgotPasswordScreen />} />

          {/* Rutas Protegidas */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Layout />}>
              <Route index element={<VentaTab />} />
              <Route path="productos" element={<ProductosTab />} />
              <Route path="clientes" element={<ClientesTab />} />
              <Route path="vendedores" element={<VendedoresTab />} />
              <Route path="proveedores" element={<ProveedoresTab />} />
              <Route path="pedidos" element={<PedidosTab />} />
              <Route path="presupuestos" element={<PresupuestosTab />} />
              <Route path="estadisticas" element={<EstadisticasTab />} />
              <Route
                path="reportes"
                element={
                  <ReportesTab
                    onPrintRequest={handlePrintRequest}
                    onViewDetailsRequest={openSaleDetailModal}
                  />
                }
              />
              <Route
                path="notas"
                element={
                  <NotasCDTab
                    onPrintNotaCD={handlePrintNota}
                    onViewDetailsNotaCD={openNotaDetailModal}
                  />
                }
              />
              <Route path="configuracion" element={<ConfiguracionTab />} />
            </Route>
            {/* Rutas de Admin también protegidas */}
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/admin/user/:uid" element={<UserDetailAdmin />} />
            <Route
              path="payment-instructions"
              element={<PaymentInstructions />}
            />
          </Route>

          {/* Redirección para cualquier ruta no encontrada */}
          <Route
            path="*"
            element={<Navigate to={isLoggedIn ? '/dashboard' : '/'} replace />}
          />
        </Routes>
      </AnimatePresence>

      <PrintReceipt
        ref={printVentaRef}
        venta={ventaToPrint}
        datosNegocio={datosNegocio}
        cliente={clienteToPrint}
        formatCurrency={formatCurrency}
      />
      <PrintNota
        ref={printNotaRef}
        nota={notaToPrint}
        datosNegocio={datosNegocio}
        clientes={clientes}
        formatCurrency={formatCurrency}
      />

      <AnimatePresence>
        {saleDetailModalOpen && (
          <SaleDetailModal
            isOpen={saleDetailModalOpen}
            onClose={() => setSaleDetailModalOpen(false)}
            venta={selectedSaleData}
            clienteInfo={clientes.find(
              (c) => c.id === selectedSaleData?.clienteId,
            )}
            formatCurrency={formatCurrency}
            datosNegocio={datosNegocio}
            onPrint={handlePrintRequest}
          />
        )}
        {notaDetailModalOpen && (
          <NotaDetailModal
            isOpen={notaDetailModalOpen}
            onClose={() => setNotaDetailModalOpen(false)}
            nota={selectedNotaData}
            clientes={clientes}
            formatCurrency={formatCurrency}
            onPrint={handlePrintNota}
          />
        )}
      </AnimatePresence>
    </>
  );
}

export default App;
