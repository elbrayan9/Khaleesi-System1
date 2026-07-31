// frontend/src/screens/PaymentInstructions.jsx

import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { motion } from 'framer-motion';
import { ArrowLeft, Send, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PaymentInstructions = () => {
  const { handleNotifyPayment, isLoading, datosNegocio, mostrarMensaje } =
    useAppContext();
  const [notified, setNotified] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const navigate = useNavigate();

  const handleNotificationClick = async () => {
    const success = await handleNotifyPayment();
    if (success) {
      setNotified(true);
    }
  };

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
      const res = await crearPagoSuscripcion({ plan });
      const url = res.data?.initPoint || res.data?.sandboxInitPoint;
      if (!url) throw new Error('No se recibió el link de pago.');
      window.open(url, '_blank', 'noopener,noreferrer');
      mostrarMensaje?.(
        'Te llevamos a Mercado Pago. Al pagar, tu plan se reactiva solo.',
        'info',
      );
    } catch (e) {
      mostrarMensaje?.(
        `No se pudo iniciar el pago: ${e.message || 'error'}`,
        'error',
      );
    } finally {
      setProcesando(false);
    }
  };

  const endDate = datosNegocio?.subscriptionEndDate
    ? new Date(datosNegocio.subscriptionEndDate).toLocaleDateString('es-AR')
    : null;

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
          Reactivalo en un instante pagando con Mercado Pago:
        </p>

        {/* OPCIÓN RECOMENDADA: pago online con reactivación automática */}
        <div className="mb-6 rounded-md border border-blue-500/40 bg-blue-900/20 p-4">
          <h3 className="mb-1 text-lg font-semibold">
            Pagá online y reactivá al instante
          </h3>
          <p className="mb-3 text-sm text-zinc-300">
            Pagás con Mercado Pago y tu cuenta se reactiva sola, sin esperar.
          </p>
          <motion.button
            onClick={handlePagarSuscripcion}
            disabled={procesando}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-60"
            whileHover={{ scale: procesando ? 1 : 1.02 }}
            whileTap={{ scale: procesando ? 1 : 0.98 }}
          >
            <CreditCard size={16} />
            {procesando ? 'Generando…' : 'Activar Suscripción'}
          </motion.button>
        </div>

        <p className="mb-3 text-sm font-medium text-zinc-400">
          ¿Preferís transferir? También podés:
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
