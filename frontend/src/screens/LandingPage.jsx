// frontend/src/screens/LandingPage.jsx

import React, { useState } from 'react';
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
  Store,
  ShoppingBag,
  Hammer,
  Book,
  Bot,
  Moon,
  FileText,
  XCircle, // Importar XCircle para características no incluidas
} from 'lucide-react';
import AppLogo from '../components/AppLogo';
import Footer from '../components/Footer';
import ParticleBackground from '../components/ParticleBackground';
import profileImage from '../assets/profile.jpg';
import dashboardDesktop from '../assets/dashboard-desktop.png';
import dashboardMobile from '../assets/dashboard-mobile.png';
import TypeAnimation from '../components/TypeAnimation';
import { AnimatedButton } from '../components/AnimatedButton';
import HoverEffectWrapper from '../components/HoverEffectWrapper';

// Componente para cada tarjeta de característica (CON EFECTO GLOW)
const FeatureCard = ({
  icon,
  title,
  description,
  delay,
  color = 'rgba(59, 130, 246, 0.5)',
}) => (
  <motion.div
    className="group relative flex h-full flex-col items-center overflow-hidden rounded-2xl border border-white/10 bg-zinc-800/50 p-6 text-center transition-colors"
    initial={{ opacity: 0 }}
    whileInView={{ opacity: 1 }}
    viewport={{ once: true, margin: '-50px' }}
    transition={{ duration: 0.4, delay }}
    style={{ willChange: 'opacity' }}
    data-glow-color={color}
  >
    {/* Glow Effect Layer removed - handled by wrapper */}

    <div className="relative z-10 mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-400 transition-colors group-hover:bg-blue-600 group-hover:text-white">
      {React.cloneElement(icon, { className: 'h-8 w-8' })}
    </div>
    <h4 className="relative z-10 mb-3 text-xl font-bold text-white">{title}</h4>
    <p className="relative z-10 text-sm leading-relaxed text-zinc-400">
      {description}
    </p>
  </motion.div>
);

const LandingPage = () => {
  const [billingCycle, setBillingCycle] = useState('monthly');

  // Lista COMPLETA de 12 características con texto ajustado
  const features = [
    {
      icon: <ShoppingCart className="h-6 w-6 text-blue-400" />,
      title: 'Punto de Venta (POS)',
      description:
        'Procesa ventas con búsqueda por código de barras, descuentos y un carrito intuitivo.',
      color: 'rgba(59, 130, 246, 0.5)', // Blue (Primary)
    },
    {
      icon: <FileText className="h-6 w-6 text-blue-400" />,
      title: 'Facturación AFIP',
      description:
        'Emite facturas A, B y C homologadas por AFIP en un clic. Olvídate de la página de AFIP.',
      color: 'rgba(59, 130, 246, 0.5)', // Blue
    },
    {
      icon: <Bot className="h-6 w-6 text-blue-400" />,
      title: 'Asistente IA',
      description:
        'Tu copiloto inteligente. Pregúntale sobre ventas, stock o consejos para mejorar tu negocio.',
      color: 'rgba(6, 182, 212, 0.5)', // Cyan (Tech/AI)
    },
    {
      icon: <Store className="h-6 w-6 text-blue-400" />,
      title: 'Multi-sucursal',
      description:
        'Gestiona múltiples locales desde una sola cuenta. Stock y reportes unificados o por sucursal.',
      color: 'rgba(99, 102, 241, 0.5)', // Indigo (Management)
    },
    {
      icon: <Package className="h-6 w-6 text-blue-400" />,
      title: 'Gestión de Inventario',
      description:
        'Control total de stock, costos y precios. Recibe alertas automáticas de stock bajo.',
      color: 'rgba(59, 130, 246, 0.5)', // Blue
    },
    {
      icon: <LineChart className="h-6 w-6 text-blue-400" />,
      title: 'Caja y Reportes',
      description:
        'Cierres de caja detallados y reportes de ganancias. Recibe un resumen diario por email.',
      color: 'rgba(6, 182, 212, 0.5)', // Cyan
    },
    {
      icon: <Users className="h-6 w-6 text-blue-400" />,
      title: 'Clientes y Vendedores',
      description:
        'Base de datos de clientes con CUIT automático y gestión de comisiones para vendedores.',
      color: 'rgba(99, 102, 241, 0.5)', // Indigo
    },
    {
      icon: <FileText className="h-6 w-6 text-blue-400" />,
      title: 'Presupuestos y Notas',
      description:
        'Crea presupuestos profesionales y emite notas de crédito/débito fácilmente.',
      color: 'rgba(59, 130, 246, 0.5)', // Blue
    },
    {
      icon: <Truck className="h-6 w-6 text-blue-400" />,
      title: 'Proveedores y Pedidos',
      description:
        'Gestiona proveedores, registra pedidos y actualiza tu stock automáticamente al recibir mercancía.',
      color: 'rgba(99, 102, 241, 0.5)', // Indigo
    },
    {
      icon: <DollarSign className="h-6 w-6 text-blue-400" />,
      title: 'Estadísticas Financieras',
      description:
        'Analiza ingresos brutos, costos, ganancias y el valor total de tu inventario en tiempo real.',
      color: 'rgba(6, 182, 212, 0.5)', // Cyan
    },
    {
      icon: <QrCode className="h-6 w-6 text-blue-400" />,
      title: 'Etiquetas QR',
      description:
        'Imprime etiquetas con códigos QR para precios dinámicos y ofrece un verificador de precios.',
      color: 'rgba(59, 130, 246, 0.5)', // Blue
    },
    {
      icon: <Moon className="h-6 w-6 text-blue-400" />,
      title: 'Modo Oscuro/Claro',
      description:
        'Interfaz adaptable a tu preferencia visual. Trabaja cómodo de día o de noche.',
      color: 'rgba(255, 255, 255, 0.3)', // White/Neutral
    },
  ];

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-zinc-900 text-zinc-200">
      <ParticleBackground />

      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-white/5 bg-zinc-900/80 p-4 backdrop-blur-md sm:px-6">
        <div className="flex items-center gap-3">
          <AppLogo
            onLogoClick={() => window.scrollTo(0, 0)}
            className="text-white hover:text-blue-400"
          />
          <h1 className="text-xl font-bold">Khaleesi System</h1>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-8 md:flex">
          {/* Dropdown "Ideal para mí" */}
          <div className="group relative">
            <button className="flex items-center gap-1 text-sm font-medium text-zinc-300 transition-colors hover:text-white">
              Ideal para mí
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-transform group-hover:rotate-180"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            {/* Dropdown Menu */}
            <div className="invisible absolute left-1/2 top-full mt-2 w-48 -translate-x-1/2 opacity-0 transition-all group-hover:visible group-hover:opacity-100">
              <div className="rounded-xl border border-zinc-700 bg-zinc-800 p-2 shadow-xl">
                <a
                  href="#features"
                  className="block rounded-lg px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white"
                >
                  Funcionalidades
                </a>
                <a
                  href="#pricing"
                  className="block rounded-lg px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white"
                >
                  Precios
                </a>
                <a
                  href="#contact"
                  className="block rounded-lg px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white"
                >
                  Contacto
                </a>
              </div>
            </div>
          </div>

          <a
            href="#contact"
            className="text-sm font-medium text-zinc-300 transition-colors hover:text-white"
          >
            Contacto
          </a>
        </nav>

        <div className="flex items-center gap-4">
          <Link to="/login">
            <motion.button
              className="hidden rounded-md px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-800 sm:block"
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
              <motion.span
                className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                La Gestión Definitiva
              </motion.span>
              <br />
              <TypeAnimation
                words={[
                  'Para tu Negocio',
                  'Para tu Kiosco',
                  'Para tu Almacén',
                  'Para tu Éxito',
                ]}
                typingSpeed={80}
                deletingSpeed={50}
                pauseDuration={2000}
                gradientFrom="blue-400"
                gradientTo="cyan-400"
                className="block"
              />
            </h2>
            <motion.p
              className="mx-auto mt-6 max-w-2xl text-lg text-zinc-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.5, duration: 0.8 }}
            >
              Desde el punto de venta hasta el análisis de ganancias. Todo lo
              que necesitas para crecer, en una plataforma simple y potente.
            </motion.p>
            <Link to="/signup?plan=basic">
              <AnimatedButton
                className="mt-10 inline-flex px-8 py-4 font-semibold text-zinc-900 shadow-lg shadow-white/10"
                background="white"
                shimmerColor="rgba(0,0,0,0.05)"
                shimmerDuration="3s"
                borderRadius="9999px"
                glow={true}
              >
                Comienza tu prueba gratis de 7 días
              </AnimatedButton>
            </Link>
          </motion.div>
        </section>

        {/* Solutions Section */}
        <section className="relative border-t border-white/5 bg-zinc-900 px-4 py-20 sm:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="mb-16 text-center">
              <h3 className="text-3xl font-bold text-white sm:text-4xl">
                ¿Por qué elegir Khaleesi System?
              </h3>
              <p className="mx-auto mt-4 max-w-2xl text-zinc-400">
                Más que un sistema de ventas, somos tu socio estratégico para el
                crecimiento.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              {[
                {
                  title: 'Ahorra Tiempo',
                  description:
                    'Automatiza tareas repetitivas y enfócate en lo que realmente importa: tus clientes.',
                  icon: (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="h-6 w-6"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  ),
                },
                {
                  title: 'Control Total',
                  description:
                    'Gestiona tu inventario, ventas y caja desde cualquier lugar y en cualquier dispositivo.',
                  icon: (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="h-6 w-6"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z"
                      />
                    </svg>
                  ),
                },
                {
                  title: 'Toma Decisiones',
                  description:
                    'Reportes detallados y estadísticas en tiempo real para impulsar tu rentabilidad.',
                  icon: (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="h-6 w-6"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
                      />
                    </svg>
                  ),
                },
              ].map((item, index) => (
                <motion.div
                  key={index}
                  className="group relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-800/50 p-8 transition-all hover:border-blue-500/50 hover:bg-zinc-800"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 transition-colors group-hover:bg-blue-500 group-hover:text-white">
                    {item.icon}
                  </div>
                  <h4 className="mb-3 text-xl font-bold text-white">
                    {item.title}
                  </h4>
                  <p className="text-zinc-400">{item.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Business Types Section */}
        <section className="bg-zinc-900/80 px-4 py-20 sm:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="mb-16 text-center">
              <h3 className="text-3xl font-bold text-white sm:text-4xl">
                Adaptable a cualquier Negocio
              </h3>
              <p className="mx-auto mt-4 max-w-2xl text-zinc-400">
                Diseñado para cubrir las necesidades específicas de tu rubro.
              </p>
            </div>

            <HoverEffectWrapper className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  title: 'Kioscos y Drugstores',
                  description:
                    'Venta rápida, control de caja por turno y escaneo ágil de códigos de barras.',
                  icon: <Store className="h-6 w-6" />,
                },
                {
                  title: 'Almacenes y Minimercados',
                  description:
                    'Control de stock, gestión de proveedores y actualización masiva de precios.',
                  icon: <ShoppingBag className="h-6 w-6" />,
                },
                {
                  title: 'Ferreterías',
                  description:
                    'Manejo de miles de artículos, venta a granel y presupuestos rápidos.',
                  icon: <Hammer className="h-6 w-6" />,
                },
                {
                  title: 'Librerías y Jugueterías',
                  description:
                    'Control de miles de artículos, búsqueda rápida y gestión de stock eficiente.',
                  icon: <Book className="h-6 w-6" />,
                },
                {
                  title: 'Y mucho más...',
                  description:
                    'Librerías, Jugueterías, Electrónica, Pet Shops y todo tipo de comercio minorista.',
                  icon: <Package className="h-6 w-6" />,
                },
              ].map((item, index) => (
                <motion.div
                  key={index}
                  className="group relative flex items-start gap-4 overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/50 p-6 transition-colors"
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                >
                  {/* Glow Effect Layer removed - handled by wrapper */}

                  <div className="relative z-10 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-blue-400 transition-colors group-hover:bg-blue-500 group-hover:text-white">
                    {item.icon}
                  </div>
                  <div className="relative z-10">
                    <h4 className="text-lg font-bold text-white">
                      {item.title}
                    </h4>
                    <p className="mt-2 text-sm text-zinc-400">
                      {item.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </HoverEffectWrapper>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="bg-zinc-900/80 px-4 py-20 sm:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="text-center">
              <h3 className="text-3xl font-bold text-white sm:text-4xl">
                <motion.span
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                >
                  Una Herramienta para Cada Necesidad
                </motion.span>
              </h3>
              <motion.p
                className="mx-auto mt-4 max-w-2xl text-zinc-400"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                Funcionalidades diseñadas para potenciar y automatizar tu
                negocio desde el día uno.
              </motion.p>
            </div>
            <HoverEffectWrapper className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
              {features.map((feature, index) => (
                <FeatureCard
                  key={index}
                  icon={feature.icon}
                  title={feature.title}
                  description={feature.description}
                  delay={index * 0.1}
                  color={feature.color}
                />
              ))}
            </HoverEffectWrapper>
          </div>
        </section>

        {/* Device Showcase Section */}
        <section className="relative overflow-hidden px-4 py-24 sm:py-32">
          <div className="absolute inset-0 bg-blue-600/5 blur-[60px]" />
          <div className="relative mx-auto max-w-7xl">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                className="text-center lg:text-left"
              >
                <h3 className="text-3xl font-bold text-white sm:text-4xl">
                  Tu Negocio, <br />
                  <span className="text-blue-400">En Todas Partes</span>
                </h3>
                <p className="mt-4 text-lg text-zinc-400">
                  Accede a tu panel de control desde cualquier dispositivo.
                  Diseño responsivo que se adapta a tu computadora, tablet o
                  celular.
                </p>
              </motion.div>

              <div className="relative mx-auto h-[400px] w-full max-w-[600px] lg:h-[500px]">
                {/* Computer Mockup */}
                <motion.div
                  className="absolute left-0 top-10 z-10 h-[300px] w-[90%] rounded-xl border border-zinc-700 bg-zinc-900/90 shadow-2xl backdrop-blur-sm sm:h-[350px] md:w-[80%]"
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  {/* Screen Content */}
                  <div className="relative h-full w-full overflow-hidden rounded-xl bg-zinc-900 p-2">
                    <div className="absolute inset-x-0 top-0 z-10 flex h-8 items-center gap-2 border-b border-zinc-800 bg-zinc-900/95 px-4 backdrop-blur">
                      <div className="h-3 w-3 rounded-full bg-red-500" />
                      <div className="h-3 w-3 rounded-full bg-yellow-500" />
                      <div className="h-3 w-3 rounded-full bg-green-500" />
                    </div>

                    {/* Static Dashboard Image */}
                    <div className="h-full w-full overflow-hidden pt-8">
                      <div className="h-full w-full">
                        <img
                          src={dashboardDesktop}
                          alt="Dashboard Desktop"
                          className="h-full w-full object-fill"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Phone Mockup */}
                <motion.div
                  className="absolute bottom-0 right-4 z-20 h-[350px] w-[180px] rounded-[2rem] border-4 border-zinc-800 bg-zinc-900 shadow-2xl sm:right-10 sm:h-[400px] sm:w-[200px]"
                  initial={{ opacity: 0, y: 100 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  animate={{ y: [0, -15, 0] }}
                  transition={{
                    duration: 0.8,
                    delay: 0.4,
                  }}
                >
                  {/* Phone Screen */}
                  <div className="relative h-full w-full overflow-hidden rounded-[1.7rem] bg-zinc-900">
                    {/* Phone Notch/Header */}
                    <div className="absolute inset-x-0 top-0 z-10 flex h-12 items-end justify-center bg-zinc-900/90 pb-2 backdrop-blur">
                      <div className="h-1 w-16 rounded-full bg-zinc-800" />
                    </div>

                    {/* Static App Image */}
                    <div className="h-full w-full overflow-hidden pt-12">
                      <div className="h-full w-full">
                        <img
                          src={dashboardMobile}
                          alt="Dashboard Mobile"
                          className="h-full w-full object-cover object-top"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="px-4 py-20 sm:py-24">
          <div className="mx-auto max-w-md text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h3 className="text-3xl font-bold text-white sm:text-4xl">
                Un Plan Simple y Transparente
              </h3>
              <p className="mt-4 text-zinc-400">
                Comienza gratis. Sin necesidad de tarjeta de crédito. Todas las
                funciones incluidas.
              </p>
            </motion.div>
          </div>

          <div className="mt-8 flex justify-center">
            <div className="relative flex rounded-full bg-zinc-800 p-1">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`${
                  billingCycle === 'monthly'
                    ? 'bg-zinc-700 text-white'
                    : 'text-zinc-400 hover:text-white'
                } relative z-10 rounded-full px-6 py-2 text-sm font-medium transition-colors`}
              >
                Mensual
              </button>
              <button
                onClick={() => setBillingCycle('annual')}
                className={`${
                  billingCycle === 'annual'
                    ? 'bg-zinc-700 text-white'
                    : 'text-zinc-400 hover:text-white'
                } relative z-10 flex items-center gap-2 rounded-full px-6 py-2 text-sm font-medium transition-colors`}
              >
                Anual
                <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-xs text-green-400">
                  Ahorra meses
                </span>
              </button>
            </div>
          </div>

          <HoverEffectWrapper className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-2">
            {/* PLAN BÁSICO */}
            <motion.div
              className="group relative overflow-hidden rounded-xl border border-white/10 bg-zinc-800/50 p-8 shadow-xl transition-transform hover:scale-105"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              {/* Glow Effect Layer removed - handled by wrapper */}

              <div className="relative z-10">
                <h4 className="text-xl font-bold text-white">Plan B ásico</h4>

                <p className="mt-2 text-zinc-400">
                  Ideal para pequeños comercios que recién comienzan.
                </p>
                <div className="mt-6 flex items-baseline justify-center gap-2">
                  <span className="text-4xl font-extrabold text-white">
                    {billingCycle === 'monthly' ? '$10.000' : '$90.000'}
                  </span>
                  <span className="text-zinc-400">
                    ARS / {billingCycle === 'monthly' ? 'mes' : 'año'}
                  </span>
                </div>

                <ul className="mt-6 space-y-3 text-left text-sm">
                  <li className="flex items-center gap-2 text-zinc-300">
                    <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-500" />
                    Punto de Venta (POS)
                  </li>
                  <li className="flex items-center gap-2 text-zinc-300">
                    <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-500" />
                    Control de Stock y Caja
                  </li>
                  <li className="flex items-center gap-2 text-zinc-300">
                    <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-500" />
                    Reportes Básicos
                  </li>
                  <li className="flex items-center gap-2 text-zinc-500">
                    <XCircle className="h-5 w-5 flex-shrink-0 text-zinc-600" />
                    Facturación AFIP
                  </li>
                  <li className="flex items-center gap-2 text-zinc-500">
                    <XCircle className="h-5 w-5 flex-shrink-0 text-zinc-600" />
                    Multi-sucursal
                  </li>
                </ul>

                <Link to="/signup?plan=basic" className="w-full">
                  <AnimatedButton
                    className="mt-8 w-full border border-blue-600 py-3 font-semibold text-blue-500"
                    variant="outline"
                    shimmerColor="rgba(0,0,0,0.1)"
                    shimmerDuration="3s"
                    borderRadius="6px"
                  >
                    Elegir Plan Básico
                  </AnimatedButton>
                </Link>
              </div>
            </motion.div>

            {/* PLAN COMPLETO */}
            <motion.div
              className="group relative overflow-hidden rounded-xl border border-blue-500/50 bg-zinc-800 p-8 shadow-2xl shadow-blue-500/20 transition-transform hover:scale-105"
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              {/* Glow Effect Layer removed - handled by wrapper */}

              <div className="relative z-10">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-1 text-sm font-bold text-white shadow-lg">
                  MÁS POPULAR
                </div>
                <h4 className="text-xl font-bold text-white">Plan C ompleto</h4>

                <p className="mt-2 text-zinc-400">
                  La solución definitiva sin límites.
                </p>
                <div className="mt-6 flex items-baseline justify-center gap-2">
                  <span className="text-4xl font-extrabold text-white">
                    {billingCycle === 'monthly' ? '$16.000' : '$135.000'}
                  </span>
                  <span className="text-zinc-400">
                    ARS / {billingCycle === 'monthly' ? 'mes' : 'año'}
                  </span>
                </div>
                {billingCycle === 'annual' && (
                  <p className="mt-2 text-sm text-green-400">
                    ¡Ahorras $57.000 al año!
                  </p>
                )}

                <ul className="mt-6 space-y-3 text-left text-sm">
                  <li className="flex items-center gap-2 text-zinc-300">
                    <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-500" />
                    Todo lo del Plan Básico
                  </li>
                  <li className="flex items-center gap-2 font-medium text-white">
                    <CheckCircle className="h-5 w-5 flex-shrink-0 text-blue-400" />
                    Facturación Electrónica AFIP
                  </li>
                  <li className="flex items-center gap-2 font-medium text-white">
                    <CheckCircle className="h-5 w-5 flex-shrink-0 text-blue-400" />
                    Gestión Multi-sucursal
                  </li>
                  <li className="flex items-center gap-2 text-zinc-300">
                    <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-500" />
                    Soporte Prioritario
                  </li>
                  <li className="flex items-center gap-2 font-medium text-white">
                    <CheckCircle className="h-5 w-5 flex-shrink-0 text-blue-400" />
                    Reporte Diario Automático
                  </li>
                  <li className="flex items-center gap-2 font-medium text-white">
                    <CheckCircle className="h-5 w-5 flex-shrink-0 text-blue-400" />
                    Asistente de IA Avanzado
                  </li>
                  <li className="flex items-center gap-2 text-zinc-300">
                    <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-500" />
                    Actualizaciones Continuas
                  </li>
                </ul>

                <Link to="/signup?plan=premium" className="w-full">
                  <AnimatedButton
                    className="mt-8 w-full py-3 font-semibold text-white shadow-lg"
                    background="linear-gradient(to right, #2563eb, #0891b2)"
                    shimmerColor="rgba(255,255,255,0.2)"
                    shimmerDuration="3s"
                    borderRadius="6px"
                    glow={true}
                  >
                    Elegir Plan Completo
                  </AnimatedButton>
                </Link>
              </div>
            </motion.div>
          </HoverEffectWrapper>
        </section>

        {/* Contact Section */}
        <section id="contact" className="px-4 py-20 sm:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-12 lg:grid-cols-2">
              {/* Contact Info */}
              <div>
                <h3 className="text-3xl font-bold text-white sm:text-4xl">
                  ¿Tienes preguntas? <br />
                  <TypeAnimation
                    words={['Hablemos.', 'Conectemos.', 'Crezcamos.']}
                    typingSpeed={100}
                    deletingSpeed={50}
                    pauseDuration={2000}
                    gradientFrom="blue-500"
                    gradientTo="cyan-500"
                    className="block text-blue-500"
                  />
                </h3>
                <p className="mt-4 text-lg text-zinc-400">
                  Estamos aquí para ayudarte a transformar tu negocio.
                  Contáctanos por cualquiera de nuestros canales.
                </p>

                <HoverEffectWrapper className="mt-8 space-y-6">
                  <a
                    href="https://wa.me/5493541215803"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 transition-colors hover:border-green-500/50 hover:bg-zinc-800"
                    data-glow-color="rgba(34, 197, 94, 0.5)"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10 text-green-500">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">WhatsA pp</h4>

                      <p className="text-sm text-zinc-400">
                        +54 9 3541 21-5803
                      </p>
                    </div>
                  </a>

                  <a
                    href="mailto:khaleesisystempos@gmail.com"
                    className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 transition-colors hover:border-blue-500/50 hover:bg-zinc-800"
                    data-glow-color="rgba(59, 130, 246, 0.5)"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10 text-blue-500">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect width="20" height="16" x="2" y="4" rx="2" />
                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">Email</h4>
                      <p className="text-sm text-zinc-400">
                        khaleesisystempos@gmail.com
                      </p>
                    </div>
                  </a>
                </HoverEffectWrapper>
              </div>

              {/* Contact Form (Visual) */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 backdrop-blur-sm">
                <form
                  className="space-y-4"
                  onSubmit={(e) => e.preventDefault()}
                >
                  <div>
                    <label className="mb-2 block text-sm font-medium text-zinc-400">
                      Nombre
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Tu nombre"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-zinc-400">
                      Email
                    </label>
                    <input
                      type="email"
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="tu@email.com"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-zinc-400">
                      Mensaje
                    </label>
                    <textarea
                      rows={4}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="¿En qué podemos ayudarte?"
                    />
                  </div>
                  <AnimatedButton
                    className="w-full py-3 font-semibold text-zinc-900"
                    background="white"
                    shimmerColor="rgba(0,0,0,0.05)"
                    shimmerDuration="3s"
                    borderRadius="8px"
                  >
                    Enviar Mensaje
                  </AnimatedButton>
                </form>
              </div>
            </div>
          </div>
        </section>

        {/* Developer Section */}
        <section className="border-t border-zinc-800 bg-zinc-900/50 px-4 py-20">
          <div className="mx-auto max-w-4xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h3 className="mb-12 text-3xl font-bold text-white">
                Conoce al Desarrollador
              </h3>

              <a
                href="https://www.linkedin.com/in/brian-oviedo-1a04ba262/"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-block"
              >
                <div className="relative mx-auto flex max-w-sm flex-col items-center rounded-2xl border border-zinc-700 bg-zinc-800/50 p-8 transition-all duration-300 hover:border-blue-500/50 hover:bg-zinc-800 hover:shadow-2xl hover:shadow-blue-500/10">
                  <div className="relative mb-6">
                    <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-blue-600 to-cyan-600 opacity-75 blur transition duration-300 group-hover:opacity-100" />
                    <div className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-zinc-900 bg-zinc-700">
                      <img
                        src={profileImage}
                        alt="Brian Oviedo"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </div>

                  <h4 className="text-xl font-bold text-white group-hover:text-blue-400">
                    Brian Oviedo
                  </h4>
                  <p className="mt-1 text-sm font-medium text-blue-500">
                    CEO & Founder
                  </p>
                  <p className="mt-4 text-center text-sm text-zinc-400">
                    Apasionado por crear soluciones tecnológicas que transforman
                    negocios. Conecta conmigo para saber más.
                  </p>

                  <div className="mt-6 flex items-center gap-2 rounded-full bg-blue-600/10 px-4 py-2 text-sm font-medium text-blue-400 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                    <svg
                      className="h-4 w-4"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                    </svg>
                    Ver Perfil de LinkedIn
                  </div>
                </div>
              </a>
            </motion.div>
          </div>
        </section>
      </main>

      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  );
};

export default LandingPage;
