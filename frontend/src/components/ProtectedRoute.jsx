import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

function ProtectedRoute() {
  const { isLoggedIn, isLoadingData } = useAppContext();

  if (isLoadingData) {
    // Muestra un loader mientras se verifica el estado de autenticación/carga de datos
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-900 text-white">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
        <p className="ml-3 text-lg">Verificando...</p>
      </div>
    );
  }

  return isLoggedIn ? <Outlet /> : <Navigate to="/login" replace />;
}

export default ProtectedRoute;
