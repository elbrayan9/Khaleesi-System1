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
            console.error("Error de inicio de sesión:", error);
        } finally {
            setIsLoading(false);
        }
    };

// Reemplaza la sección 'return' completa de tu LoginScreen.jsx con esto:

return (
    <div id="login-screen" className="relative min-h-screen flex flex-col bg-black p-4 overflow-hidden">
        
        {/* --- AÑADIDO: El fondo de partículas animado --- */}
        {/* Este reemplaza tus dos divs de fondo anteriores */}
        <ParticleBackground />

        <main className="flex-1 flex flex-col items-center justify-center w-full z-10">
            {/* Mantenemos tu formulario con su buen estilo */}
            <motion.div 
                initial={{ opacity: 0, y: 50 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="relative bg-black/30 backdrop-blur-sm p-8 rounded-lg shadow-xl w-full max-w-sm my-4 border border-cyan-400/20"
            >
                <div className="text-center mb-6">
                    <AppLogo onLogoClick={() => {}} className="text-white h-12 w-12 mx-auto" />
                    <h1 className="text-3xl font-bold text-white uppercase tracking-wider font-mono mt-4">Khaleesi System</h1>
                </div>
                <h2 className="text-2xl font-bold mb-6 text-center text-zinc-100">Iniciar Sesión</h2>
                
                {/* El formulario no cambia su lógica interna */}
                <form onSubmit={attemptLogin} className="space-y-4">
                    <div>
                        <label htmlFor="login-email" className="block text-sm font-medium text-zinc-300 mb-1">Email:</label>
                        <input type="email" id="login-email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-2 border border-zinc-600 rounded-md bg-zinc-700 text-zinc-100" required />
                    </div>
                    <div className="relative">
                        <label htmlFor="login-password" className="block text-sm font-medium text-zinc-300 mb-1">Contraseña:</label>
                        <input 
                            type={showPassword ? "text" : "password"}
                            id="login-password" 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            className="w-full p-2 border border-zinc-600 rounded-md bg-zinc-700 text-zinc-100" 
                            required 
                        />
                        <button 
                            type="button" 
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 top-6 flex items-center pr-3 text-zinc-400 hover:text-white"
                            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                        >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                    <motion.button type="submit" disabled={isLoading} className="w-full bg-white/80 hover:bg-white text-black font-bold py-2 px-4 rounded-md transition" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                        {isLoading ? 'Ingresando...' : 'Ingresar'}
                    </motion.button>
                     <div className="mt-4 text-center text-xs text-zinc-300">
                        <p className="mb-2">
                            ¿No tienes una cuenta?{' '}
                            <Link to="/signup" className="font-medium text-blue-400 hover:underline">
                                Regístrate aquí
                            </Link>
                        </p>
                        <p>
                            <Link to="/forgot-password" className="font-medium text-blue-400 hover:underline">
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