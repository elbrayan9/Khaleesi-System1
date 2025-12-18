// src/components/SignUpScreen.jsx
import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAppContext } from '../context/AppContext.jsx';
import { signUpWithBusiness, signInWithGoogle } from '../services/authService';
import { Eye, EyeOff, Check, X } from 'lucide-react';
import AppLogo from './AppLogo.jsx';
import Footer from './Footer.jsx';
import ParticleBackground from './ParticleBackground.jsx';
import HoverEffectWrapper from './HoverEffectWrapper.jsx';
import TypeAnimation from './TypeAnimation.jsx';
import { AnimatedButton } from './AnimatedButton.jsx';

function SignUpScreen() {
  const { mostrarMensaje } = useAppContext();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const plan = searchParams.get('plan') || 'basic'; // Default a basic si no hay param

  const [nombreNegocio, setNombreNegocio] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [passwordCriteria, setPasswordCriteria] = useState({
    length: false,
    uppercase: false,
    number: false,
    special: false,
  });

  const validatePassword = (pass) => {
    setPasswordCriteria({
      length: pass.length >= 8,
      uppercase: /[A-Z]/.test(pass),
      number: /[0-9]/.test(pass),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(pass),
    });
  };

  const handlePasswordChange = (e) => {
    const newPass = e.target.value;
    setPassword(newPass);
    validatePassword(newPass);
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!nombreNegocio || !email || !password || !confirmPassword) {
      mostrarMensaje('Todos los campos son obligatorios.', 'warning');
      return;
    }

    if (password !== confirmPassword) {
      mostrarMensaje('Las contraseñas no coinciden.', 'error');
      return;
    }

    const { length, uppercase, number, special } = passwordCriteria;
    if (!length || !uppercase || !number || !special) {
      mostrarMensaje(
        'La contraseña no cumple con los requisitos de seguridad.',
        'warning',
      );
      return;
    }

    setIsLoading(true);
    setIsLoading(true);
    try {
      await signUpWithBusiness(email, password, nombreNegocio, plan);
      mostrarMensaje(
        'Cuenta creada con éxito. Se ha enviado un correo de verificación.',
        'success',
      );
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

  const handleGoogleSignUp = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
      navigate('/');
    } catch (error) {
      mostrarMensaje('Error al registrarse con Google.', 'error');
      console.error('Error Google SignUp:', error);
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
                      onChange={handlePasswordChange}
                      className={inputClasses}
                      required
                      autoComplete="new-password"
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

                  {/* Checklist de Requisitos de Contraseña */}
                  <div className="rounded-md bg-zinc-700/30 p-3 text-xs">
                    <p className="mb-2 font-medium text-zinc-300">
                      La contraseña debe tener:
                    </p>
                    <ul className="space-y-1 text-zinc-400">
                      <li className="flex items-center gap-2">
                        {passwordCriteria.length ? (
                          <Check size={14} className="text-green-500" />
                        ) : (
                          <X size={14} className="text-zinc-500" />
                        )}
                        <span
                          className={
                            passwordCriteria.length
                              ? 'text-green-400'
                              : 'text-zinc-400'
                          }
                        >
                          Mínimo 8 caracteres
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        {passwordCriteria.uppercase ? (
                          <Check size={14} className="text-green-500" />
                        ) : (
                          <X size={14} className="text-zinc-500" />
                        )}
                        <span
                          className={
                            passwordCriteria.uppercase
                              ? 'text-green-400'
                              : 'text-zinc-400'
                          }
                        >
                          Una mayúscula
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        {passwordCriteria.number ? (
                          <Check size={14} className="text-green-500" />
                        ) : (
                          <X size={14} className="text-zinc-500" />
                        )}
                        <span
                          className={
                            passwordCriteria.number
                              ? 'text-green-400'
                              : 'text-zinc-400'
                          }
                        >
                          Un número
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        {passwordCriteria.special ? (
                          <Check size={14} className="text-green-500" />
                        ) : (
                          <X size={14} className="text-zinc-500" />
                        )}
                        <span
                          className={
                            passwordCriteria.special
                              ? 'text-green-400'
                              : 'text-zinc-400'
                          }
                        >
                          Un carácter especial (!@#$...)
                        </span>
                      </li>
                    </ul>
                  </div>

                  <div className="relative">
                    <label
                      htmlFor="signup-confirm-password"
                      className="mb-1 block text-sm font-medium text-zinc-400"
                    >
                      Confirmar Contraseña
                    </label>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      id="signup-confirm-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={inputClasses}
                      required
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute inset-y-0 right-0 top-7 flex items-center pr-3 text-zinc-400 hover:text-white"
                      aria-label={
                        showConfirmPassword
                          ? 'Ocultar contraseña'
                          : 'Mostrar contraseña'
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={20} />
                      ) : (
                        <Eye size={20} />
                      )}
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
                      {isLoading ? 'Registrando...' : 'Crear Cuenta'}
                    </AnimatedButton>
                  </div>
                </form>

                <div className="mt-4">
                  <button
                    type="button"
                    onClick={handleGoogleSignUp}
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
                    Registrarse con Google
                  </button>
                </div>

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
                <h1 className="mt-4 text-3xl font-bold text-white">
                  Bienvenido
                </h1>
                <TypeAnimation
                  words={[
                    'Únete y toma el control.',
                    'Prueba gratis.',
                    'Sin compromisos.',
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
          </div>
        </HoverEffectWrapper>
      </main>

      <div className="relative z-10">
        <Footer simple={true} />
      </div>
    </div>
  );
}

export default SignUpScreen;
