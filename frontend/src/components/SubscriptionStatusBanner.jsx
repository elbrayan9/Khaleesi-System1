// frontend/src/components/SubscriptionStatusBanner.jsx

import React from 'react';
import { useAppContext } from '../context/AppContext';
import { motion } from 'framer-motion';
import { Info, AlertTriangle, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SubscriptionStatusBanner = () => {
  const { datosNegocio,  } = useAppContext();
  const navigate = useNavigate();

  if (!datosNegocio || datosNegocio.subscriptionStatus === 'active') {
    return null; // No mostrar nada si los datos no han cargado o la suscripción está activa
  }

  const { subscriptionStatus, subscriptionEndDate } = datosNegocio;

  // Calculamos los días restantes para el período de prueba
  const endDate = subscriptionEndDate?.toDate();
  const now = new Date();
  const daysLeft = endDate ? Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)) : 0;

  let bannerContent = null;

  if (subscriptionStatus === 'trial') {
    bannerContent = {
      icon: <Info className="text-blue-300" />,
      bgColor: "bg-blue-900/50 border-blue-500/30",
      message: daysLeft > 1
        ? `Te quedan ${daysLeft} días de prueba.`
        : (daysLeft === 1 ? "Te queda 1 día de prueba." : "Tu período de prueba ha terminado."),
      buttonText: "Activar Suscripción"
    };
  } else if (subscriptionStatus === 'expired') {
    bannerContent = {
      icon: <AlertTriangle className="text-red-400" />,
      bgColor: "bg-red-900/50 border-red-500/30",
      message: "Tu suscripción ha vencido. Renueva tu plan para continuar.",
      buttonText: "Renovar Suscripción"
    };
  }

  if (!bannerContent) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col sm:flex-row items-center justify-between p-3 mb-6 text-sm rounded-lg border ${bannerContent.bgColor} gap-3`}
    >
      <div className="flex items-center gap-3">
        {bannerContent.icon}
        <span className="text-zinc-200">{bannerContent.message}</span>
      </div>
      <motion.button 
        className="flex items-center gap-2 px-4 py-2 font-semibold rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors text-xs w-full sm:w-auto justify-center"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => navigate('/payment-instructions')}
      >
        <CreditCard size={14} />
        {bannerContent.buttonText}
      </motion.button>
    </motion.div>
  );
};

export default SubscriptionStatusBanner;