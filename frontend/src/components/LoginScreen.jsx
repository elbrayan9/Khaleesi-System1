// src/components/LoginScreen.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAppContext } from '../context/AppContext.jsx';
import { signIn } from '../services/authService';
import AppLogo from './AppLogo.jsx';

function LoginScreen() {
    const { mostrarMensaje } = useAppContext();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

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

    return (
        <div id="login-screen" className="relative min-h-screen flex flex-col items-center justify-center bg-black p-4 overflow-hidden">
             <div className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(/khaleesi-system.jpg)` }} aria-hidden="true"></div>
            <div className="absolute inset-0 z-0 bg-black bg-opacity-70" aria-hidden="true"></div>
            <motion.div 
                initial={{ opacity: 0, y: 50 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="relative z-10 bg-white/10 backdrop-blur-sm p-8 rounded-lg shadow-xl w-full max-w-sm my-4 border border-white/10"
            >
                <div className="text-center mb-6">
                    <AppLogo onLogoClick={() => {}} className="text-white h-12 w-12 mx-auto" />
                    <h1 className="text-3xl font-bold text-white uppercase tracking-wider font-mono mt-4">Khaleesi System</h1>
                </div>
                <h2 className="text-2xl font-bold mb-6 text-center text-zinc-100">Iniciar Sesión</h2>
                <form onSubmit={attemptLogin} className="space-y-4">
                    <div>
                        <label htmlFor="login-email" className="block text-sm font-medium text-zinc-300 mb-1">Email:</label>
                        <input type="email" id="login-email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-2 border border-zinc-600 rounded-md bg-zinc-700 text-zinc-100" required />
                    </div>
                    <div>
                        <label htmlFor="login-password" className="block text-sm font-medium text-zinc-300 mb-1">Contraseña:</label>
                        <input type="password" id="login-password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-2 border border-zinc-600 rounded-md bg-zinc-700 text-zinc-100" required />
                    </div>
                    <motion.button type="submit" disabled={isLoading} className="w-full bg-white/80 hover:bg-white text-black font-bold py-2 px-4 rounded-md transition" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                        {isLoading ? 'Ingresando...' : 'Ingresar'}
                    </motion.button>
                    
                    {/* --- BLOQUE CORREGIDO Y AÑADIDO --- */}
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
        </div>
    );
}

export default LoginScreen;