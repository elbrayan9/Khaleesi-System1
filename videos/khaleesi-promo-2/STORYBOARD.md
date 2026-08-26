---
format: 1080x1920
duration: 20s
message: "Tu negocio vende también cuando vos no estás atendiendo"
arc: "Dolor → Giro → Demostración → Amplificación → Cierre"
audience: "Dueños de kioscos, almacenes, rotiserías y comercios chicos en Argentina"
mode: autonomous
music: none
---

## Video direction

- **Ritmo:** cortes secos, sin crossfades salvo el último. Cada frame entrega **una sola idea**. El video se ve **sin sonido**: el texto en pantalla cuenta todo.
- **Tipografía como protagonista:** display grande (mínimo ~110px), pocas palabras por pantalla, centrado en el tercio superior o medio — zona segura de Reels (dejar ~220px libres abajo y ~180px arriba).
- **Color:** fondo `canvas` (zinc oscuro) en todos los frames. El azul `accent` se reserva para **lo que Khaleesi hace**: el pedido que entra, el estado, el botón final. El dolor se cuenta en gris.
- **Sin tildes en textos que van en mayúsculas** — la Inter incluida no trae glifos de mayúscula acentuada.
- **Zona segura:** nada de texto crítico en los últimos 220px de alto.

---

## Frame 1 — El desorden de los pedidos

- status: animated
- src: compositions/frames/01-whatsapp.html
- duration: 3.5s
- transition_in: cut
- scene: "Los pedidos llegan por WhatsApp mientras estás atendiendo el mostrador"
- voiceover: "Un pedido por WhatsApp. / Otro por teléfono. / Y vos atendiendo el mostrador."
- blueprint: kinetic-type-beats

Abre en el caos conocido: mensajes sueltos, anotados en un papel, sin control.

**Shot sequence**

- Scene 1 (0.0–1.2s): sobre canvas vacío entra **"Los pedidos"** (display, centrado, tercio medio) con `text-reveal` por palabra desde abajo. Debajo, en gris medio, **"anotados en un papel."**
- Scene 2 (1.2–2.4s): a los costados empiezan a caer **burbujas de mensaje** en gris (estilo chat, sin marca), con textos cortos: *"hola tenes empanadas?"*, *"mandame 2 docenas"*, *"a que hora cierran"*, *"cuanto sale?"* — apiladas con `stagger` de ~150ms, cada una con leve rotación distinta. Se acumulan, se superponen.
- Scene 3 (2.4–3.5s): las burbujas siguen apilándose hasta tapar media pantalla y se atenúan hacia abajo. El texto central se sostiene quieto. Sensación de saturación.

---

## Frame 2 — El giro

- status: animated
- src: compositions/frames/02-giro-tienda.html
- duration: 3s
- transition_in: cut
- scene: "Y si tuvieras tu propia tienda online"
- voiceover: "¿Y si tuvieras tu propia tienda?"
- blueprint: kinetic-type-beats

Corte seco del amontonamiento a una sola línea limpia. Acá aparece el azul.

**Shot sequence**

- Scene 1 (0.0–1.0s): corte seco a canvas limpio. Entra **"¿Y si tuvieras"** en display, centrado, con `blur-in` corto.
- Scene 2 (1.0–1.9s): **"tu propia tienda?"** cae en su lugar en `accent` (azul), con un `scale-pop` suave. Unico elemento en color.
- Scene 3 (1.9–3.0s): quieto. Un `glow` sutil respira detrás del azul.

---

## Frame 3 — El pedido entra solo al mostrador

- status: animated
- src: compositions/frames/03-pedido-entra.html
- duration: 6.5s
- transition_in: cut
- scene: "El cliente compra en la tienda y el pedido aparece con alarma en la caja, con ticket"
- voiceover: "El cliente compra. / Suena la alarma. / El pedido ya está en tu caja. / Con ticket."
- blueprint: panel-edit-live-sync
- asset_candidates: assets/logo-0a274843.svg — el logo de Khaleesi System

El corazón del video: la **pareja en vivo** entre el celular del cliente y la pantalla del mostrador. Lo que pasa de un lado aparece del otro.

**Shot sequence**

- Scene 1 (0.0–1.2s): pantalla partida en horizontal. Arriba, la silueta de un **celular** con un carrito: dos renglones de producto y un boton azul **"Confirmar pedido"**. Abajo, un **panel de caja** vacío con el rótulo **"PEDIDOS ONLINE"** en mono y gris, y la leyenda *"sin pedidos"*.
- Scene 2 (1.2–2.1s): el botón del celular se **presiona** (compresión + destello azul) y una **partícula azul** viaja desde el celular hacia el panel de abajo, con easing de llegada.
- Scene 3 (2.1–3.0s): el panel de caja **destella en azul** y aparece una **tarjeta de pedido** con: número **#0147**, nombre *"Martín G."*, **3 productos**, total **$14.800** y un pill azul **"NUEVO"** parpadeando dos veces. A la derecha un ícono de campana con dos ondas concéntricas expandiéndose (la alarma).
- Scene 4 (3.0–4.0s): debajo de la tarjeta se despliega el detalle en mono: *"2× Empanadas carne"*, *"1× Coca-Cola 1.5 L"*, *"Envío: Av. Mitre 1240"*.
- Scene 5 (4.0–5.2s): de la tarjeta **sale un ticket** hacia abajo (una tira blanca angosta con líneas de texto simuladas) con un movimiento de impresión: aparece renglón por renglón, con leve avance vertical. Encima, en `accent`, **"Ticket impreso"** con un check.
- Scene 6 (5.2–6.5s): la barra de estado del pedido pasa de **"NUEVO"** a **"EN PREPARACION"** (pill que cambia de color a azul lleno). Todo se detiene. Debajo, en gris, **"Vos solo lo preparas."**

---

## Frame 4 — El repartidor y el cliente mirando

- status: animated
- src: compositions/frames/04-delivery.html
- duration: 3.5s
- transition_in: cut
- scene: "El repartidor toma el pedido y el cliente sigue la entrega en el mapa"
- voiceover: "El repartidor lo toma. / El cliente lo ve llegar."
- blueprint: grid-card-assemble

Amplifica: no termina en la caja, termina en la puerta del cliente.

**Shot sequence**

- Scene 1 (0.0–1.0s): entra arriba **"Y el cliente lo ve llegar"** (display, dos líneas). Debajo aparece un **mapa esquemático**: fondo canvas apenas más claro, líneas de calles en gris muy tenue formando una grilla irregular.
- Scene 2 (1.0–2.3s): sobre el mapa aparece un **punto azul** con halo pulsante (el repartidor) y, más abajo a la derecha, un **pin gris** (la casa del cliente). Entre ambos se **dibuja una línea azul punteada** (stroke-dash animado) y el punto avanza sobre ella.
- Scene 3 (2.3–3.5s): arriba del mapa entra una barra de estado en `accent` con **"EN CAMINO · Lucas"** y un pequeño avatar circular. El punto sigue avanzando y se detiene. Hold.

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
