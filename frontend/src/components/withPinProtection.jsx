import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

export const withPinProtection = (WrappedComponent) => {
  return function ProtectedRoute(props) {
    const { datosNegocio, isSessionUnlocked, solicitarPin } = useAppContext();
    const navigate = useNavigate();
    const [isAllowed, setIsAllowed] = useState(false);
    
    // Asumimos que datosNegocio ya está cargado si llegamos acá (Layout suele bloquear mientras isDataLoading es true).
    const hasRequested = React.useRef(false);
    
    useEffect(() => {
      const checkAccess = async () => {
        // Evitamos que vuelva a pedir si el componente se re-renderiza antes de que Swal termine
        if (hasRequested.current) return;
        hasRequested.current = true;

        // 1. Si no hay PIN configurado en los datos del negocio, se pasa derecho.
        if (!datosNegocio?.pinSeguridad) {
          setIsAllowed(true);
          return;
        }
        
        // 2. Solicitar PIN interactivo (siempre que se abre la solapa)
        const success = await solicitarPin();
        if (success) {
          setIsAllowed(true);
        } else {
          // Si cancela o cierra la alerta, echar para atrás (Dashboard root recomendado)
          navigate('/dashboard');
        }
      };

      checkAccess();
      // Solo correr cuando monta el componente o cambia PIN.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [datosNegocio?.pinSeguridad]);

    // Mientras se resuelve el prompt o las reglas, no renderizamos el componente sensible.
    if (!isAllowed) {
      return (
        <div className="flex h-full items-center justify-center p-8 text-zinc-400">
          <p className="flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-400 border-t-transparent"></span>
            Verificando seguridad...
          </p>
        </div>
      );
    }

    // Acceso permitido
    return <WrappedComponent {...props} />;
  };
};

export default withPinProtection;
