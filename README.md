<div align="center">
  <img src="frontend/public/khaleesi-system.svg" alt="Khaleesi System Logo" width="150"/>
  <h1>Khaleesi System</h1>
  <p>
    <strong>Un sistema de Punto de Venta (POS) y gestión de negocios todo en uno, moderno y potente.</strong>
  </p>
  <p>
    Construido con React, Firebase y TailwindCSS para ofrecer una experiencia de usuario rápida, segura y en tiempo real.
  </p>

  <p>
    <a href="https://khaleesisystem.com.ar/">
      <img src="https://img.shields.io/website?label=Sitio%20Web&style=for-the-badge&url=https%3A%2F%2Fkhaleesisystem.com.ar%2F" alt="Sitio Web"/>
    </a>
    <img src="https://img.shields.io/github/last-commit/elbrayan9/khaleesi-system1?style=for-the-badge" alt="Último Commit"/>
    <img src="https://img.shields.io/github/repo-size/elbrayan9/khaleesi-system1?style=for-the-badge" alt="Tamaño del Repositorio"/>
  </p>
</div>

---

## ✨ Características Principales

Khaleesi System no es solo un POS, es una suite completa para administrar tu negocio.

- **📈 Punto de Venta (POS):** Interfaz rápida e intuitiva para procesar ventas, con carrito de compras y gestión de pagos.
- **📦 Gestión de Inventario:** Control de productos, stock en tiempo real, precios, costos y códigos de barras.
- **👥 CRM Integrado:** Administra tu base de datos de clientes, proveedores y vendedores.
- **📊 Reportes y Analíticas:** Visualiza tus ventas diarias, mensuales, productos más vendidos y flujo de caja con gráficos interactivos.
- **🤖 Asistente con IA:** Chatbot integrado con la **API de Gemini** para resolver dudas y asistir a los usuarios.
- **⚙️ Funciones Avanzadas:**
  - Importación y exportación de datos a **Excel**.
  - Impresión de tickets de venta y notas de crédito.
  - Generación de **códigos QR** para precios dinámicos.
  - Panel de administrador para la gestión de usuarios y suscripciones.

---

## 🚀 Tecnologías Utilizadas

Este proyecto fue construido utilizando un stack de tecnologías modernas, enfocado en el rendimiento y la escalabilidad.

| Área         | Tecnología                                                                                                                                                                                                                                                                                                                 |
| :----------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Frontend** | ![React](https://img.shields.io/badge/-React-61DAFB?style=for-the-badge&logo=react&logoColor=white) ![Vite](https://img.shields.io/badge/-Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white) ![TailwindCSS](https://img.shields.io/badge/-TailwindCSS-38B2AC?style=for-the-badge&logo=tailwindcss&logoColor=white) |
| **Backend**  | ![Firebase](https://img.shields.io/badge/-Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=white) (Auth, Firestore, Functions)                                                                                                                                                                                  |
| **APIs**     | ![Google Gemini](https://img.shields.io/badge/-Google%20Gemini-8E77F0?style=for-the-badge&logo=google&logoColor=white)                                                                                                                                                                                                     |
| **UI**       | `shadcn/ui`, `Chart.js`, `react-hot-toast`                                                                                                                                                                                                                                                                                 |
| **Hosting**  | ![Netlify](https://img.shields.io/badge/-Netlify-00C7B7?style=for-the-badge&logo=netlify&logoColor=white)                                                                                                                                                                                                                  |

---

## 🛠️ Cómo Empezar (Instalación Local)

Sigue estos pasos para levantar el proyecto en tu máquina local.

### Prerrequisitos

- Node.js (v18 o superior)
- `npm` o `yarn`
- Una cuenta de Firebase

### 1. Clona el Repositorio

Bash

git clone [https://github.com/elbrayan9/khaleesi-system1.git](https://github.com/elbrayan9/khaleesi-system1.git)
cd khaleesi-system1

### 2. Configura el Frontend

Bash

cd frontend
npm install

Crea un archivo .env en la carpeta frontend y añade las credenciales de tu proyecto de Firebase:

Fragmento de código

VITE_FIREBASE_API_KEY="AIza..."
VITE_FIREBASE_AUTH_DOMAIN="tu-proyecto.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="tu-proyecto"
VITE_FIREBASE_STORAGE_BUCKET="tu-proyecto.appspot.com"
VITE_FIREBASE_MESSAGING_SENDER_ID="..."
VITE_FIREBASE_APP_ID="1:..."

---

### 3. Configura el Backend (Firebase Functions)

Bash

cd ../functions
npm install
Configura las variables de entorno para las Cloud Functions. Necesitarás tu clave de la API de Gemini.

Bash

# firebase functions:config:set gemini.key="TU_API_KEY_DE_GEMINI"

### 4. ¡A Correr!

Para iniciar el servidor de desarrollo del frontend:

Bash

# Desde la carpeta /frontend

npm run dev
Tu aplicación estará disponible en http://localhost:5173.

🌐 Despliegue
La aplicación está desplegada en Netlify y se actualiza automáticamente con cada push a la rama main. Las funciones del backend se despliegan en Firebase Functions.

📄 Licencia
Este proyecto está bajo la Licencia MIT. Consulta el archivo LICENSE para más detalles.

---

<p align="center">Hecho con ❤️ por Brian</p>
