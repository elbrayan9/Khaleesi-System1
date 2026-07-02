# Habilitar Facturación Electrónica (ARCA / ex-AFIP) en Khaleesi System

Guía paso a paso para dejar a un cliente facturando desde el sistema.
Está basada en la implementación real (`functions/afipController.js` +
`Configuración → Configuración AFIP`).

---

## 0. Lo que hay que entender ANTES de empezar

### ¿Se hace una sola vez? NO.

- **Es POR CLIENTE (por CUIT).** El certificado queda atado a un único CUIT.
  Para un cliente nuevo (otro CUIT) se repite **todo** desde el Paso 1.
- **Caduca.** En producción el certificado dura ~**2 años**. Cuando vence hay
  que renovarlo (repetir Pasos 1 a 3), aunque sea el mismo cliente.
- La **clave privada (.key)** la generás vos y no vence, pero conviene tener
  **una clave + un certificado por cliente**, guardados y etiquetados.

### Los "dos archivos" que pide el sistema

| Archivo | Qué es | Quién lo genera |
|---------|--------|-----------------|
| `privada.key` | Clave privada | La generás vos con OpenSSL (Paso 1) |
| `certificado.crt` | Certificado digital | Lo emite ARCA (Paso 2) |

Van **siempre en par**. El backend valida que coincidan; si no, tira
"Certificado y Clave no coinciden".

### Datos que se cargan en la app (Configuración → Configuración AFIP)

1. **CUIT** del negocio (en Datos del Negocio).
2. **Certificado (.crt)**.
3. **Clave privada (.key)**.
4. **Punto de Venta** habilitado para Web Services.

---

## 1. Generar la clave privada (.key) y el pedido (CSR) con OpenSSL

### 1.a. ¿Tengo OpenSSL?

En Windows, **Git Bash** ya lo trae. Abrí Git Bash y probá:

```bash
openssl version
```

Si responde algo como `OpenSSL 3.x.x`, estás listo. Si dice "command not
found", instalá Git para Windows (https://git-scm.com) y usá su "Git Bash".

### 1.b. Crear una carpeta para el cliente (recomendado)

Así no mezclás certificados de distintos clientes:

```bash
mkdir -p ~/certificados-arca/CLIENTE_NOMBRE
cd ~/certificados-arca/CLIENTE_NOMBRE
```

### 1.c. Generar la clave privada

```bash
openssl genrsa -out privada.key 2048
```

Esto crea el archivo `privada.key`. **Este archivo NO se comparte con nadie**
y es el que después subís a la app.

### 1.d. Generar el CSR (pedido de certificado)

```bash
openssl req -new -key privada.key \
  -subj "/C=AR/O=RAZON SOCIAL DEL CLIENTE/CN=khaleesisystem/serialNumber=CUIT 20XXXXXXXXX" \
  -out pedido.csr
```

Reemplazá:
- `RAZON SOCIAL DEL CLIENTE` → el nombre **tal cual figura en ARCA**.
- `20XXXXXXXXX` → el **CUIT sin guiones** (dejá la palabra `CUIT` y el espacio).
- `CN=khaleesisystem` → un alias/nombre para identificar el certificado
  (puede ser cualquier cosa; conviene algo reconocible).

Queda el archivo `pedido.csr`, que es lo que subís a ARCA en el Paso 2.

> **Reutilización:** para un cliente nuevo (otro CUIT), generá una `privada.key`
> y un `pedido.csr` nuevos (el CUIT y la razón social del CSR son distintos).
> No reutilices los de otro cliente.

---

## 2. Obtener el certificado (.crt) en ARCA

1. Entrá a **https://www.arca.gob.ar** con la **Clave Fiscal del cliente**.
2. Abrí el servicio **"Administración de Certificados Digitales"**.
   - Si no aparece en la lista, agregalo desde
     **"Administrador de Relaciones de Clave Fiscal" → Adherir servicio**.
3. Dentro del servicio: **crear un nuevo alias / certificado** y **subir el
   archivo `pedido.csr`** del Paso 1.
4. ARCA genera el certificado → **descargalo**. Ese archivo es tu
   **`certificado.crt`** (guardalo junto a `privada.key`).

---

## 3. Asociar el certificado al servicio de Facturación (WSFE)

**Sin este paso NO factura.** Es el que más se olvida.

1. En ARCA → **"Administrador de Relaciones de Clave Fiscal"**.
2. **Nueva Relación**.
3. En **"Servicio"** → Buscar → **"Facturación Electrónica" (wsfe)**.
4. En **"Representante"** → seleccioná el **certificado/alias** creado en el
   Paso 2.
5. Confirmar. Eso autoriza a ese certificado a emitir comprobantes.

---

## 4. Habilitar un Punto de Venta para Web Services

1. En ARCA → servicio **"Administración de Puntos de Venta y Domicilios"**.
2. **Alta de Punto de Venta** → tipo **"Web Services"** (Factura Electrónica).
   - ⚠️ Tiene que ser de **Web Services**, NO "Facturador en línea".
3. Anotá el **número** del punto de venta → ese número va en la app.

---

## 5. Cargar todo en la app

En **Configuración → Configuración AFIP**:

1. Subí el **Certificado (.crt)**.
2. Subí la **Clave Privada (.key)**.
3. Escribí el **número de Punto de Venta** del Paso 4.
4. Verificá que el **CUIT** del negocio esté cargado (Datos del Negocio).
5. Guardá y tocá **"📡 Probar Conexión con AFIP"**.
   - Si responde OK → ya se puede facturar. ✅

> El sistema **detecta solo** si el certificado es de Homologación (prueba) o
> Producción (real) según quién lo emitió. No hay switch manual.

---

## 6. Homologación vs Producción

- **Homologación**: entorno de prueba de ARCA. El certificado se saca del
  ambiente de testing. Sirve para probar sin emitir comprobantes reales.
- **Producción**: comprobantes reales con validez fiscal. El certificado se
  saca del ARCA productivo.

Para dejar a un cliente facturando **de verdad**, los certificados de los
Pasos 2 y 3 tienen que ser del **ambiente productivo**.

---

## 7. Renovación (cuando el certificado vence, ~cada 2 años)

1. Repetí los **Pasos 1.c, 1.d, 2 y 3** (nueva key, nuevo CSR, nuevo .crt,
   re-asociar a wsfe).
2. Subí el **.crt y .key nuevos** en la app (Paso 5).
3. El Punto de Venta (Paso 4) **no** hace falta rehacerlo.

---

## 8. Checklist rápido para un cliente NUEVO

- [ ] `openssl genrsa -out privada.key 2048`
- [ ] `openssl req -new -key privada.key -subj "..." -out pedido.csr`
- [ ] ARCA → Certificados Digitales → subir CSR → descargar `.crt`
- [ ] ARCA → Administrador de Relaciones → asociar certificado a **wsfe**
- [ ] ARCA → Puntos de Venta → alta PV **Web Services** → anotar número
- [ ] App → Configuración AFIP → subir `.crt` + `.key` + N° PV + CUIT
- [ ] App → **Probar Conexión con AFIP** → OK

---

## 9. Errores comunes (mensajes reales del sistema)

| Mensaje | Causa | Solución |
|---------|-------|----------|
| `Falta configurar AFIP` | Falta CUIT, .crt o .key | Cargar los 3 en Configuración |
| `Es un CSR, no un Certificado` | Subiste el `pedido.csr` en vez del `.crt` | Subí el certificado que **descargaste de ARCA** |
| `Certificado y Clave no coinciden` | El .crt y el .key no son del mismo par | Usá la `privada.key` con la que generaste **ese** CSR |
| `Certificado expirado` | Pasaron ~2 años | Renovar (Sección 7) |
| `Rechazo AFIP: ...` | El punto de venta o el tipo de comprobante no está habilitado | Revisar Paso 4 y la asociación wsfe (Paso 3) |
| Error al consultar padrón / CUIT | El certificado no está asociado a wsfe | Rehacer Paso 3 |

---

## 10. Dónde vive esto en el código (referencia técnica)

- **Backend**: `functions/afipController.js`
  - `createInvoice` → emite el CAE (factura).
  - `getWsaaToken` → login WSAA con el certificado (firma el TRA con OpenSSL).
  - `getContribuyente` → consulta padrón A13.
  - `getServerStatus` → health check (botón "Probar Conexión").
  - `getAfipConfig` → lee cert/key/cuit desde Firestore
    (`datosNegocio/{userId}` o `sucursales/{id}`).
- **Frontend**: `frontend/src/components/ConfiguracionTab.jsx`
  (subida de `.crt`/`.key`, punto de venta, botón de prueba).
- Los certificados se guardan en **Firestore** (no en archivos del servidor),
  así que cada negocio/sucursal tiene los suyos.
