// src/components/SignUpScreen.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAppContext } from '../context/AppContext.jsx';
import { signUpWithBusiness } from '../services/authService';
import { Eye, EyeOff } from 'lucide-react';
import AppLogo from './AppLogo.jsx';
import Footer from './Footer.jsx';
import ParticleBackground from './ParticleBackground.jsx';

function SignUpScreen() {
  const { mostrarMensaje } = useAppContext();
  const navigate = useNavigate();

  const [nombreNegocio, setNombreNegocio] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!nombreNegocio || !email || !password) {
      mostrarMensaje('Todos los campos son obligatorios.', 'warning');
      return;
    }
    setIsLoading(true);
    try {
      await signUpWithBusiness(email, password, nombreNegocio);
      navigate('/');
    } catch (error) {
      const friendlyMessage =
        error.code === 'auth/email-already-in-use'
          ? 'El correo electrónico ya está en uso.'
          : 'Error al registrar la cuenta. Verifique los datos.';
      mostrarMensaje(friendlyMessage, 'error');
      console.error('Error de registro:', error);
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
          <div className="w-full p-8 sm:p-12 md:w-1/2">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7 }}
            >
              <h2 className="mb-6 text-center text-2xl font-bold text-white">
                Crear una Cuenta
              </h2>

              <form onSubmit={handleSignUp} className="space-y-6">
                <div>
                  <label
                    htmlFor="nombre-negocio"
                    className="mb-1 block text-sm font-medium text-zinc-400"
                  >
                    Nombre del Negocio
                  </label>
                  <input
                    type="text"
                    id="nombre-negocio"
                    value={nombreNegocio}
                    onChange={(e) => setNombreNegocio(e.target.value)}
                    className={inputClasses}
                    required
                    autoComplete="organization"
                  />
                </div>
                <div>
                  <label
                    htmlFor="signup-email"
                    className="mb-1 block text-sm font-medium text-zinc-400"
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    id="signup-email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClasses}
                    required
                    autoComplete="email"
                  />
                </div>
                <div className="relative">
                  <label
                    htmlFor="signup-password"
                    className="mb-1 block text-sm font-medium text-zinc-400"
                  >
                    Contraseña
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="signup-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputClasses}
                    required
                    autoComplete="new-password"
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
                  {isLoading ? 'Registrando...' : 'Crear Cuenta'}
                </motion.button>
              </form>

              <div className="mt-6 text-center text-sm">
                <p className="text-zinc-400">
                  ¿Ya tienes una cuenta?{' '}
                  <Link
                    to="/login"
                    className="font-bold text-blue-400 hover:underline"
                  >
                    Inicia Sesión
                  </Link>
                </p>
              </div>
            </motion.div>
          </div>

          <div className="hidden w-1/2 flex-col items-center justify-center bg-zinc-900/80 p-8 text-center md:flex">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
            >
              <AppLogo width="120" height="120" />
              <h1 className="mt-4 text-3xl font-bold text-white">Bienvenido</h1>
              <p className="mt-2 text-zinc-400">
                Únete y toma el control de tu negocio hoy.
              </p>
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

export default SignUpScreen;
