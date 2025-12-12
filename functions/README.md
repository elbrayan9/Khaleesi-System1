# Khaleesi System - Cloud Functions

Este directorio contiene las Cloud Functions para Firebase del sistema Khaleesi. Estas funciones manejan la lógica del lado del servidor, tareas programadas y operaciones administrativas.

## Configuración Inicial

Asegúrate de tener las dependencias instaladas:

```bash
cd functions
npm install
```

### Variables de Entorno y Secretos

El sistema utiliza Google Cloud Secret Manager para manejar claves sensibles.
Asegúrate de configurar el siguiente secreto antes de desplegar:

- `GEMINI_KEY`: Tu API Key de Google Gemini.

```bash
firebase functions:secrets:set GEMINI_KEY
```

## Funciones Disponibles

### 🛠️ Administración

| Función                  | Tipo     | Descripción                                                                                     |
| ------------------------ | -------- | ----------------------------------------------------------------------------------------------- |
| `addAdminRole`           | Callable | Asigna el rol de administrador a un usuario por su email.                                       |
| `listAllUsers`           | Callable | Lista todos los usuarios registrados y sus datos básicos (Admin only).                          |
| `getUserDetails`         | Callable | Obtiene detalles completos (productos, ventas, clientes) de un usuario específico (Admin only). |
| `updateUserSubscription` | Callable | Actualiza el estado y fecha de suscripción de un usuario (Admin only).                          |
| `notifyAdminOfPayment`   | Callable | Registra una notificación de pago pendiente de revisión.                                        |

### 🤖 Inteligencia Artificial (Gemini)

| Función     | Tipo     | Descripción                                                                                                                            |
| ----------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `askGemini` | Callable | Asistente virtual que responde preguntas sobre el sistema y consultas de stock. Utiliza el modelo `gemini-pro` (o `gemini-1.5-flash`). |

### 📦 Gestión de Datos

| Función              | Tipo     | Descripción                                                       |
| -------------------- | -------- | ----------------------------------------------------------------- |
| `bulkUpdateProducts` | Callable | Permite la actualización masiva de precios y stock de productos.  |
| `backupUserData`     | Callable | Genera un backup completo de todas las colecciones de un usuario. |

### ⏰ Tareas Programadas (Cron Jobs)

| Función                     | Frecuencia        | Descripción                                                                        |
| --------------------------- | ----------------- | ---------------------------------------------------------------------------------- |
| `checkExpiredSubscriptions` | Diario (03:00 AR) | Verifica y marca como "expired" las suscripciones vencidas.                        |
| `enviarReporteDiario`       | Diario (21:00 AR) | Envía un email con el resumen de ventas del día anterior a los usuarios suscritos. |

### 🧾 Facturación Electrónica (AFIP)

El sistema integra los Web Services de AFIP para la emisión de comprobantes electrónicos (Facturas A, B, C, Notas de Crédito, etc.).

| Función            | Tipo     | Descripción                                                                                                |
| ------------------ | -------- | ---------------------------------------------------------------------------------------------------------- |
| `createInvoice`    | Callable | Genera un comprobante electrónico (CAE) utilizando el WSFEv1.                                              |
| `getContribuyente` | Callable | Consulta los datos de una persona o empresa en el Padrón A13 (Constancia de Inscripción).                  |
| `checkAfipStatus`  | Callable | **[NUEVO]** Verifica el estado de los servidores de AFIP (App, DB, Auth) y la validez de los certificados. |

#### Configuración de Certificados

Para que la facturación funcione, cada usuario (o sucursal) debe tener configurados sus certificados digitales:

1.  **Certificado (.crt)**: Generado en el portal de AFIP.
2.  **Clave Privada (.key)**: Generada localmente (OpenSSL) para crear el CSR.

**Gestión de Certificados:**

- Los certificados se suben desde el frontend en la pestaña **Configuración**.
- El sistema permite **eliminar** y **reemplazar** certificados vencidos sin intervención manual en la base de datos.
- Al eliminar un certificado, se borra su contenido de Firestore, permitiendo una carga limpia.

#### 🔐 Guía: Cómo Generar Certificados para Producción

Para operar en producción, necesitas generar tu propia clave privada y obtener un certificado firmado por AFIP.

**Paso 1: Generar Clave Privada y CSR (Solicitud de Firma)**
Necesitas tener `openssl` instalado. Ejecuta en tu terminal:

```bash
# 1. Generar Clave Privada (Guárdala bien, es secreta)
openssl genrsa -out privada.key 2048

# 2. Generar CSR (Certificate Signing Request)
# Importante: En "Common Name" (CN) pon el nombre de tu empresa o servicio.
openssl req -new -key privada.key -out pedido.csr
```

**Paso 2: Obtener Certificado en AFIP**

1.  Ingresa al portal de AFIP con tu Clave Fiscal.
2.  Ve al servicio **"Administración de Certificados Digitales"**.
3.  Selecciona el alias (o crea uno nuevo) para el servicio que usarás.
4.  Sube el archivo `pedido.csr` que generaste.
5.  Descarga el archivo `.crt` (ej. `certificado.crt`).

**Paso 3: Asociar al Web Service**

1.  En el portal de AFIP, ve al servicio **"Administrador de Relaciones de Clave Fiscal"**.
2.  Selecciona **"Nueva Relación"**.
3.  Busca el servicio **"Facturación Electrónica"** -> **"Web Service Facturación Electrónica"**.
4.  Asocia el "Computador Fiscal" (el alias donde subiste el certificado) a tu CUIT.

**Paso 4: Crear Punto de Venta (PtoVta)**

1.  En el portal de AFIP, ve al servicio **"Administración de Puntos de Venta y Domicilios"**.
2.  Selecciona tu empresa/nombre.
3.  Elige **"A.B.M. de Puntos de Venta"** -> **"Agregar"**.
4.  Completa los datos:
    - **Número**: Elige un número (ej. 1, 2, etc.). Este será tu `ptoVta` en el sistema.
    - **Nombre Fantasía**: El nombre de tu local o sistema (ej. "Khaleesi System").
    - **Sistema**: Selecciona **"Factura Electrónica - Web Service"**.
    - **Domicilio**: Selecciona el domicilio fiscal asociado.
5.  Guarda los cambios.

**Paso 5: Implementación en el Sistema**

1.  Ve a la pestaña **Configuración** de Khaleesi System.
2.  En la sección AFIP, carga los archivos:
    - **Certificado**: El archivo `.crt` descargado de AFIP.
    - **Clave Privada**: El archivo `privada.key` generado en el Paso 1.
3.  Ingresa el **Punto de Venta** que creaste en el Paso 4 (ej. 1).
4.  Haz clic en **"Guardar Cambios"**.
5.  Usa el botón **"Probar Conexión"** para verificar que todo funcione correctamente.

#### Health Check (Prueba de Conexión)

Se ha implementado un mecanismo de "Health Check" que utiliza el método `FEDummy` de AFIP. Esto permite:

- Verificar si los servidores de AFIP están online (AppServer, DbServer, AuthServer).
- Validar que el certificado y la clave privada coinciden y son válidos.
- Detectar si se está operando en modo **Homologación** (Testing) o **Producción**.

Todo esto se realiza sin generar comprobantes ni afectar la facturación real.

## Despliegue

Para desplegar todas las funciones:

```bash
firebase deploy --only functions
```

Para desplegar una función específica (útil para iteraciones rápidas):

```bash
firebase deploy --only functions:nombreDeLaFuncion
# Ejemplo:
firebase deploy --only functions:askGemini
```

## Notas de Desarrollo

- Las funciones corren en **Node.js 20**.
- Se utiliza `firebase-functions/v2` para la mayoría de las implementaciones.
- La zona horaria por defecto para las tareas programadas es `America/Argentina/Cordoba` o `Buenos_Aires`.
