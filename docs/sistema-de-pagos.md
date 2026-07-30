# Sistema de Pagos — Khaleesi System

Guía de todo lo relacionado a cobros y comprobantes: vuelto, propina,
comprobantes por WhatsApp/Email, cuenta corriente (fiado) y Mercado Pago.

---

## 1. Cobro y vuelto en efectivo

En el modal de pago (**Cobrar** en Nueva Venta):

- **"¿Con cuánto paga?"**: ponés el billete con el que paga el cliente y el
  sistema calcula el **vuelto**. Botones rápidos: **Justo**, $1.000, $2.000,
  $5.000, $10.000, $20.000.
- El **vuelto queda guardado** en la venta y sale impreso en el ticket térmico.
- **Pagos divididos**: podés agregar varios pagos (efectivo + tarjeta, etc.).

Código: `components/PaymentModal.jsx`, `components/PaymentMethodSelect.jsx`.

## 2. Propina y redondeo

En el modal de pago:

- Campo **Propina** + botones **10%** y **Redondear** (redondea el total al
  próximo múltiplo de $100).
- La propina **se suma a lo que paga el cliente** (y al vuelto), pero **NO entra
  en el total facturado a AFIP** (va aparte, en `venta.propina`, y se muestra en
  el ticket como "Propina" + "Total cobrado").

## 3. Tipo de comprobante según el emisor

El tipo de comprobante que ofrece el modal depende de la **Condición frente al
IVA** del negocio (`Configuración → AFIP`):

- **Monotributo / Exento** → solo **Factura C** y **Ticket X** (arranca en C).
- **Responsable Inscripto** → **Factura A** (si el cliente tiene CUIT) o **B**.

> ⚠️ Es clave tener bien cargada la **Condición frente al IVA** en Configuración,
> si no ARCA puede rechazar por "no autorizado a emitir clase A".

Código: `components/ReceiptTypeSelect.jsx`, `components/PaymentModal.jsx`.

## 4. Comprobante por WhatsApp y Email (PDF)

Desde el **detalle de una venta** y desde **Caja y Reportes** (botones por fila):

- **WhatsApp** (verde): manda el comprobante. Intenta, en cascada:
  1. **Compartir nativo** el PDF (adjunto real, en celular / PC compatible).
  2. Subir el PDF a **Firebase Storage** y mandar el **link** por WhatsApp.
  3. Descargar el PDF + abrir WhatsApp con el texto (respaldo).
- **Email** (índigo): sube el PDF y abre el correo (mailto) con el **link** al
  PDF ya escrito.

Requiere un **teléfono/email** cargado en la ficha del cliente para precargar el
destinatario (campos nuevos en `ClientForm`).

Las **Notas de Crédito/Débito** también tienen botón de WhatsApp (texto).

Código: `services/pdfService.js` (`enviarComprobantePdfWhatsapp`,
`enviarComprobantePorEmail`), `utils/helpers.js`, `components/SaleDetailModal.jsx`.

### Firebase Storage (para los PDF)

Los PDF se suben a `comprobantes/{userId}/...`. Requiere:
- Storage habilitado en el proyecto (ya hecho, bucket
  `khaleesy-system.firebasestorage.app`).
- Reglas en `storage.rules` (solo el dueño sube, solo PDF, < 5 MB, lectura por
  link). Se despliegan con `firebase deploy --only storage`.

## 5. Cuenta corriente (fiado)

- Método de pago **"Cuenta Corriente (Fiado)"** en el modal (requiere cliente).
- Al vender fiado se crea un **cargo** (deuda) en la colección `movimientos_cc`.
- **Saldo por cliente** = cargos − pagos (se calcula de los movimientos).
- En **Clientes**: columna de **saldo** (Debe / A favor) y botón 📒 que abre el
  modal de cuenta corriente con **historial** y **registro de pagos a cuenta**.

Código: `context/AppContext.jsx` (`getSaldoCliente`,
`handleRegistrarPagoCuenta`), `components/CuentaCorrienteModal.jsx`,
`components/ClientTable.jsx`.

## 6. Mercado Pago (QR / link + confirmación automática)

### 6.a. Conectar la cuenta

`Configuración → General → Datos del Negocio → Mercado Pago — Access Token`.
El token se obtiene en **mercadopago.com.ar/developers → tu app → Credenciales**:
- **Prueba** (sandbox): `TEST-...`
- **Producción** (cobros reales): `APP_USR-...`

Se guarda en `sucursales/{id}.configuracion.mpAccessToken`.

### 6.b. Cómo cobrar

En el modal de pago → **"Cobrar con Mercado Pago (QR / Link)"**:
- Muestra un **QR** para escanear en el local + botones **Abrir link**,
  **WhatsApp** y **Copiar** (cobro a distancia).
- El cliente paga con cualquier billetera/tarjeta.

### 6.c. Confirmación automática (webhook)

1. Al generar el cobro, se crea un doc **`cobros_mp/{ref}`** con estado
   `pendiente` y el frontend lo escucha en tiempo real.
2. Cuando el cliente paga, **Mercado Pago llama al webhook** `mpWebhook`.
3. El webhook consulta el pago con el token del comercio, y marca el cobro como
   **`pagado`**.
4. El modal detecta el cambio y **agrega el pago solo** → listo para
   **Confirmar Venta**.

Código backend: `functions/index.js` (`crearPagoMP`, `mpWebhook`).
Frontend: `components/CobroMercadoPagoModal.jsx`.

- Webhook URL: `https://us-central1-khaleesy-system.cloudfunctions.net/mpWebhook`
- El `notification_url` de cada preferencia incluye `?uid=...&suc=...` para que
  el webhook sepa de qué comercio/sucursal leer el token.

### 6.d. Probar en modo sandbox

1. Cargar el Access Token **`TEST-...`** en Configuración.
2. En Developers → **Cuentas de prueba** → crear un **Comprador** (guardar
   usuario, contraseña y código de verificación).
3. Generar el QR en la app → abrir el link en **incógnito** → **iniciar sesión
   con el comprador de prueba** → pagar con "Dinero disponible" (o tarjeta de
   prueba, titular **APRO** para aprobar).
4. El modal debe pasar solo a **"¡Pago recibido!"**.

> No se puede pagar un cobro de prueba con una cuenta real (MP tira "una de las
> partes es de prueba"). Hay que usar el **comprador de prueba**.

### 6.e. Pasar a producción

Reemplazar el token `TEST-...` por el **`APP_USR-...`** de producción en
Configuración. Nada más cambia.

## 7. Cobro de suscripciones (a la plataforma) + reactivación automática

Cuando a un cliente se le **vence la suscripción**, puede **pagarte a vos**
(Brian) desde el banner "Renovar Suscripción con Mercado Pago", y el plan se
**reactiva solo** (+30 días) al acreditarse el pago.

- La plata va a **tu cuenta de MP** (la de la plataforma), NO a la del comercio.
- El token de la plataforma es un **secret** de Firebase: `MP_PLATFORM_TOKEN`
  (más seguro que Firestore, que los clientes podrían leer).
- Precios (backend, `PLANES_PRECIO`): Básico $15.000 / Completo $25.000.
- Dos opciones de pago:
  - **Débito / dinero en cuenta**: precio base, 1 cuota (comisión más baja).
  - **Crédito (con recargo)**: precio + `RECARGO_CREDITO` (10% por defecto),
    permite cuotas. El recargo cubre la comisión mayor de la tarjeta.

**Flujo:**
1. `crearPagoSuscripcion` (onCall) crea la preferencia con tu token de
   plataforma. `external_reference = sub_{uid}_{plan}_{ts}`.
2. El cliente paga → `mpWebhookSuscripcion` recibe el aviso, consulta el pago y,
   si está `approved`, pone `subscriptionStatus: 'active'`,
   `subscriptionEndDate = hoy + 30` y el `plan` en `datosNegocio/{uid}`.
3. La app escucha `datosNegocio` en tiempo real → el banner desaparece solo.

**Configurar tu token de plataforma (una vez):**
```
firebase functions:secrets:set MP_PLATFORM_TOKEN
# pegás tu Access Token: TEST-... para probar, APP_USR-... para producción
firebase deploy --only functions:crearPagoSuscripcion,functions:mpWebhookSuscripcion
```

Código: `functions/index.js` (`crearPagoSuscripcion`, `mpWebhookSuscripcion`),
`components/SubscriptionStatusBanner.jsx`.

## 8. Facturación electrónica (ARCA)

Ver **`docs/facturacion-arca.md`** (certificados, CSR, puntos de venta, errores
comunes). El PDF de la factura muestra la **fecha real de emisión** (la que
registró ARCA) y el **QR** oficial.

---

## Despliegue

- **Frontend**: push a `main` en GitHub → **Netlify** publica solo
  (`khaleesisystem.com.ar`).
- **Backend (functions)**: `firebase deploy --only functions:<nombre>`
  (ej: `crearPagoMP`, `mpWebhook`, `createInvoice`, `askGemini`).
- **Reglas de Storage**: `firebase deploy --only storage`.
- ⚠️ No correr `firebase deploy` "a secas": usar siempre `--only ...`.
