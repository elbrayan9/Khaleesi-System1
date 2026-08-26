---
format: 1080x1920
duration: 20s
message: "Todo el negocio en una sola pantalla: vender, facturar, cobrar y repartir"
arc: "Dolor → Giro → Demostración → Amplificación → Cierre"
audience: "Dueños de kioscos, almacenes y comercios chicos en Argentina"
mode: autonomous
music: none
---

## Video direction

- **Ritmo:** cortes secos, sin crossfades salvo el último. Cada frame entrega **una sola idea**. El video se ve **sin sonido**: el texto en pantalla cuenta todo.
- **Tipografía como protagonista:** display grande (mínimo ~110px), pocas palabras por pantalla, centrado en el tercio superior o medio — zona segura de Reels (dejar ~220px libres abajo y ~180px arriba).
- **Color:** fondo `canvas` (zinc oscuro) en todos los frames. El azul `accent` se reserva para **lo que Khaleesi hace**. El dolor se cuenta en gris.
- **Sin tildes en textos que van en mayúsculas** — la Inter incluida no trae glifos de mayúscula acentuada.
- **Zona segura:** nada de texto crítico en los últimos 220px de alto.

---

## Frame 1 — Cuatro cosas separadas

- status: animated
- src: compositions/frames/01-cuatro-apps.html
- duration: 3.5s
- transition_in: cut
- scene: "Un cuaderno para la caja, una app para facturar, otra para cobrar, el WhatsApp para los pedidos"
- voiceover: "El cuaderno de la caja. / La app de facturar. / La de cobrar. / El WhatsApp de los pedidos."
- blueprint: grid-card-assemble

Abre en la fragmentación: todo funciona, pero en cuatro lugares distintos que no se hablan entre sí.

**Shot sequence**

- Scene 1 (0.0–1.0s): sobre canvas entra arriba **"Cuatro lugares distintos"** (display, dos líneas) con `text-reveal` por palabra. Debajo, en gris medio, **"y ninguno se habla con el otro."**
- Scene 2 (1.0–2.4s): entran **cuatro tarjetas grises** en grilla 2×2, con `stagger` de ~140ms, cada una con un rótulo en mono y una silueta simple adentro: **"CAJA"** (un cuaderno con renglones), **"FACTURAS"** (una hoja con sello), **"COBROS"** (una tarjeta), **"PEDIDOS"** (una burbuja de chat). Todas en gris, sin color.
- Scene 3 (2.4–3.5s): entre las tarjetas aparecen **líneas punteadas cortadas** (segmentos que no llegan a unirse), y las tarjetas hacen un leve temblor desincronizado — cada una en su tiempo. Nada encaja. Hold.

---

## Frame 2 — El giro

- status: animated
- src: compositions/frames/02-giro-una.html
- duration: 3s
- transition_in: cut
- scene: "Todo eso en una sola pantalla"
- voiceover: "Todo eso, en una sola pantalla."
- blueprint: kinetic-type-beats

Corte seco de la grilla rota a una sola línea. Acá aparece el azul.

**Shot sequence**

- Scene 1 (0.0–1.0s): corte seco a canvas limpio. Entra **"Todo eso"** en display, centrado, con `blur-in` corto.
- Scene 2 (1.0–1.9s): debajo cae **"en una sola pantalla."** en `accent` (azul), un punto más grande, con `scale-pop`. Unico elemento en color.
- Scene 3 (1.9–3.0s): quieto. Un `glow` sutil respira detrás del azul.

---

## Frame 3 — Vender, facturar y cobrar de un tirón

- status: animated
- src: compositions/frames/03-flujo-completo.html
- duration: 6.5s
- transition_in: cut
- scene: "Una venta que pasa por el carrito, la factura de ARCA y el cobro por QR sin cambiar de pantalla"
- voiceover: "Cargás la venta. / Facturás en ARCA. / Cobrás por QR. / Todo sin salir de la pantalla."
- blueprint: panel-edit-live-sync
- asset_candidates: assets/logo-0a274843.svg — el logo de Khaleesi System

El corazón del video: **un solo recorrido continuo**. Los tres pasos ocurren en la misma superficie, encadenados — nunca se corta a otra pantalla.

**Shot sequence**

- Scene 1 (0.0–1.3s): un **panel de venta** ocupa el tercio medio: rótulo **"VENTA"** en mono y gris, y dos renglones que entran uno tras otro con `typewriter` corto: *"2× Yerba Playadito 1kg — $9.800"*, *"1× Azucar Ledesma — $1.900"*. Abajo del panel, el total **$11.700** aparece con `count-up` y se detiene.
- Scene 2 (1.3–2.6s): a la derecha del total entra un **botón azul "Facturar"** que se presiona solo (compresión + destello). El panel **se desliza hacia arriba** dejando lugar abajo.
- Scene 3 (2.6–3.9s): en el espacio liberado se **dibuja una factura**: encabezado **"FACTURA B"**, y renglones que aparecen de a uno en mono — *"CAE 75104..."*, *"Vto. CAE 30/08"*. Al completarse, un **check azul** y el texto en `accent` **"Autorizada por ARCA"**.
- Scene 4 (3.9–5.2s): la factura **se contrae a una miniatura** que se acomoda arriba a la izquierda, y en el centro **crece un QR azul** (grilla de cuadraditos que se completa con `stagger` corto) con el rótulo **"Escanea para pagar"** debajo en gris.
- Scene 5 (5.2–6.5s): sobre el QR aparece un **pill azul lleno "COBRADO"** con un check que se dibuja, y el QR se atenúa detrás. Debajo, en gris, **"Sin cambiar de pantalla."** Todo se detiene. Hold.

---

## Frame 4 — Los números al día

- status: animated
- src: compositions/frames/04-numeros.html
- duration: 3.5s
- transition_in: cut
- scene: "Cierre de caja y números del negocio actualizados solos"
- voiceover: "Y al cerrar, los números ya están."
- blueprint: grid-card-assemble

Amplifica: el beneficio no es cargar más rápido, es **saber cómo te fue** sin sentarte a sacar cuentas.

**Shot sequence**

- Scene 1 (0.0–1.0s): entra arriba el eyebrow **"CIERRE DE CAJA"** en mono y `accent`, con una regla corta, y debajo **"Los numeros ya estan"** (display, dos líneas).
- Scene 2 (1.0–2.3s): entran **tres tarjetas de métrica** apiladas verticalmente con `stagger` de ~120ms, cada una con rótulo en mono gris y valor en display: **"VENDIDO HOY · $184.500"**, **"GANANCIA · $61.200"**, **"TICKETS · 47"**. Los valores hacen `count-up` corto y se detienen con `tabular-nums`.
- Scene 3 (2.3–3.5s): debajo de las tarjetas se **dibuja una línea de tendencia** ascendente en `accent` (stroke-dash animado) sobre una grilla tenue, con el punto final resaltado. Hold.

---

## Frame 5 — Cierre

- status: animated
- src: compositions/frames/05-cierre.html
- duration: 3.5s
- transition_in: crossfade
- scene: "Marca, propuesta y llamada a la acción con la web"
- voiceover: "Khaleesi System. / Probalo gratis 7 días."
- blueprint: cta-morph-press
- asset_candidates: assets/logo-0a274843.svg — el logo de Khaleesi System

Cierre idéntico al del resto de la serie: es la firma de la marca.

**Shot sequence**

- Scene 1 (0.0–1.2s): sobre canvas, el **logo** entra al centro con `scale-in` corto y debajo **"Khaleesi System"** en display. Se sostiene un instante.
- Scene 2 (1.2–2.2s) — *movimiento firma*: el bloque de marca **se condensa** en el mismo centro y se convierte en un **botón azul** que dice **"Probalo gratis 7 dias"** — el logo se achica y desvanece exactamente mientras el botón escala en su lugar, con el mismo origen: se lee como una transformación, no como un reemplazo.
- Scene 3 (2.2–2.9s): un puntero entra desde abajo a la derecha, desacelerando, y se detiene apenas descentrado sobre el botón.
- Scene 4 (2.9–3.5s): **click**: puntero y botón se comprimen juntos y sueltan con un destello. Debajo queda fija la dirección **khaleesisystem.com.ar** en mono. Hold sobre el estado presionado.
