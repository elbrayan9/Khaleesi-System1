// frontend/src/screens/LandingPage.jsx

import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ShoppingCart,
  Package,
  LineChart,
  Users,
  CheckCircle,
  Truck,
  TrendingUp,
  QrCode,
  DollarSign,
} from 'lucide-react';
import AppLogo from '../components/AppLogo';
import Footer from '../components/Footer';
import ParticleBackground from '../components/ParticleBackground';

// Componente para cada tarjeta de característica (CON ALTURA FIJA)
const FeatureCard = ({ icon, title, description, delay }) => (
  <motion.div
    className="flex transform flex-col rounded-lg border border-zinc-700/80 bg-zinc-800/50 p-6 transition-transform duration-300 hover:-translate-y-2"
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay }}
  >
    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600/20">
      {icon}
    </div>
    <h4 className="text-lg font-semibold text-white">{title}</h4>
    <p className="mt-2 flex-grow text-sm text-zinc-400">{description}</p>
  </motion.div>
);

const LandingPage = () => {
  // Lista COMPLETA de 8 características con texto ajustado
  const features = [
    {
      icon: <ShoppingCart className="h-6 w-6 text-blue-400" />,
      title: 'Punto de Venta (POS)',
      description:
        'Procesa ventas con búsqueda por código de barras, descuentos y un carrito intuitivo.',
    },
    {
      icon: <Package className="h-6 w-6 text-blue-400" />,
      title: 'Gestión de Inventario',
      description:
        'Control total de stock, costos y precios. Recibe alertas automáticas de stock bajo.',
    },
    {
      icon: <LineChart className="h-6 w-6 text-blue-400" />,
      title: 'Caja y Reportes',
      description:
        'Visualiza movimientos diarios/mensuales, realiza cierres de caja y exporta tus datos fácilmente.',
    },
    {
      icon: <Users className="h-6 w-6 text-blue-400" />,
      title: 'Clientes y Vendedores',
      description:
        'Crea una base de datos de clientes y gestiona a tu personal para un seguimiento preciso.',
    },
    {
      icon: <Truck className="h-6 w-6 text-blue-400" />,
      title: 'Proveedores y Pedidos',
      description:
        'Gestiona proveedores, registra pedidos y actualiza tu stock automáticamente al recibir mercancía.',
    },
    {
      icon: <DollarSign className="h-6 w-6 text-blue-400" />,
      title: 'Estadísticas Financieras',
      description:
        'Analiza ingresos brutos, costos, ganancias y el valor total de tu inventario en tiempo real.',
    },
    {
      icon: <QrCode className="h-6 w-6 text-blue-400" />,
      title: 'Etiquetas QR y Verificador',
      description:
        'Imprime etiquetas con códigos QR para precios dinámicos y ofrece un verificador de precios en tienda.',
    },
    {
      icon: <TrendingUp className="h-6 w-6 text-blue-400" />,
      title: 'Herramientas de Automatización',
      description:
        'Actualiza precios y stock masivamente con Excel y aplica aumentos por inflación con un solo clic.',
    },
  ];

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-zinc-900 text-zinc-200">
      <ParticleBackground />

      <header className="relative z-20 flex items-center justify-between p-4 sm:p-6">
        <div className="flex items-center gap-3">
          <AppLogo
            onLogoClick={() => window.scrollTo(0, 0)}
            className="text-white hover:text-blue-400"
          />
          <h1 className="text-xl font-bold">Khaleesi System</h1>
        </div>
        <div className="space-x-2">
          <Link to="/login">
            <motion.button
              className="rounded-md px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-800"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Iniciar Sesión
            </motion.button>
          </Link>
          <Link to="/signup">
            <motion.button
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Registrarse
            </motion.button>
          </Link>
        </div>
      </header>

      <main className="relative z-10">
        {/* Hero Section */}
        <section className="px-4 py-24 text-center sm:py-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-5xl font-extrabold tracking-tight text-white sm:text-6xl md:text-7xl">
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                La Gestión Definitiva
              </span>
              <br />
              Para tu Negocio
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-400">
              Desde el punto de venta hasta el análisis de ganancias. Todo lo
              que necesitas para crecer, en una plataforma simple y potente.
            </p>
            <Link to="/signup">
              <motion.button
                className="mt-10 rounded-full bg-white px-8 py-4 font-semibold text-zinc-900 shadow-lg shadow-white/10 transition-transform duration-300 hover:bg-zinc-200"
                whileHover={{
                  scale: 1.05,
                  boxShadow: '0px 0px 20px rgba(255,255,255,0.3)',
                }}
                whileTap={{ scale: 0.95 }}
              >
                Comienza tu prueba gratis de 15 días
              </motion.button>
            </Link>
          </motion.div>
        </section>

        {/* Features Section */}
        <section
          id="features"
          className="bg-black/20 px-4 py-20 backdrop-blur-sm sm:py-24"
        >
          <div className="mx-auto max-w-7xl">
            <div className="text-center">
              <h3 className="text-3xl font-bold text-white sm:text-4xl">
                Una Herramienta para Cada Necesidad
              </h3>
              <p className="mx-auto mt-4 max-w-2xl text-zinc-400">
                Funcionalidades diseñadas para potenciar y automatizar tu
                negocio desde el día uno.
              </p>
            </div>
            <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
              {features.map((feature, index) => (
                <FeatureCard
                  key={index}
                  icon={feature.icon}
                  title={feature.title}
                  description={feature.description}
                  delay={index * 0.1}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="px-4 py-20 sm:py-24">
          <div className="mx-auto max-w-md text-center">
            <h3 className="text-3xl font-bold text-white sm:text-4xl">
              Un Plan Simple y Transparente
            </h3>
            <p className="mt-4 text-zinc-400">
              Comienza gratis. Sin necesidad de tarjeta de crédito. Todas las
              funciones incluidas.
            </p>
          </div>
          <motion.div
            className="mx-auto mt-12 max-w-sm rounded-xl border border-blue-500/50 bg-zinc-800 p-8 shadow-2xl shadow-blue-500/10"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h4 className="text-lg font-semibold text-white">Plan Completo</h4>
            <p className="mt-2 text-zinc-400">
              Acceso a todas las funcionalidades actuales y futuras.
            </p>
            <div className="mt-6 flex items-baseline justify-center gap-2">
              <span className="text-4xl font-extrabold text-white">
                $15.000
              </span>
              <span className="text-zinc-400">ARS / por mes</span>
            </div>
            <ul className="mt-6 space-y-3 text-left text-sm">
              {[
                '15 días de prueba gratis',
                'Todas las funcionalidades incluidas',
                'Soporte por Chatbot IA',
                'Actualizaciones continuas',
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-2 text-zinc-300"
                >
                  <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-500" />
                  {item}
                </li>
              ))}
            </ul>
            <Link to="/signup" className="w-full">
              <motion.button
                className="mt-8 w-full rounded-md bg-blue-600 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
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
