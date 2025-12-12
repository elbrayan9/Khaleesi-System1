// src/screens/ForgotPasswordScreen.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { sendPasswordReset } from '../services/authService';
import AppLogo from '../components/AppLogo';
import Footer from '../components/Footer';
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
      setMessage(
        'Si existe una cuenta con ese correo, se ha enviado un enlace para restablecer tu contraseña.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const inputClasses =
    'w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none transition duration-200';
  const buttonClasses =
    'w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition duration-200 disabled:opacity-50';

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-zinc-900 text-zinc-200">
      <ParticleBackground />

      <main className="relative z-10 flex flex-grow flex-col items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="w-full max-w-md space-y-6 rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-8 shadow-2xl backdrop-blur-sm"
        >
          <div className="text-center">
            <AppLogo width="80" height="80" className="mx-auto" />
            <h2 className="mt-4 text-2xl font-bold text-white">
              Recuperar Contraseña
            </h2>
            <p className="mt-2 text-zinc-400">
              Ingresa tu email y te enviaremos un enlace para restablecerla.
            </p>
          </div>

          {message && (
            <p className="rounded-md bg-green-900/50 p-3 text-center text-green-400">
              {message}
            </p>
          )}
          {error && (
            <p className="rounded-md bg-red-900/50 p-3 text-center text-red-400">
              {error}
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="sr-only">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Tu dirección de email"
                className={inputClasses}
                required
                autoComplete="email"
              />
            </div>

            <motion.button
              type="submit"
              disabled={isLoading}
              className={buttonClasses}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
            >
              {isLoading ? 'Enviando...' : 'Enviar Correo'}
            </motion.button>
          </form>

          <div className="text-center text-sm">
            <Link
              to="/login"
              className="font-medium text-blue-400 hover:underline"
            >
              &larr; Volver a Iniciar Sesión
            </Link>
          </div>
        </motion.div>
      </main>

      <div className="relative z-10">
        <Footer simple={true} />
      </div>
    </div>
  );
};

export default ForgotPasswordScreen;
