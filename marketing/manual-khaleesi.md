# Manual completo — Khaleesi System

Documento de referencia para responder consultas sobre el sistema.
Última actualización: 26 de agosto de 2026.

---

## 1. Qué es Khaleesi System

Khaleesi System es un sistema de gestión y punto de venta para comercios
argentinos: almacenes, kioscos, despensas, dietéticas, ferreterías, verdulerías
y negocios similares.

Funciona **desde el navegador**, sin instalar nada, en computadora, tablet o
celular. También se puede instalar como aplicación en el celular.

En una sola pantalla resuelve vender, controlar el stock, facturar en ARCA
(ex AFIP), cobrar por varios medios, atender pedidos online y ver cómo va el
negocio.

- **Web:** khaleesisystem.com.ar
- **WhatsApp:** +54 9 3517 69-4103
- **Email:** khaleesisystempos@gmail.com
- **Ubicación:** Córdoba, Argentina

---

## 2. Planes y precios

Precios en pesos argentinos, impuestos incluidos.

| Plan | Por mes | Por año |
|------|---------|---------|
| **Básico** | $20.000 | $200.000 |
| **Completo** (Premium) | $35.000 | $350.000 |

**El plan anual equivale a 10 meses**: pagando el año se ahorran 2 meses.

### Prueba gratis

**7 días gratis, sin tarjeta de crédito.** No se pide medio de pago para
empezar: se crea la cuenta y se usa el sistema completo durante la prueba.

### Qué incluye cada plan

**El plan Básico incluye:**

- Ventas y punto de venta completo
- Productos, stock, costos y precios
- Clientes y cuenta corriente (fiado)
- Vendedores y comisiones
- Proveedores y pedidos de reposición
- Presupuestos y notas de crédito/débito
- Caja, turnos y arqueos
- Estadísticas y reportes
- Tienda online con QR
- Cobros por Mercado Pago y QR interoperable
- Impresión de tickets y etiquetas QR
- Balanza integrada
- El celular como lector de códigos
- Modo oscuro y claro

**El plan Completo agrega cuatro cosas:**

1. **Facturación electrónica en ARCA** (facturas A, B y C homologadas)
2. **Multi-sucursal** (varios locales en una misma cuenta)
3. **Asistente de inteligencia artificial** (carga por foto, chat, sugerencias)
4. **Reporte diario por email** (resumen del día automático)

Todo lo demás está en los dos planes.

### Formas de pago de la suscripción

Se paga con **Mercado Pago**. Al vencer el período, el sistema avisa con un
cartel y desde ahí se renueva.

---

## 3. Cómo empezar

1. Entrar a **khaleesisystem.com.ar**
2. Crear la cuenta con email y contraseña
3. Elegir plan (se puede cambiar después)
4. Cargar los datos del negocio en **Configuración**: nombre, dirección,
   teléfono, CUIT y logo
5. Cargar los productos
6. Empezar a vender

No hace falta instalar nada ni tener un servidor. Los datos se guardan en la
nube y se sincronizan solos entre dispositivos.

---

## 4. Ventas

La pantalla **Nueva Venta** es el corazón del sistema.

### Formas de cargar un producto a la venta

- **Buscando por nombre** en el buscador
- **Escaneando el código de barras** con un lector USB
- **Con la cámara del celular**, usando el celular como lector inalámbrico
- **Por voz**: se dicta la venta y el sistema la arma
- **Producto genérico**: para algo que no está en el catálogo, se carga
  descripción y precio a mano

### Medios de pago

- Efectivo (con cálculo de vuelto y desglose de billetes)
- Tarjeta
- Transferencia
- QR de Mercado Pago
- Link de pago de Mercado Pago
- QR interoperable (lo leen todas las billeteras y bancos)
- Cuenta corriente / fiado (queda como deuda del cliente)
- Mercado Pago Point (posnet), si está configurado

Se puede **dividir el pago** entre varios medios en una misma venta.

### Al cerrar la venta

- Se descuenta el stock automáticamente
- Se imprime el ticket (térmico de 58mm o A4)
- Si corresponde, se emite la factura en ARCA
- Se puede enviar el comprobante por WhatsApp al cliente

### Vendedores

Si el negocio tiene empleados, se elige el vendedor antes de cerrar la venta.
El sistema registra quién vendió qué y calcula comisiones.

---

## 5. Productos y stock

### Cargar productos

Cuatro maneras:

1. **A mano**, completando el formulario
2. **Escaneando el código de barras**: el sistema busca el producto en bases de
   datos públicas y trae nombre, marca y foto automáticamente
3. **Con una foto del producto** (plan Completo): la inteligencia artificial
   identifica el producto y completa nombre, código de barras, categoría y foto
   de una sola vez. Solo hay que poner el precio.
4. **Importando un archivo** Excel o CSV

### Cargar mercadería con una foto de la factura (plan Completo)

Se le saca una foto a la factura o remito del proveedor y el sistema lee todos
los renglones, identifica los productos y suma el stock automáticamente. Sirve
para cargar un pedido entero en segundos en lugar de producto por producto.

### Control de stock

- Stock actual por producto y por sucursal
- **Alertas automáticas de stock bajo**
- Costos, precios de venta y margen de ganancia
- Actualización masiva de precios (por porcentaje o por categoría)
- Categorías
- Foto del producto
- Valor total del inventario en tiempo real

### Balanza

Para productos que se venden por peso:

- **Códigos de balanza configurables**: se lee la etiqueta que imprime la
  balanza y el sistema interpreta el peso y el precio
- **Balanza en vivo por USB**: se conecta la balanza a la computadora, se apoya
  el producto y el peso entra solo a la venta

---

## 6. Facturación electrónica en ARCA (plan Completo)

Emite **facturas A, B y C homologadas** por ARCA (ex AFIP) directamente desde
la pantalla de venta, sin entrar al sitio de ARCA.

### Qué hace falta para activarlo

1. Tener CUIT y estar inscripto en ARCA
2. Generar el **certificado digital** en el sitio de ARCA
3. Subir el certificado y la clave privada en **Configuración**
4. Elegir el punto de venta

El sistema guarda el certificado de forma segura y permite descargarlo o
eliminarlo cuando se quiera.

### Además

- Consulta automática de datos del cliente por CUIT
- Notas de crédito y débito electrónicas
- Verificación del estado del servicio de ARCA
- Condición fiscal del cliente: monotributo, responsable inscripto o exento

---

## 7. Cobros

### Mercado Pago

- **QR de Mercado Pago**: el cliente escanea y paga
- **Link de pago**: se le manda al cliente por WhatsApp
- **Mercado Pago Point**: cobro con posnet integrado
- Los pagos recibidos se ven en la sección **Pagos recibidos**, y la venta se
  concilia sola cuando entra el dinero

### QR interoperable

Genera un QR que **leen todas las billeteras y bancos** (MODO, Cuenta DNI,
Ualá, bancos, etc.), no solo Mercado Pago.

### Cuenta corriente (fiado)

- Se registra la deuda del cliente
- Se ve el saldo y el historial de movimientos
- Se registran pagos parciales
- Se pueden mandar **recordatorios de deuda por WhatsApp**

---

## 8. Tienda online

Cada negocio tiene su propia tienda online, sin costo extra y en los dos planes.

### Cómo funciona

1. Se activa la tienda desde **Configuración**
2. El sistema genera un **QR y un link** para compartir
3. Se pega el QR en el local, se manda por WhatsApp o se pone en redes
4. El cliente entra, arma el pedido y lo envía
5. **Suena una alarma en el sistema** y el pedido aparece en la caja
6. Se imprime el ticket del pedido

### Estados del pedido

`nuevo` → `confirmado` → `listo` → `en camino` (si es delivery) → `entregado`

El cliente puede seguir el estado de su pedido desde su celular con un link
propio, sin necesidad de registrarse.

### Retiro o delivery

El cliente elige si pasa a retirar o si quiere envío.

---

## 9. Reparto y seguimiento en el mapa

Para los negocios que hacen delivery.

### El repartidor

- Se lo da de alta desde el sistema
- Recibe un **link propio** por WhatsApp
- Lo abre en su celular, **sin usuario ni contraseña**
- Se pone "en línea", ve los pedidos disponibles y toma uno
- Marca "en camino" y después "entregado"

### El cliente

Ve al repartidor **moverse en un mapa en tiempo real**, como en las apps de
delivery conocidas.

### La venta

Cuando el repartidor marca "entregado", el pedido queda listo en el sistema con
un botón para registrar la venta. El comercio confirma que recibió el dinero y
recién ahí se registra y se descuenta el stock.

---

## 10. Etiquetas QR y verificador de precios

- Se **imprimen etiquetas con código QR** para los productos, de a una o en lote
- El cliente escanea el QR con su celular y ve el precio actualizado
- Hay una **pantalla verificador de precios** para poner en el local: se conecta
  un lector, el cliente pasa el producto y ve el precio en pantalla

Los precios se actualizan solos: si se cambia el precio en el sistema, el QR ya
muestra el nuevo. No hay que reimprimir etiquetas.

---

## 11. Clientes y vendedores

### Clientes

- Base de datos con nombre, teléfono, dirección, email
- **Búsqueda automática de datos por CUIT**
- Cuenta corriente y saldo
- Historial de compras
- Condición fiscal para la facturación

### Vendedores

- Alta de vendedores con permisos
- Registro de qué vendió cada uno
- **Cálculo de comisiones**
- Selección del vendedor en cada venta

---

## 12. Proveedores y pedidos de reposición

- Base de datos de proveedores
- Registro de pedidos de mercadería
- **Al recibir el pedido, el stock se actualiza automáticamente**
- Historial de compras por proveedor
- Carga del pedido con una foto de la factura (plan Completo)

---

## 13. Presupuestos y notas

### Presupuestos

- Se arman con productos del catálogo
- Se imprimen o se mandan en PDF
- Se convierten en venta con un clic

### Notas de crédito y débito

- Se emiten desde una venta ya hecha
- Con facturación electrónica si el plan lo incluye
- Ajustan el stock cuando corresponde

---

## 14. Caja y turnos

### Turnos

- Apertura de turno con el monto inicial
- Registro de todos los movimientos del turno
- **Cierre de caja con arqueo**: se cuentan los billetes por denominación y el
  sistema compara con lo que debería haber
- Historial de turnos anteriores

### Caja general

- Ingresos y egresos del día
- Totales por medio de pago
- Diferencias de caja

---

## 15. Estadísticas y reportes

- Ingresos brutos, costos y ganancia real
- Ventas por día, semana y mes
- **Gráfico de ventas** y **mapa de calor** por día y hora
- Productos más vendidos
- Ventas por vendedor
- Valor total del inventario
- Exportación a Excel

### Reporte diario por email (plan Completo)

Todos los días llega un resumen automático al correo con lo que pasó en el
negocio: ventas, cobros, productos con stock bajo.

---

## 16. Asistente de inteligencia artificial (plan Completo)

### Chat que ejecuta acciones

Se le pide por chat, en lenguaje normal, y lo hace (siempre pidiendo
confirmación antes):

> *"Subí 10 de stock a la Coca de 2 litros"*
> *"¿Cuánto vendí ayer?"*
> *"Mostrame los productos con stock bajo"*

### Otras funciones con IA

- **Identificar productos desde una foto** (nombre, código, categoría, foto)
- **Leer facturas de proveedores** desde una foto y cargar el stock
- **Sugerencias de reposición**: qué conviene comprar según lo que se vende
- **Venta por voz**: se dicta la venta y el sistema la arma
- **Resumen del día** en lenguaje natural

---

## 17. Impresión

### Tickets

- **Impresora térmica de 58mm**, por USB o Bluetooth
- Funciona **en computadora y en celular**
- Con el logo del negocio

### Facturas A4

- Se generan en PDF automáticamente al cobrar
- Con el logo y los datos del negocio

### Etiquetas

- Etiquetas con código QR, individuales o en lote

---

## 18. Multi-sucursal (plan Completo)

- Varios locales en una sola cuenta
- **Stock independiente por sucursal**
- Reportes unificados o separados por local
- Cada sucursal con su propia caja, turnos y vendedores
- Cambio de sucursal desde el mismo panel
- La tienda online funciona por sucursal

---

## 19. App instalable y funcionamiento sin internet

El sistema se puede **instalar como aplicación** en el celular o la computadora:
queda con su ícono propio y se abre a pantalla completa, como una app nativa.

Si se corta internet, **el sistema sigue funcionando** para lo básico: se puede
seguir vendiendo y consultando productos, y cuando vuelve la conexión todo se
sincroniza solo.

Hay operaciones que **sí necesitan internet** porque dependen de servicios
externos: facturar en ARCA, cobrar por Mercado Pago, las funciones de
inteligencia artificial y los pedidos online.

---

## 20. Seguridad y datos

- Los datos están en la nube (Google Firebase) con copias automáticas
- Cada negocio ve únicamente sus propios datos
- Contraseñas con requisitos de seguridad
- Protección contra accesos no autorizados
- **Backup manual descargable** desde Configuración
- Protección por PIN para secciones sensibles

---

## 21. Preguntas frecuentes

**¿Necesito instalar algo?**
No. Funciona desde el navegador. Opcionalmente se puede instalar como app en el
celular para tenerlo con su ícono.

**¿Sirve en el celular?**
Sí, funciona en computadora, tablet y celular. El celular además se puede usar
como lector de códigos de barras conectado a la computadora.

**¿Necesito lector de código de barras?**
No es obligatorio. Se puede usar la cámara del celular. Pero si el negocio tiene
mucho movimiento, un lector USB agiliza bastante.

**¿Puedo probarlo antes de pagar?**
Sí. 7 días gratis, sin tarjeta de crédito.

**¿Qué pasa con mis datos si dejo de pagar?**
Los datos quedan guardados. Se puede descargar un backup completo desde
Configuración en cualquier momento.

**¿Puedo cambiar de plan?**
Sí, en cualquier momento, desde Configuración.

**¿Funciona sin internet?**
Para vender y consultar productos, sí. Para facturar en ARCA, cobrar con
Mercado Pago y las funciones de inteligencia artificial, hace falta conexión.

**¿Emite facturas oficiales?**
Sí, facturas A, B y C homologadas por ARCA, con el plan Completo. Hace falta
subir el certificado digital que se genera en el sitio de ARCA.

**¿Sirve si no estoy inscripto en ARCA?**
Sí. Se puede usar todo el sistema emitiendo tickets comunes, sin facturación
electrónica. El plan Básico está pensado para eso.

**¿Puedo manejar más de un local?**
Sí, con el plan Completo. Stock separado por local y reportes unificados o por
sucursal.

**¿Cómo cobro con QR?**
Hay dos opciones: el QR de Mercado Pago, o el QR interoperable, que lo leen
todas las billeteras y bancos.

**¿Puedo vender por peso?**
Sí. Se pueden usar los códigos que imprime la balanza, o conectar la balanza por
USB para que el peso entre solo.

**¿Cuántos productos puedo cargar?**
No hay límite.

**¿Cuántos usuarios pueden usarlo?**
Se pueden dar de alta los vendedores que hagan falta, sin costo adicional.

**¿Tiene tienda online?**
Sí, en los dos planes y sin costo extra. Se genera un QR para pegar en el local
y los pedidos entran directo a la caja.

**¿Hace falta tarjeta para la prueba gratis?**
No.

**¿Cómo pago la suscripción?**
Por Mercado Pago, mensual o anual. El plan anual sale como 10 meses.

**¿Dan soporte?**
Sí, por WhatsApp al +54 9 3517 69-4103 o por email a
khaleesisystempos@gmail.com.

---

## 22. Glosario rápido

| Término | Qué es |
|---------|--------|
| **ARCA** | El organismo de impuestos de Argentina, antes llamado AFIP |
| **Punto de venta** | El número que ARCA asigna para emitir facturas |
| **Certificado digital** | El archivo que genera ARCA para poder facturar desde un sistema |
| **QR interoperable** | Un QR de pago que leen todas las billeteras y bancos |
| **Cuenta corriente** | El fiado: la deuda que un cliente tiene con el negocio |
| **Arqueo** | El conteo de la plata en caja al cerrar el turno |
| **Nota de crédito** | El comprobante que anula o descuenta una factura |
| **Multi-sucursal** | Manejar varios locales desde una sola cuenta |
