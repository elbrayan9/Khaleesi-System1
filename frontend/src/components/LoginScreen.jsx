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

  // Reemplaza la sección 'return' completa de tu LoginScreen.jsx con esto:

  return (
    <div
      id="login-screen"
      className="relative flex min-h-screen flex-col overflow-hidden bg-black p-4"
    >
      {/* --- AÑADIDO: El fondo de partículas animado --- */}
      {/* Este reemplaza tus dos divs de fondo anteriores */}
      <ParticleBackground />

      <main className="z-10 flex w-full flex-1 flex-col items-center justify-center">
        {/* Mantenemos tu formulario con su buen estilo */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative my-4 w-full max-w-sm rounded-lg border border-cyan-400/20 bg-black/30 p-8 shadow-xl backdrop-blur-sm"
        >
          <div className="mb-6 text-center">
            <AppLogo
              onLogoClick={() => {}}
              className="mx-auto h-12 w-12 text-white"
            />
            <h1 className="mt-4 font-mono text-3xl font-bold uppercase tracking-wider text-white">
              Khaleesi System
            </h1>
          </div>
          <h2 className="mb-6 text-center text-2xl font-bold text-zinc-100">
            Iniciar Sesión
          </h2>

          {/* El formulario no cambia su lógica interna */}
          <form onSubmit={attemptLogin} className="space-y-4">
            <div>
              <label
                htmlFor="login-email"
                className="mb-1 block text-sm font-medium text-zinc-300"
              >
                Email:
              </label>
              <input
                type="email"
                id="login-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-zinc-600 bg-zinc-700 p-2 text-zinc-100"
                required
              />
            </div>
            <div className="relative">
              <label
                htmlFor="login-password"
                className="mb-1 block text-sm font-medium text-zinc-300"
              >
                Contraseña:
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                id="login-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-zinc-600 bg-zinc-700 p-2 text-zinc-100"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 top-6 flex items-center pr-3 text-zinc-400 hover:text-white"
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
              className="w-full rounded-md bg-white/80 px-4 py-2 font-bold text-black transition hover:bg-white"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
            >
              {isLoading ? 'Ingresando...' : 'Ingresar'}
            </motion.button>
            <div className="mt-4 text-center text-xs text-zinc-300">
              <p className="mb-2">
                ¿No tienes una cuenta?{' '}
                <Link
                  to="/signup"
                  className="font-medium text-blue-400 hover:underline"
                >
                  Regístrate aquí
                </Link>
              </p>
              <p>
                <Link
                  to="/forgot-password"
                  className="font-medium text-blue-400 hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </p>
            </div>
          </form>
        </motion.div>
      </main>

      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  );
}

export default LoginScreen;
