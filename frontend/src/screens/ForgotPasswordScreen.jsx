import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { sendPasswordReset } from '../services/authService';
import ParticleBackground from '../components/ParticleBackground';

const ForgotPasswordScreen = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setIsLoading(true);

    if (!email) {
      setError('Por favor, ingresa tu correo electrónico.');
      setIsLoading(false);
      return;
    }

    try {
      await sendPasswordReset(email);
      setMessage(
        'Si existe una cuenta con ese correo, se ha enviado un enlace para restablecer tu contraseña.',
      );
    } catch (err) {
      // Por seguridad, es mejor mostrar un mensaje genérico
      setMessage(
        'Si existe una cuenta con ese correo, se ha enviado un enlace para restablecer tu contraseña.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black p-4">
      <ParticleBackground />

      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 my-4 w-full max-w-sm rounded-lg border border-cyan-400/20 bg-black/30 p-8 shadow-xl backdrop-blur-sm"
      >
        <h2 className="mb-2 text-center text-2xl font-bold text-zinc-100">
          Recuperar Contraseña
        </h2>
        <p className="mb-6 text-center text-sm text-zinc-300">
          Ingresa tu correo y te enviaremos un enlace para recuperar tu cuenta.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-medium text-zinc-300"
            >
              Correo Electrónico
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-zinc-600 bg-zinc-700 p-2 text-zinc-100"
              required
            />
          </div>
          <motion.button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-md bg-white/80 px-4 py-2 font-bold text-black transition hover:bg-white"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
          >
            {isLoading ? 'Enviando...' : 'Enviar Enlace'}
          </motion.button>
        </form>

        {message && (
          <p className="mt-4 text-center text-sm text-green-400">{message}</p>
        )}
        {error && (
          <p className="mt-4 text-center text-sm text-red-400">{error}</p>
        )}

        <div className="mt-6 text-center text-xs text-zinc-300">
          <p>
            <Link
              to="/login"
              className="font-medium text-blue-400 hover:underline"
            >
              ¿Ya te acordaste? Iniciar Sesión
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPasswordScreen;
