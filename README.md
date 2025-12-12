<div align="center">
  <img src="frontend/public/khaleesi-system.svg" alt="Khaleesi System Logo" width="150"/>
  <h1>Khaleesi System</h1>
  <p>
    <strong>El Sistema de Gestión Integral (ERP/POS) definitivo para tu negocio.</strong>
  </p>
  <p>
    Potencia tu control de stock, ventas y clientes con una plataforma moderna, rápida y segura.
  </p>

  <p>
    <a href="https://khaleesisystem.com.ar/">
      <img src="https://img.shields.io/website?label=Sitio%20Web&style=for-the-badge&url=https%3A%2F%2Fkhaleesisystem.com.ar%2F&logo=google-chrome&logoColor=white&color=2563eb" alt="Sitio Web"/>
    </a>
    <img src="https://img.shields.io/github/last-commit/elbrayan9/khaleesi-system1?style=for-the-badge&logo=git&logoColor=white&color=f59e0b" alt="Último Commit"/>
    <img src="https://img.shields.io/github/repo-size/elbrayan9/khaleesi-system1?style=for-the-badge&logo=github&logoColor=white&color=10b981" alt="Tamaño del Repositorio"/>
  </p>
</div>

---

## 🌟 Visión General

**Khaleesi System** es una solución tecnológica de vanguardia diseñada para centralizar y optimizar todas las operaciones de tu negocio. Ya sea un pequeño comercio o una red de sucursales, nuestra arquitectura escalable se adapta a tus necesidades.

> "Transformamos datos en decisiones inteligentes."

## ✨ Características y Módulos

### 🛒 Punto de Venta (POS) Avanzado

- **Venta Ágil**: Interfaz optimizada para reducir tiempos de espera.
- **Facturación AFIP**: Emisión directa de Facturas A, B y C (Web Services).
- **Medios de Pago**: Gestión integrada de efectivo, tarjetas y cuentas corrientes.

### 📦 Gestión de Inventario

- **Control Total**: Stock en tiempo real, costos, precios y rentabilidad.
- **Alertas Inteligentes**: Notificaciones automáticas de reposición.
- **Importación Masiva**: Carga y actualización de productos desde Excel.

### 📊 Business Intelligence

- **Dashboards en Tiempo Real**: Visualiza tus ventas, ganancias y métricas clave al instante.
- **Reportes Detallados**: Cierres de caja, ranking de productos y análisis de tendencias.
- **Exportación**: Datos listos para compartir en PDF y Excel.

### 🤖 Asistente IA Integrado

- **Gemini AI**: Un copiloto virtual que responde consultas sobre tu stock, ventas y operativa del sistema en lenguaje natural.

### ⚙️ Arquitectura Robusta

- **Multi-Sucursal**: Gestión centralizada de múltiples ubicaciones.
- **Seguridad de Grado Bancario**: Roles de usuario, auditoría y protección de datos.
- **Cloud Native**: Acceso seguro desde cualquier lugar, 24/7.

## 🚀 Stack Tecnológico

Construido sobre una base sólida y moderna para garantizar rendimiento y escalabilidad.

| Capa         | Tecnologías                                                                                                                                                                                                                                                                                                      |
| :----------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Frontend** | ![React](https://img.shields.io/badge/-React-20232A?style=flat-square&logo=react&logoColor=61DAFB) ![Vite](https://img.shields.io/badge/-Vite-646CFF?style=flat-square&logo=vite&logoColor=white) ![Tailwind](https://img.shields.io/badge/-Tailwind-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white) |
| **Backend**  | ![Firebase](https://img.shields.io/badge/-Firebase-FFCA28?style=flat-square&logo=firebase&logoColor=black) (Functions, Firestore, Auth)                                                                                                                                                                          |
| **IA**       | ![Gemini](https://img.shields.io/badge/-Google%20Gemini-8E77F0?style=flat-square&logo=google&logoColor=white)                                                                                                                                                                                                    |

## 📂 Estructura del Proyecto

El repositorio se organiza en dos componentes principales, cada uno con su propia documentación detallada:

- **[`/frontend`](./frontend/README.md)**: La aplicación web (React + Vite). Incluye la interfaz de usuario, lógica de POS y dashboards.
- **[`/functions`](./functions/README.md)**: El backend serverless (Firebase Functions). Maneja la lógica de negocio, integración con AFIP y tareas programadas.

## 🛠️ Guía de Inicio Rápido

### Prerrequisitos

- Node.js (v18 o superior)
- Cuenta de Google/Firebase

### 1. Instalación

```bash
git clone https://github.com/elbrayan9/khaleesi-system1.git
cd khaleesi-system1
```

### 2. Configuración del Backend

```bash
cd functions
npm install
# Configurar variables de entorno (ver functions/README.md)
firebase deploy --only functions
```

### 3. Configuración del Frontend

```bash
cd ../frontend
npm install
# Configurar .env (ver frontend/README.md)
npm run dev
```

## 🔒 Licencia y Seguridad

Este proyecto es propiedad privada. Todos los derechos reservados.
Implementa estrictas políticas de seguridad para proteger la integridad de los datos comerciales.

---

<div align="center">
  <p>Desarrollado con excelencia por <strong>Brian</strong></p>
</div>
