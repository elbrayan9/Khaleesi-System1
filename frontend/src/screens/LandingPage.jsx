// frontend/src/screens/LandingPage.jsx

import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingCart, Package, LineChart, Bot, Users, FileText, CheckCircle } from 'lucide-react';
import AppLogo from '../components/AppLogo';
import Footer from '../components/Footer';
import ParticleBackground from '../components/ParticleBackground';

// Datos de las características, extraídos de tu README.md
const features = [
  {
    icon: <ShoppingCart className="h-8 w-8 text-blue-400" />,
    title: "Punto de Venta Dinámico",
    description: "Agrega productos por código de barras o búsqueda manual, aplica descuentos y gestiona tu carrito con facilidad."
  },
  {
    icon: <Package className="h-8 w-8 text-blue-400" />,
    title: "Gestión de Inventario",
    description: "Control total sobre tus productos, clientes y vendedores con operaciones CRUD completas y actualización de stock en tiempo real."
  },
  {
    icon: <LineChart className="h-8 w-8 text-blue-400" />,
    title: "Caja y Reportes",
    description: "Visualiza ventas diarias y mensuales, registra ingresos/egresos y realiza cierres de caja detallados por vendedor."
  },
  {
    icon: <Bot className="h-8 w-8 text-blue-400" />,
    title: "Asistente con IA",
    description: "Resuelve tus dudas rápidamente con nuestro chatbot integrado con la tecnología de Google Gemini."
  },
  {
    icon: <FileText className="h-8 w-8 text-blue-400" />,
    title: "Importa y Exporta",
    description: "Actualiza precios y stock de forma masiva utilizando archivos de Excel y exporta reportes mensuales completos."
  },
  {
    icon: <Users className="h-8 w-8 text-blue-400" />,
    title: "Manejo de Clientes",
    description: "Mantén una base de datos de tus clientes para agilizar tus ventas y generar notas de crédito o débito."
  }
];

const LandingPage = () => {
  return (
    <div className="relative min-h-screen w-full bg-zinc-900 text-zinc-200 overflow-x-hidden">
      <ParticleBackground />
      
      {/* Header */}
      <header className="relative z-10 p-4 sm:p-6 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <AppLogo onLogoClick={() => window.scrollTo(0,0)} className="text-white hover:text-blue-400" />
          <h1 className="text-xl font-bold">Khaleesi System</h1>
        </div>
        <div className="space-x-2">
          <Link to="/login">
            <motion.button 
              className="px-4 py-2 text-sm font-medium rounded-md text-zinc-200 hover:bg-zinc-800 transition-colors"
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            >
              Iniciar Sesión
            </motion.button>
          </Link>
          <Link to="/signup">
            <motion.button 
              className="px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            >
              Registrarse
            </motion.button>
          </Link>
        </div>
      </header>

      <main className="relative z-10">
        {/* Hero Section */}
        <section className="text-center py-20 sm:py-32 px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white leading-tight">
              El Punto de Venta Inteligente <br /> que tu Negocio Necesita
            </h2>
            <p className="mt-6 max-w-2xl mx-auto text-lg text-zinc-400">
              Gestiona tus ventas, inventario y reportes en un solo lugar. Rápido, seguro y fácil de usar, con el poder de la inteligencia artificial para asistirte.
            </p>
            <Link to="/signup">
              <motion.button 
                className="mt-8 px-8 py-3 font-semibold rounded-md bg-white text-zinc-900 hover:bg-zinc-200 transition-transform duration-200"
                whileHover={{ scale: 1.05, boxShadow: "0px 0px 15px rgba(255,255,255,0.2)" }}
                whileTap={{ scale: 0.95 }}
              >
                Comienza tu prueba gratis de 15 días
              </motion.button>
            </Link>
          </motion.div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 sm:py-24 px-4 bg-black/20 backdrop-blur-sm">
          <div className="max-w-6xl mx-auto">
            <div className="text-center">
              <h3 className="text-3xl font-bold text-white">Todo lo que necesitas para crecer</h3>
              <p className="mt-4 text-zinc-400">Desde la venta hasta el análisis. Khaleesi System te cubre.</p>
            </div>
            <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <motion.div 
                  key={index}
                  className="bg-zinc-800/50 p-6 rounded-lg border border-zinc-700"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <div className="flex items-center gap-4">
                    {feature.icon}
                    <h4 className="text-lg font-semibold text-white">{feature.title}</h4>
                  </div>
                  <p className="mt-3 text-zinc-400 text-sm">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-20 sm:py-24 px-4">
            <div className="max-w-md mx-auto text-center">
                 <h3 className="text-3xl font-bold text-white">Un plan simple y transparente</h3>
                 <p className="mt-4 text-zinc-400">Comienza gratis. Sin necesidad de tarjeta de crédito.</p>
            </div>
            <motion.div 
                className="max-w-sm mx-auto mt-12 bg-zinc-800 p-8 rounded-xl border border-blue-500/50 shadow-2xl shadow-blue-500/10"
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
            >
                <h4 className="text-lg font-semibold text-white">Plan Completo</h4>
                <p className="mt-2 text-zinc-400">Acceso a todas las funcionalidades actuales y futuras.</p>
                <div className="mt-6 flex items-baseline gap-2">
                    <span className="text-4xl font-extrabold text-white">$15.000</span>
                    <span className="text-zinc-400">ARS / por mes</span>
                </div>
                <ul className="mt-6 space-y-3 text-sm">
                    {['15 días de prueba gratis', 'Todas las funcionalidades incluidas', 'Soporte por Chatbot IA', 'Actualizaciones continuas'].map(item => (
                        <li key={item} className="flex items-center gap-2 text-zinc-300">
                            <CheckCircle className="h-5 w-5 text-green-500" />
                            {item}
                        </li>
                    ))}
                </ul>
                <Link to="/signup" className="w-full">
                    <motion.button 
                        className="w-full mt-8 py-3 font-semibold rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        Empezar Ahora
                    </motion.button>
                </Link>
            </motion.div>
        </section>
      </main>
      
      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  );
};

export default LandingPage;