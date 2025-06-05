import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Para redirigir
import { motion } from 'framer-motion';
import AppLogo from './AppLogo.jsx';
import GlitchText from './GlitchText.jsx';
import { useAppContext } from '../context/AppContext.jsx'; // Importar hook del contexto

// Las funciones de mensajes ahora vienen del contexto si se centralizan allí,
// o directamente del AppProvider si se pasaron a través de main.jsx y App.jsx
// Para este ejemplo, asumimos que AppContext las expondrá o que se pasan como prop a App y luego aquí.
// Por simplicidad, mantendremos la prop `mostrarMensaje` que viene de App.jsx (que a su vez la recibe de main.jsx).

function LoginScreen() { // Ya no necesita onLoginSuccess como prop directa si el contexto lo maneja
    const { handleLoginSuccess, mostrarMensaje } = useAppContext(); // Usar el handler del contexto
    const navigate = useNavigate();

    const [usuario, setUsuario] = useState('admin');
    const [password, setPassword] = useState('1234');
    const suscripcionActiva = true; // Esto podría venir del contexto o ser una variable local/configuración
    const systemName = "Khaleesi System";
    const currentYear = new Date().getFullYear();
    const backgroundImageUrl = '/khaleesi-system.jpg';

    const attemptLogin = () => {
        if (usuario === 'admin' && password === '1234') {
            if (suscripcionActiva) {
                handleLoginSuccess(); // Llama a la función del contexto
                navigate('/'); // Redirigir a la página principal después del login
            } else {
                if (mostrarMensaje) mostrarMensaje('Su suscripción no está activa.', 'warning');
            }
        } else {
            if (mostrarMensaje) mostrarMensaje('Usuario o contraseña incorrectos.', 'error');
        }
    };

    const titleVariants = { hidden: { opacity: 0, y: -30, filter: 'blur(8px)' }, visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.8, ease: "easeOut" } } };
    const formVariants = { hidden: { opacity: 0, y: 50 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.3 } } };
    const footerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.5, delay: 0.9 } } };

    return (
        <div id="login-screen" className="relative min-h-screen flex flex-col items-center justify-center bg-black p-4 overflow-hidden">
            <div className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${backgroundImageUrl})` }} aria-hidden="true"></div>
            <div className="absolute inset-0 z-0 bg-black bg-opacity-70" aria-hidden="true"></div>
            <div className="relative z-10 flex flex-col items-center justify-between min-h-full w-full max-w-sm">
                <div className="mt-8 mb-8 text-center">
                    <motion.h1 className="text-4xl font-bold text-white uppercase tracking-wider font-mono" initial="hidden" animate="visible" variants={titleVariants}>
                        {systemName}
                    </motion.h1>
                </div>
                <motion.div className="bg-white/10 backdrop-blur-sm p-8 rounded-lg shadow-xl w-full my-4 border border-white/10" initial="hidden" animate="visible" variants={formVariants}>
                    <h2 className="text-2xl font-bold mb-6 text-center text-zinc-100">Iniciar Sesión</h2>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="login-usuario" className="block text-sm font-medium text-zinc-300 mb-1">Usuario:</label>
                            <input type="text" id="login-usuario" value={usuario} onChange={(e) => setUsuario(e.target.value)} className="w-full p-2 border border-zinc-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-zinc-700 text-zinc-100 placeholder-zinc-400" aria-label="Campo de usuario para login" />
                        </div>
                        <div>
                            <label htmlFor="login-password" className="block text-sm font-medium text-zinc-300 mb-1">Contraseña:</label>
                            <input type="password" id="login-password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-2 border border-zinc-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-zinc-700 text-zinc-100 placeholder-zinc-400" aria-label="Campo de contraseña para login"
                                onKeyPress={(e) => e.key === 'Enter' && attemptLogin()}
                            />
                        </div>
                        <motion.button onClick={attemptLogin} className="w-full bg-white/80 hover:bg-white text-black font-bold py-2 px-4 rounded-md transition duration-150 ease-in-out" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                            Ingresar
                        </motion.button>
                        <p className="text-xs text-center text-zinc-400">Usuario: admin / Contraseña: 1234 (Simulado)</p>
                    </div>
                </motion.div>
                <motion.footer className="text-center mt-auto pt-6 pb-2 flex flex-col items-center" initial="hidden" animate="visible" variants={footerVariants}>
                     <div className="mb-2">
                        <GlitchText speed={0.8} enableShadows={true} enableOnHover={true} className="text-white w-10 h-10">
                            <AppLogo onLogoClick={() => {}} /> {/* No necesita acción de click aquí */}
                        </GlitchText>
                     </div>
                    <p className="text-xs text-zinc-400">
                        &copy; {currentYear} Brian Oviedo. Todos los derechos reservados.
                    </p>
                </motion.footer>
            </div>
        </div>
    );
}
export default LoginScreen;