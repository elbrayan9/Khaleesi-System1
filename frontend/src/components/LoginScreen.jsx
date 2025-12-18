// src/components/LoginScreen.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAppContext } from '../context/AppContext.jsx';
import { signIn, signInWithGoogle } from '../services/authService';
import { Eye, EyeOff } from 'lucide-react';
import AppLogo from './AppLogo.jsx';
import HoverEffectWrapper from './HoverEffectWrapper.jsx';
import TypeAnimation from './TypeAnimation.jsx';
import { AnimatedButton } from './AnimatedButton.jsx';
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

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
      navigate('/');
    } catch (error) {
      mostrarMensaje('Error al iniciar sesión con Google.', 'error');
      console.error('Error Google Login:', error);
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
        <HoverEffectWrapper className="flex w-full max-w-4xl overflow-hidden rounded-lg border border-zinc-700/50 bg-zinc-800/50 shadow-2xl backdrop-blur-sm">
          <div
            className="flex w-full flex-col md:flex-row"
            data-glow-color="rgba(59, 130, 246, 0.15)"
          >
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
                <TypeAnimation
                  words={[
                    'Tu negocio, en un solo lugar.',
                    'Control total.',
                    'Crecimiento sin límites.',
                  ]}
                  typingSpeed={80}
                  deletingSpeed={50}
                  pauseDuration={2000}
                  gradientFrom="zinc-400"
                  gradientTo="zinc-200"
                  className="mt-2 block text-zinc-400"
                />
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
                        showPassword
                          ? 'Ocultar contraseña'
                          : 'Mostrar contraseña'
                      }
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>

                  <div className="flex justify-center">
                    <AnimatedButton
                      type="submit"
                      disabled={isLoading}
                      className="w-full font-bold text-white"
                      background="#2563eb"
                      shimmerColor="rgba(255,255,255,0.4)"
                      shimmerDuration="2s"
                      glow={true}
                    >
                      {isLoading ? 'Ingresando...' : 'Ingresar'}
                    </AnimatedButton>
                  </div>
                </form>

                <div className="mt-4">
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-md border border-zinc-600 bg-white px-4 py-2 font-medium text-zinc-800 transition hover:bg-zinc-100 disabled:opacity-50"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    Iniciar sesión con Google
                  </button>
                </div>

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
        </HoverEffectWrapper>
      </main>

      <div className="relative z-10">
        <Footer simple={true} />
      </div>
    </div>
  );
}

export default LoginScreen;
