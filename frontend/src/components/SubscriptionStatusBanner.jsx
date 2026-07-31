// frontend/src/components/SubscriptionStatusBanner.jsx

import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { motion } from 'framer-motion';
import { Info, AlertTriangle, CreditCard } from 'lucide-react';

const SubscriptionStatusBanner = () => {
  const { datosNegocio, mostrarMensaje } = useAppContext();
  const [procesando, setProcesando] = useState(false);

  const handlePagarSuscripcion = async () => {
    setProcesando(true);
    try {
      const { getFunctions, httpsCallable } = await import(
        'firebase/functions'
      );
      const functions = getFunctions();
      const crearPagoSuscripcion = httpsCallable(
        functions,
        'crearPagoSuscripcion',
      );
      const plan = datosNegocio?.plan === 'basic' ? 'basic' : 'premium';
      const res = await crearPagoSuscripcion({
        plan,
        origin: window.location.origin,
      });
      const url = res.data?.initPoint || res.data?.sandboxInitPoint;
      if (!url) throw new Error('No se recibió el link de pago.');
      // Redirigimos en la misma pestaña: evita el bloqueo de pop-ups.
      window.location.assign(url);
    } catch (e) {
      mostrarMensaje?.(
        `No se pudo iniciar el pago: ${e.message || 'error'}`,
        'error',
      );
    } finally {
      setProcesando(false);
    }
  };

  if (!datosNegocio || datosNegocio.subscriptionStatus === 'active') {
    return null; // No mostrar nada si los datos no han cargado o la suscripción está activa
  }

  const { subscriptionStatus, subscriptionEndDate } = datosNegocio;

  // Calculamos los días restantes para el período de prueba
  const endDate = new Date(subscriptionEndDate);
  const now = new Date();
  const daysLeft = endDate
    ? Math.ceil((endDate - now) / (1000 * 60 * 60 * 24))
    : 0;

  let bannerContent = null;

  if (subscriptionStatus === 'trial') {
    bannerContent = {
      icon: <Info className="text-blue-300" />,
      bgColor: 'bg-blue-900/50 border-blue-500/30',
      message:
        daysLeft > 1
          ? `Te quedan ${daysLeft} días de prueba.`
          : daysLeft === 1
            ? 'Te queda 1 día de prueba.'
            : 'Tu período de prueba ha terminado.',
      buttonText: 'Activar Suscripción',
    };
  } else if (subscriptionStatus === 'expired') {
    bannerContent = {
      icon: <AlertTriangle className="text-red-400" />,
      bgColor: 'bg-red-900/50 border-red-500/30',
      message: 'Tu suscripción ha vencido. Renueva tu plan para continuar.',
      buttonText: 'Renovar Suscripción',
    };
  }

  if (!bannerContent) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`mb-6 flex flex-col items-center justify-between rounded-lg border p-3 text-sm sm:flex-row ${bannerContent.bgColor} gap-3`}
    >
      <div className="flex items-center gap-3">
        {bannerContent.icon}
        <span className="text-zinc-200">{bannerContent.message}</span>
      </div>
      <div className="flex w-full flex-col items-stretch gap-1 sm:w-auto sm:items-end">
        <motion.button
          className="flex w-full items-center justify-center gap-2 rounded-md bg-green-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          whileHover={{ scale: procesando ? 1 : 1.05 }}
          whileTap={{ scale: procesando ? 1 : 0.95 }}
          onClick={handlePagarSuscripcion}
          disabled={procesando}
        >
          <CreditCard size={14} />
          {procesando ? 'Generando…' : 'Activar Suscripción'}
        </motion.button>
      </div>
    </motion.div>
  );
};

export default SubscriptionStatusBanner;
