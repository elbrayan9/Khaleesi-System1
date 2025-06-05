import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { BrowserRouter } from 'react-router-dom';
import { AppProvider } from './context/AppContext.jsx'; // Importa el AppProvider

// Las funciones de SweetAlert se definen aquí o en un helper y se pasan a AppProvider
import Swal from 'sweetalert2';

const mostrarMensajeDark = (texto, tipo = 'info') => {
    Swal.fire({
        title: tipo === 'error' ? 'Error Grave' : (tipo === 'success' ? 'Éxito' : (tipo === 'warning' ? 'Advertencia' : 'Información')),
        text: texto, icon: tipo, confirmButtonText: 'Aceptar', heightAuto: false, background: '#27272a', color: '#e4e4e7', confirmButtonColor: '#3b82f6',
        customClass: { popup: 'text-sm rounded-lg', title: '!text-zinc-100 !text-xl', htmlContainer: '!text-zinc-300', confirmButton: 'px-4 py-2 rounded-md text-white hover:bg-blue-700 focus:ring-blue-500', icon: tipo === 'error' ? '!text-red-400 border-red-400' : (tipo === 'success' ? '!text-green-400 border-green-400' : (tipo === 'warning' ? '!text-yellow-400 border-yellow-400' : '!text-blue-400 border-blue-400')) }
     });
};
const confirmarAccionDark = async (titulo, texto, icono = 'warning', confirmButtonText = 'Sí, continuar') => {
    const resultado = await Swal.fire({
        title: titulo, text: texto, icon: icono, showCancelButton: true, confirmButtonColor: '#3b82f6', cancelButtonColor: '#ef4444', confirmButtonText: confirmButtonText, cancelButtonText: 'Cancelar', heightAuto: false, background: '#27272a', color: '#e4e4e7',
        customClass: { popup: 'text-sm rounded-lg', title: '!text-zinc-100 !text-xl', htmlContainer: '!text-zinc-300', confirmButton: `px-4 py-2 rounded-md text-white ${confirmButtonText.toLowerCase().includes("eliminar") ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'}`, cancelButton: 'px-4 py-2 rounded-md bg-zinc-600 text-zinc-200 hover:bg-zinc-500 focus:ring-zinc-500', icon: icono === 'error' ? '!text-red-400 border-red-400' : (icono === 'success' ? '!text-green-400 border-green-400' : (icono === 'warning' ? '!text-yellow-400 border-yellow-400' : '!text-blue-400 border-blue-400')) }
    });
    return resultado.isConfirmed;
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppProvider mostrarMensaje={mostrarMensajeDark} confirmarAccion={confirmarAccionDark}>
        <App />
      </AppProvider>
    </BrowserRouter>
  </React.StrictMode>,
);