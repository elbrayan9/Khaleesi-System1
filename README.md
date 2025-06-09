# Khaleesi System - Punto de Venta y Gestión

**Khaleesi System** es una aplicación web de Punto de Venta (POS) y gestión de negocios, diseñada para ser rápida, segura y fácil de usar. Construida como una aplicación de página única (SPA) con **React**, utiliza **Firebase** para un backend robusto que incluye autenticación de usuarios, base de datos en tiempo real y lógica en la nube.

---

## 🚀 Tecnologías Utilizadas

-   ⚛️ **React 19** (con Hooks)
-   🛣️ **React Router DOM**: Para un enrutamiento fluido y moderno en el lado del cliente.
-   🔄 **React Context API**: Para una gestión de estado global centralizada y eficiente.
-   ⚡ **Vite**: Como herramienta de construcción y servidor de desarrollo de alta velocidad.
-   🔥 **Firebase (Backend)**:
    -   **Authentication**: Gestión completa de usuarios con email/contraseña, recuperación de contraseñas y roles personalizados (Admin/Usuario).
    -   **Firestore**: Base de datos NoSQL en tiempo real para persistir todos los datos de la aplicación (productos, ventas, etc.).
    -   **Cloud Functions**: Para lógica de backend segura, como la asignación de roles de administrador.
-   🎨 **Tailwind CSS**: Para una estilización moderna, responsiva y basada en utilidades.
-   🎬 **Framer Motion**: Para animaciones fluidas y una experiencia de usuario mejorada.
-   🔔 **SweetAlert2**: Para notificaciones y diálogos de confirmación elegantes.
-   ✨ **Lucide React**: Para un set de íconos limpios y consistentes.
-   🛠️ **Node.js + npm**: Para la gestión de dependencias y scripts.

---

## ✨ Funcionalidades Implementadas

-   **Sistema de Autenticación Completo**:
    -   Registro, Inicio de Sesión y Cierre de Sesión de usuarios.
    -   Función de **Recuperación de Contraseña** a través de email.
    -   **Rutas Protegidas** que aseguran que solo usuarios autenticados puedan acceder al panel principal.
    -   **Roles de Usuario**: Distinción entre usuarios comunes y Administradores con permisos elevados.

-   **Módulo de Ventas Dinámico**:
    -   Búsqueda de productos por nombre o código de barras.
    -   Opción de "Venta Rápida" para productos no inventariados.
    -   Gestión de carrito de compras intuitiva.
    * Actualización de stock en tiempo real tras cada venta.

-   **Gestión (CRUD Completo)**:
    -   **Productos**: Creación, lectura, actualización y eliminación de productos con control de stock.
    -   **Clientes**: Gestión de la base de datos de clientes.

-   **Módulo de Reportes y Caja**:
    -   Visualización de ventas diarias y mensuales.
    -   Gráfico de ventas para un análisis visual rápido.
    -   Registro de **ingresos y egresos manuales** para un control de caja preciso.
    -   Simulación de "Cierre de Caja" con desglose de métodos de pago.

-   **Notas de Crédito y Débito**:
    -   **Anulación de Ventas**: Generación automática de una nota de crédito y restauración del stock de los productos involucrados.
    -   **Creación Manual**: Formulario para crear notas de crédito o débito independientes.

-   **Configuración y Personalización**:
    -   Panel para que cada usuario configure los datos de su propio negocio.
    -   Manejo de suscripciones (Trial / Active / Expired) controlado por el administrador.

---

## 🛠️ Instalación y Uso

### Prerrequisitos
* Node.js (v18.x o superior)
* npm (incluido con Node.js)
* Cuenta de Firebase con un proyecto creado y la facturación activada (Plan Blaze) para el uso de Cloud Functions.

### Pasos para el Frontend

1.  **Clonar el repositorio**:
    ```bash
    git clone [https://github.com/elbrayan9/khaleesi-system1.git](https://github.com/elbrayan9/khaleesi-system1.git)
    cd khaleesi-system1
    ```

2.  **Instalar dependencias del frontend**:
    ```bash
    cd frontend
    npm install
    ```

3.  **Configurar variables de entorno**:
    Crea un archivo `.env` en la raíz de la carpeta `frontend/` y añade tus credenciales de Firebase.
    ```env
    VITE_API_KEY=TU_API_KEY
    VITE_AUTH_DOMAIN=TU_AUTH_DOMAIN
    VITE_PROJECT_ID=TU_PROJECT_ID
    # ... y las demás variables
    ```
    > ⚠️ **Importante**: Este archivo no debe subirse a repositorios públicos.

4.  **Ejecutar en modo desarrollo**:
    ```bash
    npm run dev
    ```

### Pasos para el Backend (Cloud Functions)

1.  **Navegar a la carpeta de funciones**:
    ```bash
    cd functions 
    ```
    *(Desde la raíz del proyecto `khaleesi-system1`)*

2.  **Instalar dependencias del backend**:
    ```bash
    npm install
    ```
    
3.  **Desplegar las funciones en Firebase**:
    ```bash
    firebase deploy --only functions
    ```
---

## ✅ Próximos Pasos / Mejoras Potenciales

* **Integración con Pasarelas de Pago**: Automatizar la activación de suscripciones usando Mercado Pago o Stripe.
* **Panel de Administrador en la App**: Crear una sección dentro de la aplicación, visible solo para administradores, para gestionar usuarios y suscripciones sin usar la Consola de Firebase.
* **Generación de PDF**: Exportar recibos, notas y reportes en formato PDF.
* **Funciones Automáticas (Cron Jobs)**: Crear una Cloud Function que se ejecute diariamente para verificar las fechas de vencimiento de las pruebas y cambiar el estado de los usuarios automáticamente.
* **Tests Unitarios y de Integración**: Añadir pruebas para asegurar la calidad y estabilidad del código.