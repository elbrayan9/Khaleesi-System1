---
format: 1080x1920
duration: 31s
message: "Todo el almacén en un solo sistema: vender, cargar con IA, facturar, cobrar y medir"
arc: "Promesa → Vender → Cargar con IA → Facturar → Cobrar → Medir → Cierre"
audience: "Dueños de kioscos, almacenes y comercios chicos en Argentina"
mode: autonomous
music: none
---

## Video direction

- **Este video es el recorrido completo del producto.** A diferencia de los otros tres, acá el protagonista son las **capturas reales del sistema**: cada frame muestra una pantalla auténtica dentro de un marco de ventana, con el texto arriba.
- **Fidelidad de UI:** las capturas NO llevan filtros, grading ni overlays de color encima. Todo el trabajo es de encuadre, recorte, sombra y movimiento. Siempre recortar hacia la zona relevante: una captura de 1440px metida entera en 1080px de ancho deja el texto ilegible.
- **Ritmo:** cortes secos. Cada frame entrega una función. Hay locución, así que el texto en pantalla es corto: un rótulo y una línea.
- **Color:** fondo `canvas` (zinc oscuro). El azul `accent` marca lo que hace Khaleesi.
- **Sin tildes en mayúsculas** — la Inter incluida no trae glifos de mayúscula acentuada.
- **Zona segura:** nada crítico en los primeros 180px ni en los últimos 220px de alto.

---

## Frame 1 — La promesa

- status: animated
- src: compositions/frames/01-promesa.html
- duration: 4s
- transition_in: cut
- scene: "Tu almacén entero en un solo sistema"
- voiceover: "Tu almacén, entero, en un solo sistema."
- blueprint: kinetic-type-beats

**Shot sequence**

- Scene 1 (0.0–1.4s): sobre canvas entra **"Tu almacen"** (display, centrado) con `text-reveal` por palabra desde abajo.
- Scene 2 (1.4–2.6s): debajo cae **"entero, en un solo sistema."** en `accent`, con `scale-pop` corto.
- Scene 3 (2.6–4.0s): quieto, un `glow` sutil respira detrás del azul. Debajo, muy tenue, seis pastillas grises en fila con los rotulos **VENDER · CARGAR · FACTURAR · COBRAR · MEDIR · REPARTIR** que aparecen con `stagger` de ~80ms.

---

## Frame 2 — Vender

- status: animated
- src: compositions/frames/02-vender.html
- duration: 5s
- transition_in: cut
- scene: "La pantalla de venta real, con las tres formas de cargar"
- voiceover: "Vendé escaneando, dictando por voz, o sacándole una foto al producto."
- blueprint: panel-edit-live-sync
- asset_candidates: assets/premium-venta.png — captura real de la pantalla Nueva Venta con los botones Escanear con camara, Vender por voz y Agregar por foto (IA)

**Shot sequence**

- Scene 1 (0.0–1.0s): eyebrow **"VENDER"** en mono y `accent` con regla corta, y debajo **"Tres formas de cargar"** en display.
- Scene 2 (1.0–2.0s): la captura real sube al centro dentro de un marco de ventana (esquinas redondeadas, borde tenue, sombra suave). **Recortada** hacia la columna de botones, de modo que se lean *Escanear con cámara*, *Vender por voz* y *Agregar por foto (IA)*.
- Scene 3 (2.0–4.0s): los tres botones se resaltan **de a uno**, en orden y con ~0.65s cada uno: un anillo `accent` se dibuja alrededor del botón activo y se apaga al pasar al siguiente.
- Scene 4 (4.0–5.0s): quedan los tres marcados, con un push-in lento de 3%. Hold.

---

## Frame 3 — Cargar con IA

- status: animated
- src: compositions/frames/03-cargar-ia.html
- duration: 5s
- transition_in: cut
- scene: "La pantalla de productos real: una foto carga la ficha entera"
- voiceover: "La inteligencia artificial lo carga sola."
- blueprint: panel-edit-live-sync
- asset_candidates: assets/productos.png — captura real de Gestion de Productos con el boton Cargar con camara y el formulario Agregar Nuevo Producto

**Shot sequence**

- Scene 1 (0.0–1.0s): eyebrow **"CARGAR"** y debajo **"Una foto y listo"** en display.
- Scene 2 (1.0–2.1s): la captura real de Productos entra en el marco de ventana, recortada hacia el botón **Cargar con cámara** y el formulario.
- Scene 3 (2.1–3.6s): un anillo `accent` se dibuja alrededor de **Cargar con cámara**, y desde ahí salen tres etiquetas flotantes en `accent` que se posan sobre los campos del formulario: **"Nombre"**, **"Codigo"**, **"Categoria"**, con `stagger` de ~0.4s.
- Scene 4 (3.6–5.0s): entra abajo, en gris, **"Vos solo ponés el precio."** Push-in lento. Hold.

---

## Frame 4 — Facturar

- status: animated
- src: compositions/frames/04-facturar.html
- duration: 4.5s
- transition_in: cut
- scene: "Facturación electrónica ARCA configurada dentro del sistema"
- voiceover: "Facturá en ARCA desde la misma pantalla."
- blueprint: panel-edit-live-sync
- asset_candidates: assets/premium-config.png — captura real de la Configuracion AFIP (Facturacion Electronica) con punto de venta, condicion frente al IVA y el boton Probar Conexion con AFIP

**Shot sequence**

- Scene 1 (0.0–1.0s): eyebrow **"FACTURAR"** y debajo **"Directo a ARCA"** en display.
- Scene 2 (1.0–2.2s): la captura real entra en el marco, **recortada al bloque "Configuración AFIP (Facturación Electrónica)"**, de modo que se lean *Punto de Venta AFIP*, *Condición frente al IVA* y el botón *Probar Conexión con AFIP*.
- Scene 3 (2.2–3.3s): el botón **Probar Conexión con AFIP** se resalta con un anillo `accent` y se presiona solo (compresión + destello).
- Scene 4 (3.3–4.5s): sobre la captura aparece un pill `accent` lleno **"CONECTADO"** con un check que se dibuja. Hold.

---

## Frame 5 — Cobrar

- status: animated
- src: compositions/frames/05-cobrar.html
- duration: 4.5s
- transition_in: cut
- scene: "Las formas de cobro: QR, tarjeta, efectivo, transferencia"
- voiceover: "Cobrá por QR, con tarjeta o en efectivo."
- blueprint: grid-card-assemble

**Shot sequence**

- Scene 1 (0.0–1.0s): eyebrow **"COBRAR"** y debajo **"Como te pague el cliente"** en display.
- Scene 2 (1.0–2.4s): entran **cuatro tarjetas** en grilla 2×2 con `stagger` de ~120ms, cada una con una silueta simple dibujada en SVG y su rotulo en mono: **"QR"** (un cuadrado de QR), **"TARJETA"** (una tarjeta), **"EFECTIVO"** (billetes), **"TRANSFERENCIA"** (dos flechas). Todas en `accent` suave.
- Scene 3 (2.4–4.5s): en el centro de la grilla crece un **QR azul** (grilla de cuadraditos determinista que se completa con `stagger` corto) y sobre él aparece un pill `accent` **"COBRADO"** con check. Hold.

---

## Frame 6 — Medir

- status: animated
- src: compositions/frames/06-medir.html
- duration: 5s
- transition_in: cut
- scene: "Los números del negocio y el análisis con IA"
- voiceover: "Y mirá cómo te fue sin sacar una cuenta."
- blueprint: panel-edit-live-sync
- asset_candidates: assets/premium-ia.png — captura real de Estadisticas con el panel Analisis con IA arriba y las tarjetas de Business Intelligence

**Shot sequence**

- Scene 1 (0.0–1.0s): eyebrow **"MEDIR"** y debajo **"Los numeros solos"** en display.
- Scene 2 (1.0–2.2s): la captura real entra en el marco de ventana, **recortada de modo que se lean el panel "Análisis con IA" y las cuatro tarjetas de métricas**.
- Scene 3 (2.2–3.4s): se resalta con anillo `accent` el botón **"Analizar mis ventas"** del panel de IA.
- Scene 4 (3.4–5.0s): un subrayado `accent` se dibuja bajo la tarjeta **Ganancia Neta**. Push-in lento de 3%. Hold.

---

## Frame 7 — Cierre

- status: animated
- src: compositions/frames/07-cierre.html
- duration: 3.5s
- transition_in: crossfade
- scene: "Marca, propuesta y llamada a la acción con la web"
- voiceover: "Khaleesi System. Probalo gratis siete días."
- blueprint: cta-morph-press
- asset_candidates: assets/logo-0a274843.svg — el logo de Khaleesi System

Cierre idéntico al del resto de la serie: es la firma de la marca.

**Shot sequence**

- Scene 1 (0.0–1.2s): sobre canvas, el **logo** entra al centro con `scale-in` corto y debajo **"Khaleesi System"** en display.
- Scene 2 (1.2–2.2s) — *movimiento firma*: el bloque de marca **se condensa** y se convierte en un **botón azul** que dice **"Probalo gratis 7 dias"**, con el mismo origen: se lee como transformación, no como reemplazo.
- Scene 3 (2.2–2.9s): un puntero entra desde abajo a la derecha, desacelerando, y se detiene sobre el botón.
- Scene 4 (2.9–3.5s): **click**: puntero y botón se comprimen y sueltan con un destello. Debajo queda **khaleesisystem.com.ar** en mono. Hold.
