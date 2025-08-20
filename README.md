Khaleesi System - Punto de Venta y Gestión
Khaleesi System es una aplicación web de Punto de Venta (POS) y gestión de negocios, diseñada para ser rápida, segura y fácil de usar. Construida como una aplicación de página única (SPA) con React, utiliza Firebase para un backend robusto que incluye autenticación, base de datos en tiempo real y lógica en la nube con Cloud Functions v2.

🚀 Tecnologías Utilizadas
⚛️ React (con Hooks)

🛣️ React Router DOM: Para un enrutamiento fluido en el lado del cliente.

🔄 React Context API: Para una gestión de estado global centralizada.

⚡ Vite: Como herramienta de construcción y servidor de desarrollo de alta velocidad.

🔥 Firebase (Backend):

Authentication: Gestión completa de usuarios con email/contraseña y roles (Admin/Usuario).

Firestore: Base de datos NoSQL en tiempo real para productos, clientes, vendedores y ventas.

Cloud Functions v2: Para lógica de backend segura (asignación de roles, actualizaciones masivas, conexión con APIs externas).

🧠 Google Gemini API: Integrada a través de una Cloud Function para un chatbot de asistencia inteligente.

🎨 Tailwind CSS: Para una estilización moderna y responsiva.

🎬 Framer Motion: Para animaciones fluidas que mejoran la experiencia de usuario.

🔔 SweetAlert2: Para notificaciones y diálogos de confirmación elegantes.

✨ Lucide React: Para un set de íconos limpios y consistentes.

🛠️ Node.js + npm: Para la gestión de dependencias.

✨ Funcionalidades Implementadas
Sistema de Autenticación y Diseño:

Registro, Inicio de Sesión y Cierre de Sesión.

Función de Recuperación de Contraseña.

Fondo animado e interactivo en todas las pantallas de autenticación.

Roles de Usuario: Distinción entre usuarios comunes y Administradores.

Módulo de Ventas Dinámico (Punto de Venta):

Búsqueda de productos por nombre o código de barras.

Carrito de compras con capacidad para modificar cantidades.

Descuentos por producto aplicados en porcentaje al momento de la venta.

Pagos Divididos: Posibilidad de registrar una venta con múltiples métodos de pago (ej: parte en efectivo, parte con tarjeta).

Calculadora de Vuelto automática para pagos en efectivo.

Actualización de stock en tiempo real tras cada venta.

Gestión (CRUD Completo):

Productos: Gestión completa con control de stock, costo y precio.

Clientes: Base de datos de clientes.

Vendedores: Gestión de la lista de personal del negocio.

Selección de Vendedor Activo por sesión para registrar quién realiza cada operación.

Módulo de Reportes y Caja:

Visualización de ventas diarias y mensuales.

Registro de ingresos y egresos manuales para un control de caja preciso.

Cierre de Caja con desglose de ventas por método de pago y por vendedor.

Notas de Crédito y Débito:

Formulario para crear notas de crédito/débito para clientes registrados o Consumidor Final.

Lógica para devolución de productos y ajuste automático de stock.

Funciones Avanzadas:

Importación/Exportación a Excel: Permite actualizar precios y stock de forma masiva.

Impresión de Tickets: Generación de tickets de venta y notas de crédito con un formato profesional y en una sola página.

Chatbot de Ayuda con Gemini: Un asistente inteligente integrado que responde preguntas sobre el sistema.

Panel de Administrador:

Visualización de todos los usuarios registrados.

Gestión de suscripciones de usuarios.

🛠️ Instalación y Uso
Prerrequisitos
Node.js (v18.x o superior)

npm (incluido con Node.js)

Cuenta de Firebase con un proyecto creado y la facturación activada (Plan Blaze) para el uso de Cloud Functions y APIs de Google.

Pasos para el Frontend
Clonar el repositorio:

Bash

git clone https://github.com/elbrayan9/khaleesi-system1.git
cd khaleesi-system1/frontend
Instalar dependencias:

Bash

npm install
Configurar variables de entorno:

Crea un archivo .env en la raíz de la carpeta frontend/.

Añade tus credenciales de Firebase (puedes obtenerlas desde la configuración de tu proyecto en la consola de Firebase).

Fragmento de código

VITE_API_KEY=TU_API_KEY
VITE_AUTH_DOMAIN=TU_AUTH_DOMAIN
VITE_PROJECT_ID=TU_PROJECT_ID
VITE_STORAGE_BUCKET=TU_STORAGE_BUCKET
VITE_MESSAGING_SENDER_ID=TU_MESSAGING_SENDER_ID
VITE_APP_ID=TU_APP_ID
Ejecutar en modo desarrollo:

Bash

npm run dev
Pasos para el Backend (Cloud Functions)
Navegar a la carpeta de funciones:

Bash

cd ../functions 
Instalar dependencias:

Bash

npm install
Configurar Clave Secreta de Gemini:

Obtén tu clave de API desde Google AI Studio.

Asegúrate de que las APIs Vertex AI y Generative Language API estén habilitadas en tu proyecto de Google Cloud.

Guarda la clave de forma segura ejecutando:

Bash

firebase functions:secrets:set GEMINI_KEY
(Luego, pega tu clave cuando la terminal te lo pida).

Desplegar las funciones:

Bash

firebase deploy --only functions
✅ Mejoras Futuras
Integración con Pasarelas de Pago: Automatizar cobros con Mercado Pago o Stripe.

Generación de PDF: Exportar recibos y reportes en formato PDF.

Funciones Automáticas (Cron Jobs): Verificar suscripciones vencidas diariamente.

Tests Unitarios: Añadir pruebas para asegurar la estabilidad del código.

Chatbot más Contextual (RAG): Mejorar el chatbot para que pueda consultar datos en tiempo real (ej: stock de un producto específico).
