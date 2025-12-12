# 🐉 Khaleesi System - Frontend

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)

> **Sistema de Gestión Integral (ERP/POS) moderno, rápido y escalable.**
> Diseñado para optimizar el control de stock, ventas y reportes en tiempo real.

---

## ✨ Módulos y Funcionalidades

El sistema está dividido en módulos especializados para cubrir todas las necesidades operativas:

### 🛒 Punto de Venta (POS)

- **Interfaz de Venta Rápida**: Búsqueda de productos por nombre o código de barras.
- **Carrito Dinámico**: Cálculo automático de totales, descuentos y recargos.
- **Múltiples Medios de Pago**: Efectivo, Tarjeta, Transferencia, Cuenta Corriente.
- **Impresión de Tickets**: Generación de comprobantes térmicos y facturas A4/A5.

### 📦 Gestión de Inventario

- **Control de Stock**: Seguimiento en tiempo real de existencias.
- **Actualización Masiva**: Herramientas para modificar precios y stock por lotes.
- **Alertas**: Indicadores visuales de stock bajo y crítico.
- **Importación/Exportación**: Soporte para carga masiva desde Excel.

### 👥 Gestión de Clientes y Proveedores

- **Base de Datos Unificada**: Historial de compras y estados de cuenta.
- **Cuentas Corrientes**: Gestión de saldos, pagos parciales y límites de crédito.
- **Fidelización**: Seguimiento de clientes frecuentes.

### 📊 Reportes y Estadísticas

- **Dashboard Ejecutivo**: KPIs en tiempo real (Ventas del día, Ganancia bruta, Ticket promedio).
- **Análisis de Ventas**: Gráficos de tendencias, mapas de calor de horarios pico.
- **Reportes Financieros**: Cierre de caja, flujo de efectivo y reportes exportables a PDF/Excel.

### 🧾 Facturación y Notas de Crédito

- **Integración AFIP**: Emisión de Facturas A, B y C autorizadas (CAE).
- **Notas de Crédito/Débito**: Gestión completa de devoluciones y anulaciones.
- **Libro de IVA**: Generación automática de reportes impositivos.

### ⚙️ Administración y Seguridad

- **Roles y Permisos**: Control de acceso granular (Admin, Vendedor).
- **Multi-Sucursal**: Gestión centralizada de múltiples puntos de venta.
- **Auditoría**: Registro de movimientos de caja y operaciones sensibles.
- **Health Check**: Monitoreo de estado de servicios externos (AFIP, Firebase).

## 🛠️ Stack Tecnológico

Construido con las mejores herramientas del ecosistema moderno:

- **Core**: [React 18+](https://react.dev/) + [Vite](https://vitejs.dev/) (Build ultra-rápido).
- **Estilos**: [Tailwind CSS](https://tailwindcss.com/) + [Framer Motion](https://www.framer.com/motion/) (Animaciones fluidas).
- **UI Components**: Basado en la arquitectura de [shadcn/ui](https://ui.shadcn.com/) para máxima personalización.
- **Backend & Data**: [Firebase](https://firebase.google.com/) (Firestore, Auth, Functions).
- **Utilidades**: `xlsx` (Excel), `jspdf` (PDFs), `recharts` (Gráficos).

## 🚀 Comenzando

Sigue estos pasos para ejecutar el proyecto en tu entorno local:

### Prerrequisitos

- Node.js (v18 o superior)
- npm o yarn

### Instalación

1.  **Clonar el repositorio** (si no lo has hecho):

    ```bash
    git clone https://github.com/tu-usuario/khaleesi-system1.git
    cd khaleesi-system1/frontend
    ```

2.  **Instalar dependencias**:

    ```bash
    npm install
    ```

3.  **Configurar Variables de Entorno**:
    Crea un archivo `.env` en la raíz de `frontend/` con tus credenciales de Firebase:

    ```env
    VITE_API_KEY=tu_api_key
    VITE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
    VITE_PROJECT_ID=tu_proyecto
    VITE_STORAGE_BUCKET=tu_proyecto.appspot.com
    VITE_MESSAGING_SENDER_ID=tu_sender_id
    VITE_APP_ID=tu_app_id
    ```

4.  **Iniciar Servidor de Desarrollo**:
    ```bash
    npm run dev
    ```
    La aplicación estará disponible en `http://localhost:5173`.

## 📂 Estructura del Proyecto

```bash
frontend/
├── public/              # Assets estáticos (imágenes, favicons)
├── src/
│   ├── components/      # Bloques constructivos de la UI
│   │   ├── ui/          # Componentes base (Botones, Inputs, Modales)
│   │   └── ...          # Componentes de negocio (ProductosTab, VentaTab)
│   ├── context/         # Estado global (AppContext)
│   ├── services/        # Lógica de conexión a Firebase
│   ├── utils/           # Helpers y funciones puras
│   ├── App.jsx          # Enrutamiento y Layout principal
│   └── main.jsx         # Punto de entrada
├── .env                 # Variables de entorno (No subir a git)
├── firebase.json        # Configuración de Hosting y Seguridad
└── vite.config.js       # Configuración del bundler
```

## 🔐 Seguridad

El proyecto implementa prácticas de seguridad robustas:

- **CSP (Content Security Policy)** estricta.
- **Reglas de Firestore** para proteger la integridad de los datos.
- **Autenticación** gestionada por Firebase Auth.

---

Hecho con ❤️ por el equipo de **Khaleesi System**.
