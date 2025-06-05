# Khaleesi System

**Khaleesi System** es una aplicación web de Punto de Venta (POS) y gestión desarrollada con **React** y **Vite**. Utiliza **Firebase** como backend para la gestión de datos (Firestore) y autenticación. La aplicación ha sido reestructurada para incorporar **React Router DOM** para la navegación y **React Context API** para una gestión de estado global eficiente.

---

## 📦 Estructura del Proyecto (Frontend)

---

## 🚀 Tecnologías Utilizadas

-   ⚛️ **React 19** (con Hooks)
-   🛣️ **React Router DOM** para enrutamiento del lado del cliente.
-   🔄 **React Context API** para la gestión del estado global.
-   ⚡ **Vite** como herramienta de construcción y servidor de desarrollo.
-   🔥 **Firebase**
    -   **Authentication**: Para inicio de sesión de usuarios.
    -   **Firestore**: Como base de datos NoSQL para productos, clientes, ventas, etc.
    -   _(Opcional: Hosting, Storage si se implementan)_
-   💾 **JavaScript (ES6+)**
-   🎨 **Tailwind CSS** para la estilización.
    -   Integrado con `shadcn/ui` (o similar, basado en `components.json`) para componentes de UI.
-   🛠️ **Node.js** + **npm** para la gestión de dependencias y scripts.

---

## ✨ Funcionalidades Destacadas

-   **Gestión de Estado Centralizada**: Uso de React Context para un manejo eficiente del estado de la aplicación (productos, carrito, usuario, etc.).
-   **Enrutamiento Moderno**: Navegación fluida entre secciones (Venta, Productos, Clientes, Reportes, Configuración) gracias a React Router DOM.
-   **Rutas Protegidas**: Acceso seguro a las funcionalidades principales solo para usuarios autenticados.
-   **Autenticación de Usuarios**: Sistema de login (actualmente simulado con credenciales fijas, pero integrado con Firebase Auth).
-   **CRUD Completo**:
    -   Gestión de Productos (Crear, Leer, Actualizar, Eliminar) con persistencia en Firestore.
    -   Gestión de Clientes (Crear, Leer, Actualizar, Eliminar) con persistencia en Firestore.
-   **Módulo de Ventas**:
    -   Selección de productos por código de barras o búsqueda manual.
    -   Gestión de carrito de compras.
    -   Confirmación de venta con múltiples métodos de pago (simulados).
    -   Actualización automática de stock de productos tras una venta.
    -   Generación de recibos para impresión (simulada).
-   **Módulo de Reportes**:
    -   Visualización de ventas diarias y mensuales.
    -   Gráfico de ventas.
    -   Registro y visualización de ingresos manuales y egresos.
    -   Cálculo de saldo de caja esperado (simulado).
-   **Notas de Crédito/Débito**:
    -   Generación de notas asociadas a clientes.
    -   Opción de registrar devolución de productos con ajuste de stock para notas de crédito.
-   **Configuración del Negocio**: Personalización de datos del negocio para impresión.
-   **Interfaz Oscura y Responsiva**: Diseño adaptable utilizando Tailwind CSS.

---

## 🛠️ Instalación y Uso

### Prerrequisitos
* Node.js (v18.x o superior recomendado)
* npm (generalmente viene con Node.js)
* Una cuenta de Firebase y un proyecto configurado.

### Pasos

1.  **Clonar el repositorio**:
    ```bash
    git clone [https://github.com/elbrayan9/khaleesi-system1.git](https://github.com/elbrayan9/khaleesi-system1.git)
    cd khaleesi-system1/frontend
    ```

2.  **Instalar las dependencias**:
    ```bash
    npm install
    ```

3.  **Configurar Firebase**:
    Crea un archivo `.env` en la raíz de la carpeta `frontend/`. Basado en tu archivo `src/firebaseConfig.js` y las convenciones de Vite, el contenido debería ser:
    ```env
    VITE_API_KEY=TU_API_KEY_DE_FIREBASE
    VITE_AUTH_DOMAIN=TU_AUTH_DOMAIN_DE_FIREBASE
    VITE_PROJECT_ID=TU_PROJECT_ID_DE_FIREBASE
    VITE_STORAGE_BUCKET=TU_STORAGE_BUCKET_DE_FIREBASE
    VITE_MESSAGING_SENDER_ID=TU_MESSAGING_SENDER_ID_DE_FIREBASE
    VITE_APP_ID=TU_APP_ID_DE_FIREBASE
    VITE_MEASUREMENT_ID=TU_MEASUREMENT_ID_DE_FIREBASE (Opcional, si usas Analytics)
    ```
    > ⚠️ **Importante**: Reemplaza los placeholders con tus credenciales reales de Firebase. Este archivo `.env` está ignorado por Git (`.gitignore`) y no debe subirse al repositorio público.

4.  **Ejecutar el proyecto en modo desarrollo**:
    ```bash
    npm run dev
    ```
    La aplicación debería estar disponible en `http://localhost:5173` (o el puerto que indique Vite).

---

## 📁 Scripts Disponibles en `frontend/`

-   `npm run dev`: Inicia el servidor de desarrollo con Hot Module Replacement (HMR).
-   `npm run build`: Compila la aplicación para producción en la carpeta `dist/`.
-   `npm run lint`: Ejecuta ESLint para analizar el código.
-   `npm run preview`: Sirve la aplicación compilada para producción localmente.

---

## ✅ Próximos Pasos / Mejoras Potenciales (Opcional)

* Implementar autenticación real con Firebase Auth (actualmente es simulada).
* Mejorar la gestión de errores y feedback al usuario.
* Expandir funcionalidades de reportes (filtros, exportaciones).
* Optimización para performance en listas grandes.
* Tests unitarios y de integración.

---

## 🙌 Agradecimientos

Este proyecto fue realizado por Brian Oviedo. ¡Gracias por visitarlo!