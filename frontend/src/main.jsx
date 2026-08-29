import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { BrowserRouter } from 'react-router-dom';
import { AppProvider } from './context/AppContext.jsx'; // Importa el AppProvider
import { iniciarPixel } from './utils/metaPixel.js';

// El aspecto de las alertas vive en utils/swalTheme.js; acá solo se enchufan
// al provider, que es de donde las toma todo el sistema.
import { mostrarMensaje, confirmarAccion } from './utils/swalTheme.js';

// Antes de montar React, para no perder la vista de la primera pantalla.
iniciarPixel();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppProvider
        mostrarMensaje={mostrarMensaje}
        confirmarAccion={confirmarAccion}
      >
        <App />
      </AppProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
