// src/components/SignUpScreen.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAppContext } from '../context/AppContext.jsx';
import { signUpWithBusiness } from '../services/authService';

function SignUpScreen() {
    const { mostrarMensaje } = useAppContext();
    const navigate = useNavigate();

    const [nombreNegocio, setNombreNegocio] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

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
            const friendlyMessage = error.code === 'auth/email-already-in-use'
                ? 'El correo electrónico ya está en uso.'
                : 'Error al registrar la cuenta. Verifique los datos.';
            mostrarMensaje(friendlyMessage, 'error');
            console.error("Error de registro:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div id="signup-screen" className="relative min-h-screen flex flex-col items-center justify-center bg-black p-4 overflow-hidden">
             <div className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(/khaleesi-system.jpg)` }} aria-hidden="true"></div>
            <div className="absolute inset-0 z-0 bg-black bg-opacity-70" aria-hidden="true"></div>
            <motion.div 
                initial={{ opacity: 0, y: 50 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="relative z-10 bg-white/10 backdrop-blur-sm p-8 rounded-lg shadow-xl w-full max-w-sm my-4 border border-white/10"
            >
                <h2 className="text-2xl font-bold mb-6 text-center text-zinc-100">Crear Cuenta de Negocio</h2>
                <form onSubmit={handleSignUp} className="space-y-4">
                     <div>
                        <label htmlFor="nombre-negocio" className="block text-sm font-medium text-zinc-300 mb-1">Nombre del Negocio:</label>
                        <input type="text" id="nombre-negocio" value={nombreNegocio} onChange={(e) => setNombreNegocio(e.target.value)} className="w-full p-2 border border-zinc-600 rounded-md bg-zinc-700 text-zinc-100" required />
                    </div>
                    <div>
                        <label htmlFor="signup-email" className="block text-sm font-medium text-zinc-300 mb-1">Email:</label>
                        <input type="email" id="signup-email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-2 border border-zinc-600 rounded-md bg-zinc-700 text-zinc-100" required />
                    </div>
                    <div>
                        <label htmlFor="signup-password" className="block text-sm font-medium text-zinc-300 mb-1">Contraseña:</label>
                        <input type="password" id="signup-password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-2 border border-zinc-600 rounded-md bg-zinc-700 text-zinc-100" required />
                    </div>
                    <motion.button type="submit" disabled={isLoading} className="w-full bg-white/80 hover:bg-white text-black font-bold py-2 px-4 rounded-md transition" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                        {isLoading ? 'Registrando...' : 'Crear Cuenta'}
                    </motion.button>
                     <p className="text-xs text-center text-zinc-300">
                        ¿Ya tienes una cuenta? <Link to="/login" className="font-medium text-blue-400 hover:underline">Inicia sesión</Link>
                    </p>
                </form>
            </motion.div>
        </div>
    );
}

export default SignUpScreen;