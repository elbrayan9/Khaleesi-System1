# Guía de problemas — Khaleesi System

Qué hacer cuando algo no funciona. Complementa el manual (`manual-khaleesi.md`).
Última actualización: 26 de agosto de 2026.

Cada caso está escrito como lo diría el cliente, con la causa y la solución.

---

## Lo primero, siempre

Antes de investigar nada, tres cosas resuelven la mayoría de los problemas:

1. **Recargar la página con Ctrl + F5** (en el celular, cerrar y abrir la app).
   Fuerza a bajar la versión más nueva y descarta que sea una pantalla vieja
   cargada en memoria.
2. **Revisar la conexión a internet.** Si el sistema muestra el cartel "Sin
   conexión", muchas funciones quedan limitadas a propósito.
3. **Probar en otro navegador**, preferentemente **Chrome o Edge de
   escritorio**. Varias funciones (impresora USB, Bluetooth, balanza) solo
   existen en esos navegadores.

---

## 1. Acceso y cuenta

### "No puedo entrar, me dice email o contraseña incorrectos"

- Revisar que no esté activado el bloqueo de mayúsculas
- Verificar que el email esté bien escrito, sin espacios al final
- Si no la recuerda: **"¿Olvidaste tu contraseña?"** en la pantalla de ingreso.
  Llega un correo con el link para cambiarla.
- **El correo puede caer en spam o en "Promociones"**. Revisar ahí antes de
  volver a pedirlo.

### "Pedí el mail para recuperar la contraseña y no me llegó"

1. Revisar spam y la pestaña "Promociones" de Gmail
2. Verificar que el email escrito sea exactamente con el que se registró
3. Esperar unos minutos: a veces demora
4. Si no llega, escribir al soporte para verificar con qué correo está la cuenta

### "Me aparece un cartel de que se venció la suscripción"

El período pagado terminó. Desde ese mismo cartel se renueva por Mercado Pago.
Los datos **no se borran**: quedan guardados y vuelven a estar disponibles al
renovar.

### "Pagué pero me sigue apareciendo como vencido"

La acreditación de Mercado Pago puede demorar unos minutos.

1. Recargar con Ctrl + F5
2. Cerrar sesión y volver a entrar
3. Si pasada media hora sigue igual, escribir al soporte con el **número de
   operación de Mercado Pago**

### "Quiero cambiar de plan"

En **Configuración**. El cambio es inmediato.

---

## 2. Impresora térmica

Es la fuente más común de consultas. Casi siempre es una de tres cosas:
navegador equivocado, impresora no vinculada, o cable/energía.

### "No imprime nada"

Verificar en orden:

1. **Que esté encendida y con papel.** Suena obvio y es la causa más frecuente.
2. **Que el navegador sea Chrome o Edge.** Si el sistema dice *"Este navegador
   no soporta WebUSB. Usá Chrome o Edge de escritorio"*, el problema es ese:
   Firefox y Safari no pueden hablar con impresoras USB.
3. **Que la impresora esté vinculada.** Si dice *"No hay una impresora térmica
   vinculada o está desconectada"*, hay que ir a **Configuración → Impresora
   térmica** y volver a vincularla.
4. **Probar otro cable USB u otro puerto.** Los cables de impresora térmica
   fallan seguido.

### "Me dice que no soporta Bluetooth"

El mensaje *"Tu navegador no soporta Bluetooth. Usá Chrome o Edge (Android o
PC)"* significa que:

- En **iPhone/iPad no funciona la impresión por Bluetooth**, es una limitación
  de Apple. En iPhone hay que usar la impresión normal o compartir el PDF.
- En Android, usar Chrome.
- En computadora, Chrome o Edge, con el Bluetooth encendido.

### "Dice que no encontró una impresora compatible"

Al vincular, el navegador muestra una lista de dispositivos. Si la impresora no
aparece:

1. Apagar y encender la impresora
2. Desconectar y reconectar el cable
3. Si es Bluetooth: verificar que esté en modo de emparejamiento y ya vinculada
   en el sistema operativo
4. Probar en otro puerto USB (preferentemente uno directo, no un hub)

### "Imprime símbolos raros o cortado"

Suele ser configuración de ancho de papel. En **Configuración → Impresora
térmica** verificar que el ancho coincida con el papel (58mm es lo habitual).

### "El ticket sale sin el logo"

El logo se carga en **Configuración → Datos del negocio**. Conviene una imagen
simple, con buen contraste: en impresión térmica, que es en blanco y negro, los
logos con colores claros o degradados salen borrosos.

---

## 3. Lector de códigos de barras

### "Escaneo y no pasa nada"

1. Hacer clic **dentro del buscador de productos** antes de escanear. El lector
   funciona como un teclado: escribe donde esté el cursor.
2. Probar escanear con el Bloc de notas abierto. Si ahí tampoco escribe, el
   problema es del lector o del cable, no del sistema.

### "Escaneo y me dice: Código nuevo, completá el producto"

El código no está en el catálogo. Es normal la primera vez.

- Se abre el formulario para cargarlo
- Si es un producto conocido, el sistema busca solo el nombre, la marca y la
  foto
- Con el plan Completo, se le puede sacar una foto al producto y la inteligencia
  artificial completa todo

### "Quiero usar el celular como lector"

Se entra a la sección **Pistola (celu)** desde el celular, con la misma cuenta
abierta en la computadora. Lo que se escanea en el celular cae en la venta de la
computadora. Ambos dispositivos necesitan internet.

### "La cámara del celular no abre"

El navegador tiene que tener **permiso de cámara**. Si se rechazó una vez, hay
que habilitarlo a mano: tocar el candado en la barra de direcciones → Permisos →
Cámara → Permitir. Después recargar.

---

## 4. Facturación en ARCA

### "No me deja facturar, dice que falta configurar AFIP"

Falta cargar el certificado. En **Configuración**:

1. Subir el **certificado** (.crt o .pem)
2. Subir la **clave privada** (.key)
3. Cargar el **CUIT** y el **punto de venta**
4. Guardar

Ambos archivos se generan en el sitio de ARCA. Recordá que esto es del **plan
Completo**.

### "Dice: Certificado expirado"

Los certificados de ARCA tienen vencimiento (habitualmente 2 años). Hay que
generar uno nuevo en el sitio de ARCA y volver a subirlo. La clave privada
puede seguir siendo la misma.

### "Dice: Certificado y Clave no coinciden"

Se subió un certificado de un pedido y la clave de otro. Al generar un
certificado en ARCA se crea un par: los dos archivos tienen que ser del mismo
trámite. Volver a generarlos juntos y subir los dos.

### "Dice: Es un CSR, no un Certificado"

Se subió el archivo equivocado. El **CSR** es la solicitud que se le manda a
ARCA; el **certificado** es lo que ARCA devuelve después. Hay que subir el que
descargaste desde el sitio de ARCA, no el que generaste vos.

### "Dice: Formato PEM inválido"

El archivo está dañado o no es un certificado. Descargarlo de nuevo desde ARCA
sin abrirlo ni editarlo con ningún programa: abrirlo en Word o en un editor lo
corrompe.

### "Dice: El CUIT ingresado no existe"

Al buscar los datos de un cliente por CUIT y no encontrarlo:

- Verificar que el número esté completo (11 dígitos, sin guiones ni puntos)
- Puede ser un CUIT dado de baja
- Si es correcto, cargar los datos del cliente a mano

### "Facturaba bien y de golpe da error de AFIP"

**El servicio de ARCA se cae seguido**, sobre todo a fin de mes. El sistema
tiene una verificación del estado del servicio.

- Esperar unos minutos y reintentar
- La venta queda registrada igual: se puede facturar después
- Si persiste horas, verificar el estado del servicio en el sitio de ARCA

### "¿Puedo usar el sistema sin facturar en ARCA?"

Sí. Todo el sistema funciona emitiendo tickets comunes. La facturación
electrónica es opcional y del plan Completo.

---

## 5. Tienda online

### "Mi tienda dice 'Esta tienda no está disponible'"

Tres causas posibles, en orden de frecuencia:

1. **La tienda está desactivada.** Ir a **Configuración**, activar la tienda y
   **guardar los cambios**. Si no se guarda, no se aplica.
2. **La suscripción está vencida.** La tienda se apaga junto con la cuenta.
3. **El link es de una sucursal que ya no existe.** Volver a generar el QR o el
   link desde Configuración.

Si el cartel dice específicamente *"La tienda está pausada por el comercio"*, es
el caso 1.

### "Los pedidos no me llegan"

1. Verificar que la pestaña del sistema esté **abierta** en la computadora de la
   caja
2. Revisar la sección **Pedidos online**: pueden estar entrando sin que suene la
   alarma
3. **El sonido**: si el navegador tiene el sonido bloqueado, la alarma no suena.
   Hacer clic en cualquier parte de la página una vez después de abrirla — los
   navegadores exigen una interacción antes de permitir audio.
4. Verificar el volumen de la computadora

### "El cliente no puede hacer el pedido"

- Verificar que haya **productos con stock** cargados
- Los productos tienen que estar visibles en la tienda
- Probar el link uno mismo desde el celular, con los datos móviles en vez del
  wifi del local

### "¿Cómo comparto mi tienda?"

Desde **Configuración** se obtienen el QR y el link. El QR se puede imprimir y
pegar en el local, en el mostrador o en la vidriera. El link se manda por
WhatsApp o se pone en la biografía de Instagram.

---

## 6. Cobros

### "Generé el QR de Mercado Pago y el cliente pagó, pero no figura"

1. Revisar **Pagos recibidos**: ahí aparecen los cobros a medida que Mercado
   Pago los informa
2. La acreditación puede demorar unos minutos
3. Verificar que la cuenta de Mercado Pago esté bien vinculada en Configuración

### "No puedo generar el QR de Mercado Pago"

Falta vincular la cuenta de Mercado Pago en **Configuración**. Hace falta la
credencial que se obtiene desde el panel de desarrolladores de Mercado Pago.

### "El QR interoperable no lo lee la billetera del cliente"

- Verificar que el cliente esté escaneando desde **dentro de su billetera** y no
  con la cámara del celular
- El QR interoperable funciona con billeteras y bancos que adhieren al estándar

### "Un cliente me quedó debiendo, ¿cómo lo registro?"

Al cobrar, elegir **Cuenta corriente** como medio de pago. La venta queda
registrada como deuda del cliente. Después se registran los pagos parciales
desde la ficha del cliente, y se le puede mandar un **recordatorio por
WhatsApp**.

---

## 7. Balanza

### "Paso el producto por la balanza y no toma el peso"

Para la **balanza en vivo por USB**:

1. Usar **Chrome o Edge de escritorio** (no funciona en Firefox, Safari ni
   celular)
2. Vincular la balanza en **Configuración**
3. Verificar el cable

Para los **códigos de balanza** (la etiqueta que imprime la balanza):

- Hay que configurar el formato del código en **Configuración**, porque cada
  marca de balanza usa uno distinto
- Si el formato no coincide, el sistema no interpreta bien el peso ni el precio

### "El precio que calcula está mal"

Revisar la configuración del código de balanza: dónde está el peso, dónde el
precio y cuántos decimales usa. Si el formato está mal definido, los números
salen corridos.

---

## 8. Productos y stock

### "El stock no coincide con lo que tengo"

Causas habituales:

- Ventas cargadas sin descontar (productos genéricos no descuentan stock)
- Mercadería recibida sin registrar el pedido
- Roturas o consumo interno no registrados

Se corrige editando el producto y ajustando el stock a mano.

### "Cargué mal un producto y quiero borrarlo"

Desde **Productos**, buscarlo y eliminarlo. Si ya tiene ventas asociadas,
conviene **dejarlo sin stock** en lugar de borrarlo, para no perder el historial.

### "Tengo productos duplicados"

En **Configuración** hay una herramienta para **eliminar duplicados**.

### "Quiero subir todos los precios un porcentaje"

En **Productos** está la **actualización masiva de precios**: se aplica por
porcentaje, a todo el catálogo o a una categoría.

### "Importé un Excel y no cargó nada"

- El archivo tiene que tener las columnas que espera el sistema. Conviene
  descargar la plantilla desde la sección de importación.
- Verificar que no haya filas vacías al principio
- Los precios tienen que ser números, sin el signo `$` ni puntos de miles

---

## 9. Asistente de inteligencia artificial

### "Le saco la foto al producto y no lo identifica"

- Que la foto sea **nítida y con buena luz**
- Que se vea el **frente del envase** con la marca legible
- Que sea un solo producto, no la góndola entera
- Productos muy regionales o sin marca pueden no identificarse: en ese caso se
  carga a mano

### "Me dice que no se pudo leer la factura"

- La foto tiene que estar derecha y completa: que entren todos los renglones
- Sin sombras ni reflejos del flash
- Facturas manuscritas suelen fallar; funciona mejor con impresas
- Si es muy larga, sacar varias fotos por partes

### "El asistente no me responde"

- Es una función del **plan Completo**
- Hay un **límite diario de consultas** para evitar abusos. Si se llegó al tope,
  se restablece al día siguiente.
- Si dice que falta configuración, es un problema del lado del sistema:
  escribir al soporte

---

## 10. Sincronización y conexión

### "Cargué una venta en la computadora y no la veo en el celular"

Los datos se sincronizan solos, pero hace falta internet en los dos
dispositivos. Recargar con Ctrl + F5 en el que no muestra los datos.

### "Me aparece el cartel 'Sin conexión'"

El sistema detectó que se cortó internet. Se puede **seguir vendiendo**: las
operaciones quedan guardadas y se sincronizan cuando vuelve la conexión.

**No van a funcionar mientras tanto**: facturar en ARCA, cobrar por Mercado
Pago, el asistente de inteligencia artificial y los pedidos online. Todos
dependen de servicios externos.

### "Estuve mucho tiempo sin internet y ahora me pide conectarme"

Por seguridad, el sistema no puede funcionar sin conectarse por tiempo
indefinido. Al recuperar internet se destraba solo y sincroniza lo pendiente.

---

## 11. Multi-sucursal

### "No veo la opción de sucursales"

Es una función del **plan Completo**.

### "Cambié de sucursal y no veo mis productos"

**Cada sucursal tiene su propio stock.** Si un producto se cargó en una
sucursal, hay que cargarlo también en la otra o transferir el stock.

### "El carrito se me mezcló entre sucursales"

No debería: el sistema guarda un carrito separado por sucursal. Si pasa,
recargar con Ctrl + F5.

---

## 12. Reparto

### "El repartidor no puede abrir su link"

- Verificar que sea el link completo, sin cortar
- Cada repartidor tiene el suyo: no sirve el de otro
- Si se dio de baja al repartidor, el link deja de funcionar

### "No veo al repartidor en el mapa"

- El repartidor tiene que estar **"en línea"** en su celular
- Tiene que haber **aceptado el permiso de ubicación** del navegador
- Tiene que tener el pedido **tomado** y en camino
- Con la pantalla apagada, algunos celulares dejan de mandar la ubicación:
  conviene que la deje encendida

### "El repartidor marcó entregado pero no se registró la venta"

Es a propósito. Cuando el repartidor entrega, el pedido queda en el sistema con
un botón **Registrar venta**. El comercio confirma que recibió el dinero y recién
ahí se registra y se descuenta el stock. Es para que el repartidor rinda la plata.

---

## 13. Impresión de etiquetas y verificador de precios

### "Escaneo el QR de la etiqueta y dice que el producto no existe"

La etiqueta es de un producto que fue eliminado del catálogo. Hay que reimprimir
la etiqueta con el producto actual.

### "El verificador de precios no encuentra el producto"

- Verificar que el producto esté cargado **en esa sucursal**
- Probar buscarlo por nombre en el sistema para confirmar que existe

---

## 14. Cuando nada de esto alcanza

Pedirle al cliente estos datos antes de escalar al soporte:

1. **Qué estaba haciendo** exactamente cuando falló
2. **El mensaje de error completo**, si aparece alguno (una captura sirve)
3. **Desde qué dispositivo y navegador** (computadora o celular, Chrome, Edge,
   Safari)
4. **Si le pasa siempre o fue una vez**
5. **Si probó recargar con Ctrl + F5**

Con eso, el soporte resuelve mucho más rápido.

**Contacto:**
WhatsApp +54 9 3517 69-4103 · khaleesisystempos@gmail.com
