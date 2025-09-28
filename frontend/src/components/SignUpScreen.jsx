// src/components/SignUpScreen.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAppContext } from '../context/AppContext.jsx';
import { signUpWithBusiness } from '../services/authService';
import { Eye, EyeOff } from 'lucide-react';
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
      // El monitorAuthState en AppContext se encargará del resto.
      // Navegará a la página principal automáticamente.
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

  return (
    <div
      id="signup-screen"
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black p-4"
    >
      <ParticleBackground />

      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 my-4 w-full max-w-sm rounded-lg border border-cyan-400/20 bg-black/30 p-8 shadow-xl backdrop-blur-sm"
      >
        <h2 className="mb-6 text-center text-2xl font-bold text-zinc-100">
          Crear Cuenta de Negocio
        </h2>
        <form onSubmit={handleSignUp} className="space-y-4">
          <div>
            <label
              htmlFor="nombre-negocio"
              className="mb-1 block text-sm font-medium text-zinc-300"
            >
              Nombre del Negocio:
            </label>
            <input
              type="text"
              id="nombre-negocio"
              value={nombreNegocio}
              onChange={(e) => setNombreNegocio(e.target.value)}
              className="w-full rounded-md border border-zinc-600 bg-zinc-700 p-2 text-zinc-100"
              required
            />
          </div>
          <div>
            <label
              htmlFor="signup-email"
              className="mb-1 block text-sm font-medium text-zinc-300"
            >
              Email:
            </label>
            <input
              type="email"
              id="signup-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-zinc-600 bg-zinc-700 p-2 text-zinc-100"
              required
            />
          </div>
          <div className="relative">
            <label
              htmlFor="signup-password"
              className="mb-1 block text-sm font-medium text-zinc-300"
            >
              Contraseña:
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              id="signup-password"
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
            {isLoading ? 'Registrando...' : 'Crear Cuenta'}
          </motion.button>
          <p className="text-center text-xs text-zinc-300">
            ¿Ya tienes una cuenta?{' '}
            <Link
              to="/login"
              className="font-medium text-blue-400 hover:underline"
            >
              Inicia sesión
            </Link>
          </p>
        </form>
      </motion.div>
    </div>
  );
}

export default SignUpScreen;
