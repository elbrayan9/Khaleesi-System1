// src/components/LoginScreen.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAppContext } from '../context/AppContext.jsx';
import { signIn } from '../services/authService';
import { Eye, EyeOff } from 'lucide-react';
import AppLogo from './AppLogo.jsx';
import Footer from './Footer.jsx';
import ParticleBackground from './ParticleBackground.jsx';

function LoginScreen() {
  const { mostrarMensaje } = useAppContext();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const attemptLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signIn(email, password);
      navigate('/');
    } catch (error) {
      mostrarMensaje('Email o contraseña incorrectos.', 'error');
      console.error('Error de inicio de sesión:', error);
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

      <main className="relative z-10 flex flex-grow items-center justify-center p-4">
        <div className="flex w-full max-w-4xl overflow-hidden rounded-lg border border-zinc-700/50 bg-zinc-800/50 shadow-2xl backdrop-blur-sm">
          <div className="hidden w-1/2 flex-col items-center justify-center bg-zinc-900/80 p-8 text-center md:flex">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
            >
              <AppLogo width="120" height="120" />
              <h1 className="mt-4 text-3xl font-bold text-white">
                Khaleesi System
              </h1>
              <p className="mt-2 text-zinc-400">
                Tu negocio, en un solo lugar.
              </p>
            </motion.div>
          </div>

          <div className="w-full p-8 sm:p-12 md:w-1/2">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7 }}
            >
              <h2 className="mb-6 text-center text-2xl font-bold text-white">
                Iniciar Sesión
              </h2>

              <form onSubmit={attemptLogin} className="space-y-6">
                <div>
                  <label
                    htmlFor="email"
                    className="mb-1 block text-sm font-medium text-zinc-400"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClasses}
                    required
                    autoComplete="email"
                  />
                </div>

                <div className="relative">
                  <label
                    htmlFor="password"
                    className="mb-1 block text-sm font-medium text-zinc-400"
                  >
                    Contraseña
                  </label>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputClasses}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 top-7 flex items-center pr-3 text-zinc-400 hover:text-white"
                    aria-label={
                      showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
                    }
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>

                <motion.button
                  type="submit"
                  disabled={isLoading}
                  className={buttonClasses}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isLoading ? 'Ingresando...' : 'Ingresar'}
                </motion.button>
              </form>

              <div className="mt-6 text-center text-sm">
                <Link
                  to="/forgot-password"
                  className="text-blue-400 hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <div className="mt-4 text-center text-sm">
                <p className="text-zinc-400">
                  ¿No tienes una cuenta?{' '}
                  <Link
                    to="/signup"
                    className="font-bold text-blue-400 hover:underline"
                  >
                    Regístrate
                  </Link>
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  );
}

export default LoginScreen;
