// frontend/src/screens/PaymentInstructions.jsx

import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  CreditCard,
  ShieldCheck,
  Zap,
  BadgeCheck,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PLANES = {
  basic: { nombre: 'Básico', precio: 15000, anual: 135000 },
  premium: { nombre: 'Completo', precio: 25000, anual: 250000 },
};

const PaymentInstructions = () => {
  const { datosNegocio, mostrarMensaje } = useAppContext();
  const [procesando, setProcesando] = useState(false);
  const [ciclo, setCiclo] = useState('mensual'); // 'mensual' | 'anual'
  const navigate = useNavigate();

  const planKey = datosNegocio?.plan === 'basic' ? 'basic' : 'premium';
  const plan = PLANES[planKey];

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
      const res = await crearPagoSuscripcion({
        plan: planKey,
        ciclo,
        origin: window.location.origin,
      });
      const url = res.data?.initPoint || res.data?.sandboxInitPoint;
      if (!url) throw new Error('No se recibió el link de pago.');
      // Redirigimos en la misma pestaña: evita el bloqueo de pop-ups y al
      // volver de Mercado Pago la app recarga el estado de la suscripción.
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

  const endDate = datosNegocio?.subscriptionEndDate
    ? new Date(datosNegocio.subscriptionEndDate).toLocaleDateString('es-AR')
    : null;

  const esVencida = datosNegocio?.subscriptionStatus === 'expired';

  return (
    <div className="mx-auto max-w-lg text-white">
      <button
        onClick={() => navigate('/dashboard')}
        className="mb-4 flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-white"
      >
        <ArrowLeft size={16} /> Volver al panel
      </button>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="overflow-hidden rounded-2xl border border-zinc-700/80 bg-zinc-800/60 shadow-2xl shadow-black/40 backdrop-blur"
      >
        {/* Encabezado */}
        <div className="border-b border-zinc-700/60 bg-gradient-to-b from-emerald-500/10 to-transparent px-6 py-7 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/15 ring-1 ring-emerald-400/30">
            <CreditCard className="text-emerald-400" size={22} />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">
            Activá tu Suscripción
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-zinc-400">
            {esVencida
              ? `Tu suscripción venció${endDate ? ` el ${endDate}` : ''}.`
              : `Tu período de prueba finalizó${endDate ? ` el ${endDate}` : ''}.`}{' '}
            Reactivala al instante y seguí operando sin interrupciones.
          </p>
        </div>

        <div className="px-6 py-6">
          {/* Selector mensual / anual */}
          <div className="mb-4 flex justify-center gap-2">
            {[
              ['mensual', 'Mensual'],
              ['anual', 'Anual (2 meses gratis)'],
            ].map(([val, lbl]) => (
              <button
                key={val}
                type="button"
                onClick={() => setCiclo(val)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  ciclo === val
                    ? 'bg-emerald-600 text-white'
                    : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                }`}
              >
                {lbl}
              </button>
            ))}
          </div>

          {/* Resumen del plan */}
          <div className="mb-5 flex items-center justify-between rounded-xl border border-zinc-700/70 bg-zinc-900/60 px-4 py-3.5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                Tu plan
              </p>
              <p className="text-base font-semibold text-white">
                Khaleesi {plan.nombre}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold tracking-tight text-white">
                $
                {(ciclo === 'anual' ? plan.anual : plan.precio).toLocaleString(
                  'es-AR',
                )}
              </p>
              <p className="text-[11px] text-zinc-500">
                {ciclo === 'anual' ? 'por año · 12 meses' : 'por mes · 1 pago'}
              </p>
            </div>
          </div>

          {/* Botón principal */}
          <motion.button
            onClick={handlePagarSuscripcion}
            disabled={procesando}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3.5 text-base font-semibold text-white shadow-lg shadow-emerald-900/40 transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
            whileHover={{ scale: procesando ? 1 : 1.02 }}
            whileTap={{ scale: procesando ? 1 : 0.98 }}
          >
            <CreditCard size={18} />
            {procesando ? 'Generando link…' : 'Activar Suscripción'}
          </motion.button>

          <p className="mt-3 text-center text-xs text-zinc-500">
            Te redirigimos al pago seguro de Mercado Pago.
          </p>

          {/* Garantías */}
          <div className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <Garantia
              icon={<Zap size={16} />}
              titulo="Al instante"
              detalle="Se reactiva solo"
            />
            <Garantia
              icon={<BadgeCheck size={16} />}
              titulo="1 pago"
              detalle="Sin recargo"
            />
            <Garantia
              icon={<ShieldCheck size={16} />}
              titulo="Seguro"
              detalle="Vía Mercado Pago"
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const Garantia = ({ icon, titulo, detalle }) => (
  <div className="flex flex-col items-center gap-1 rounded-xl border border-zinc-700/50 bg-zinc-900/40 px-3 py-3 text-center">
    <span className="text-emerald-400">{icon}</span>
    <span className="text-sm font-semibold text-white">{titulo}</span>
    <span className="text-[11px] text-zinc-500">{detalle}</span>
  </div>
);

export default PaymentInstructions;
