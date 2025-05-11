import React, { useState } from 'react';
import { motion } from 'framer-motion';
import AppLogo from './AppLogo.jsx'; // Importa el componente del logo SVG
import GlitchText from './GlitchText.jsx'; // Importa el componente GlitchText

// Asumiendo que mostrarMensaje se pasa como prop desde App.jsx

function LoginScreen({ onLoginSuccess, mostrarMensaje }) {
    const [usuario, setUsuario] = useState('admin');
    const [password, setPassword] = useState('1234');
    const suscripcionActiva = true;
    const systemName = "Khaleesi System";
    const currentYear = new Date().getFullYear();

    // --- Ruta a la imagen de fondo en la carpeta 'public' ---
    const backgroundImageUrl = '/khaleesi-system.jpg'; // Ruta local

    // --- Handlers y Variantes (sin cambios) ---
    const handleLogin = () => { if (usuario === 'admin' && password === '1234') { if (suscripcionActiva) { onLoginSuccess(); } else { mostrarMensaje('Su suscripción no está activa.', 'warning'); } } else { mostrarMensaje('Usuario o contraseña incorrectos.', 'error'); } };
    const titleVariants = { hidden: { opacity: 0, y: -30, filter: 'blur(8px)' }, visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.8, ease: "easeOut" } } };
    const formVariants = { hidden: { opacity: 0, y: 50 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.3 } } };
    const footerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.5, delay: 0.9 } } };

    return (
        // Contenedor principal
        <div id="login-screen" className="relative min-h-screen flex flex-col items-center justify-center bg-black p-4 overflow-hidden">

            {/* Imagen de Fondo */}
            <div
                className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: `url(${backgroundImageUrl})` }}
                aria-hidden="true"
            ></div>

            {/* Filtro Oscuro */}
            <div
                className="absolute inset-0 z-0 bg-black bg-opacity-70"
                 aria-hidden="true"
            ></div>

            {/* Contenedor del Contenido Principal */}
            <div className="relative z-10 flex flex-col items-center justify-between min-h-full w-full max-w-sm">

                {/* Título Principal Animado */}
                <div className="mt-8 mb-8 text-center">
                    <motion.h1
                        className="text-4xl font-bold text-white uppercase tracking-wider font-mono"
                        initial="hidden"
                        animate="visible"
                        variants={titleVariants}
                    >
                        {systemName}
                    </motion.h1>
                </div>

                {/* Formulario de Login Animado */}
                <motion.div
                    className="bg-white/10 backdrop-blur-sm p-8 rounded-lg shadow-xl w-full my-4 border border-white/10"
                    initial="hidden"
                    animate="visible"
                    variants={formVariants}
                >
                    <h2 className="text-2xl font-bold mb-6 text-center text-zinc-100">Iniciar Sesión</h2>
                    <div className="space-y-4">
                        {/* Campos */}
                        <div>
                            <label htmlFor="login-usuario" className="block text-sm font-medium text-zinc-300 mb-1">Usuario:</label>
                            <input type="text" id="login-usuario" value={usuario} onChange={(e) => setUsuario(e.target.value)} className="w-full p-2 border border-zinc-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-zinc-700 text-zinc-100 placeholder-zinc-400" aria-label="Campo de usuario para login" />
                        </div>
                        <div>
                            <label htmlFor="login-password" className="block text-sm font-medium text-zinc-300 mb-1">Contraseña:</label>
                            <input type="password" id="login-password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-2 border border-zinc-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-zinc-700 text-zinc-100 placeholder-zinc-400" aria-label="Campo de contraseña para login" />
                        </div>
                        {/* Botón */}
                        <motion.button
                            onClick={handleLogin}
                            className="w-full bg-white/80 hover:bg-white text-black font-bold py-2 px-4 rounded-md transition duration-150 ease-in-out"
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            Ingresar
                        </motion.button>
                        <p className="text-xs text-center text-zinc-400">Usuario: admin / Contraseña: 1234 (Simulado)</p>
                    </div>
                </motion.div>

                {/* Sección Inferior: Logo y Copyright (ORDEN CAMBIADO) */}
                <motion.footer
                    className="text-center mt-auto pt-6 pb-2 flex flex-col items-center"
                    initial="hidden"
                    animate="visible"
                    variants={footerVariants}
                >
                     {/* Logo Pequeño con Glitch (Ahora arriba) */}
                     <div className="mb-2"> {/* Añadido margen inferior al logo */}
                        <GlitchText
                            speed={0.8}
                            enableShadows={true}
                            enableOnHover={true}
                            className="text-white w-10 h-10" // Tamaño pequeño
                        >
                            <AppLogo onLogoClick={() => {}} />
                        </GlitchText>
                     </div>

                    {/* Texto de Copyright (Ahora abajo) */}
                    <p className="text-xs text-zinc-400">
                        &copy; {currentYear} Brian Oviedo. Todos los derechos reservados.
                    </p>

                </motion.footer>

            </div>
        </div>
    );
}

export default LoginScreen;
