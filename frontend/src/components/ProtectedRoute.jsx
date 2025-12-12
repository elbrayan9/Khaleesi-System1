import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

function ProtectedRoute() {
  const { isLoggedIn, isLoadingData, datosNegocio, isAdmin } = useAppContext();

  if (isLoadingData) {
    // Muestra un loader mientras se verifica el estado de autenticación/carga de datos
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-900 text-white">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
        <p className="ml-3 text-lg">Verificando...</p>
      </div>
    );
  }

  const location = useLocation();

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  // BLOQUEO POR SUSCRIPCIÓN VENCIDA
  // Si el usuario NO es admin y su estado es 'expired'
  if (!isAdmin && datosNegocio?.subscriptionStatus === 'expired') {
    // Si NO estamos ya en la página de instrucciones de pago, redirigir
    if (location.pathname !== '/payment-instructions') {
      return <Navigate to="/payment-instructions" replace />;
    }
  } else {
    // Si NO está vencido (o es admin), pero intenta entrar a /payment-instructions,
    // podríamos redirigirlo al dashboard para que no se quede ahí atrapado,
    // salvo que quiera ver las instrucciones voluntariamente.
    // Por ahora, lo dejamos libre.
  }

  return <Outlet />;
}

export default ProtectedRoute;
