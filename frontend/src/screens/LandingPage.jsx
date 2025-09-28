// frontend/src/screens/LandingPage.jsx

import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ShoppingCart,
  Package,
  LineChart,
  Users,
  Truck,
  DollarSign,
  QrCode,
  TrendingUp,
  CheckCircle,
} from 'lucide-react';
import AppLogo from '../components/AppLogo';
import Footer from '../components/Footer';
import ParticleBackground from '../components/ParticleBackground';

const features = [
  {
    icon: <ShoppingCart className="h-8 w-8 text-blue-400" />,
    title: 'Punto de Venta Dinámico',
    description:
      'Agrega productos por código de barras o búsqueda, aplica descuentos por ítem y gestiona tu carrito con facilidad.',
  },
  {
    icon: <Package className="h-8 w-8 text-blue-400" />,
    title: 'Gestión de Inventario',
    description:
      'Control total de productos con stock, precio y costo. Define categorías y recibe alertas de stock bajo.',
  },
  {
    icon: <LineChart className="h-8 w-8 text-blue-400" />,
    title: 'Caja y Reportes',
    description:
      'Visualiza ventas diarias y mensuales, registra ingresos/egresos y realiza cierres de caja detallados.',
  },
  {
    icon: <Users className="h-8 w-8 text-blue-400" />,
    title: 'Manejo de Clientes y Vendedores',
    description:
      'Mantén una base de datos de tus clientes y gestiona a tu personal para asociar ventas a cada vendedor.',
  },
  {
    icon: <Truck className="h-8 w-8 text-blue-400" />,
    title: 'Proveedores y Pedidos',
    description:
      'Gestiona proveedores, registra pedidos y actualiza tu stock y costos automáticamente al recibir la mercancía.',
  },
  {
    icon: <DollarSign className="h-8 w-8 text-blue-400" />,
    title: 'Estadísticas Financieras',
    description:
      'Analiza tus ingresos brutos, costos, ganancias y el valor total de tu inventario en tiempo real.',
  },
  {
    icon: <QrCode className="h-8 w-8 text-blue-400" />,
    title: 'Etiquetas QR y Verificador',
    description:
      'Imprime etiquetas con códigos QR para precios dinámicos y ofrece a tus clientes un verificador de precios en tienda.',
  },
  {
    icon: <TrendingUp className="h-8 w-8 text-blue-400" />,
    title: 'Herramientas de Automatización',
    description:
      'Actualiza precios y stock masivamente con Excel y aplica aumentos por inflación a todos tus productos.',
  },
];

const LandingPage = () => {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-zinc-900 text-zinc-200">
      <ParticleBackground />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between p-4 sm:p-6">
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
        <section className="px-4 py-20 text-center sm:py-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl font-extrabold leading-tight text-white sm:text-5xl md:text-6xl">
              La Gestión Completa <br /> que tu Negocio Necesita
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-400">
              Desde el punto de venta y control de stock, hasta el análisis de
              ganancias y la automatización de precios. Todo en un solo lugar.
            </p>
            <Link to="/signup">
              <motion.button
                className="mt-8 rounded-md bg-white px-8 py-3 font-semibold text-zinc-900 transition-transform duration-200 hover:bg-zinc-200"
                whileHover={{
                  scale: 1.05,
                  boxShadow: '0px 0px 15px rgba(255,255,255,0.2)',
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
          <div className="mx-auto max-w-6xl">
            <div className="text-center">
              <h3 className="text-3xl font-bold text-white">
                Todo lo que necesitas para crecer
              </h3>
              <p className="mt-4 text-zinc-400">
                Funcionalidades diseñadas para potenciar y automatizar tu
                negocio.
              </p>
            </div>
            <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  className="flex flex-col items-center rounded-lg border border-zinc-700 bg-zinc-800/50 p-6"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  {feature.icon}
                  <h4 className="mt-4 text-lg font-semibold text-white">
                    {feature.title}
                  </h4>
                  <p className="mt-2 text-center text-sm text-zinc-400">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section (Sin cambios) */}
        <section id="pricing" className="px-4 py-20 sm:py-24">
          <div className="mx-auto max-w-md text-center">
            <h3 className="text-3xl font-bold text-white">
              Un plan simple y transparente
            </h3>
            <p className="mt-4 text-zinc-400">
              Comienza gratis. Sin necesidad de tarjeta de crédito.
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
                  <CheckCircle className="h-5 w-5 text-green-500" />
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
