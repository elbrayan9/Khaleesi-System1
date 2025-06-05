# Frontend de Khaleesi System

Este directorio contiene el código fuente del frontend para la aplicación Khaleesi System, construido con React y Vite.

## Estructura de Carpetas Clave

-   `public/`: Archivos estáticos.
-   `src/`: Código fuente principal.
    -   `components/`: Componentes reutilizables de UI y vistas específicas de las rutas.
        -   `ui/`: Componentes base de UI (ej. shadcn/ui).
        -   `lib/`: Utilidades específicas de componentes (ej. `cn` de shadcn/ui).
    -   `context/`: Contiene `AppContext.jsx` para la gestión del estado global.
    -   `data/`: Archivos con datos iniciales o de ejemplo.
    -   `services/`: Módulos para interactuar con servicios externos (ej., `firestoreService.js`).
    -   `utils/`: Funciones de utilidad generales (ej., `helpers.js`).
    -   `App.jsx`: Define la estructura de enrutamiento principal de la aplicación.
    -   `main.jsx`: Punto de entrada de la aplicación React, configura Providers.
-   `vite.config.js`: Configuración de Vite.
-   `tailwind.config.js`: Configuración de Tailwind CSS.

## Estilo y UI

-   Se utiliza **Tailwind CSS** para la estilización.
-   Los componentes de UI se basan en la filosofía de `shadcn/ui`, utilizando `tailwind-merge` y `clsx` para la composición de clases (ver `src/components/lib/utils.js`).

Para instrucciones generales de instalación, scripts y descripción del proyecto, por favor consulta el [README.md principal del repositorio](../README.md).