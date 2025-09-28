// frontend/src/screens/PaymentInstructions.jsx

import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { motion } from 'framer-motion';
import { ArrowLeft, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PaymentInstructions = () => {
  const { handleNotifyPayment, isLoading, datosNegocio } = useAppContext();
  const [notified, setNotified] = useState(false);
  const navigate = useNavigate();

  const handleNotificationClick = async () => {
    const success = await handleNotifyPayment();
    if (success) {
      setNotified(true);
    }
  };

  const endDate = datosNegocio?.subscriptionEndDate
    ?.toDate()
    .toLocaleDateString('es-AR');

  return (
    <div className="mx-auto max-w-2xl text-white">
      <button
        onClick={() => navigate('/dashboard')}
        className="mb-4 flex items-center gap-2 text-zinc-400 hover:text-white"
      >
        <ArrowLeft size={16} /> Volver al panel
      </button>

      <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-6">
        <h2 className="mb-2 text-2xl font-bold">Activa tu Suscripción</h2>
        <p className="mb-6 text-zinc-400">
          Tu plan {datosNegocio?.subscriptionStatus} finalizó el {endDate}.
          Sigue estos pasos para reactivarlo:
        </p>

        <div className="space-y-4 rounded-md bg-zinc-900 p-4">
          <div>
            <h3 className="text-lg font-semibold">1. Realiza el pago</h3>
            <p className="text-sm text-zinc-300">
              Transfiere el monto de la suscripción a la siguiente cuenta:
            </p>
            <div className="mt-2 rounded-md bg-zinc-700 p-3 text-sm">
              <p>
                <strong>Banco:</strong> Mercado Pago
              </p>
              <p>
                <strong>CBU:</strong> 0000003100099923998729
              </p>
              <p>
                <strong>Alias:</strong> brian.540.cedas.mp
              </p>
              <p>
                <strong>Titular:</strong> Brian Oviedo
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold">2. Notifícanos tu pago</h3>
            <p className="text-sm text-zinc-300">
              Una vez realizado el pago, haz clic en el siguiente botón para que
              podamos verificarlo y activar tu cuenta. La activación puede
              tardar algunas horas.
            </p>
          </div>
        </div>

        <div className="mt-6">
          {notified ? (
            <div className="rounded-md border border-green-500/30 bg-green-900/50 p-4 text-center text-green-300">
              <h4 className="font-bold">¡Notificación enviada!</h4>
              <p className="text-sm">
                Hemos recibido tu aviso. Activaremos tu cuenta a la brevedad
                posible. Gracias por tu paciencia.
              </p>
            </div>
          ) : (
            <motion.button
              onClick={handleNotificationClick}
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:bg-zinc-500"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isLoading ? (
                'Enviando...'
              ) : (
                <>
                  {' '}
                  <Send size={16} /> Ya realicé el pago, notificar al
                  administrador{' '}
                </>
              )}
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentInstructions;
