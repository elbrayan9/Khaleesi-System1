---
format: 1080x1920
duration: 20s
message: "Cargá un producto sacándole una foto — Khaleesi hace el trabajo aburrido"
arc: "Dolor → Giro → Demostración → Amplificación → Cierre"
audience: "Dueños de kioscos, almacenes y comercios chicos en Argentina"
mode: autonomous
music: none
---

## Video direction

- **Ritmo:** cortes secos, sin crossfades salvo el último. Cada frame entrega **una sola idea**. El video se ve **sin sonido**: el texto en pantalla cuenta todo.
- **Tipografía como protagonista:** display grande (mínimo ~110px en 1080 de ancho), pocas palabras por pantalla, siempre centrado en el tercio superior o medio — la zona segura de Reels (dejar ~220px libres abajo por la interfaz de Instagram y ~180px arriba).
- **Color:** fondo `canvas` (zinc oscuro) en todos los frames. El azul `accent` se reserva para **lo que Khaleesi hace**: los campos que se completan solos, el check, el botón final. El dolor se cuenta en gris.
- **Ritmo de reposo:** los frames 1 y 5 sostienen la lectura; el 3 es el más denso (es la demostración) y el 4 respira.
- **Zona segura:** nada de texto crítico en los últimos 220px de alto.

---

## Frame 1 — El garrón de cargar a mano

- status: animated
- src: compositions/frames/01-carga-manual.html
- duration: 3.5s
- transition_in: cut
- scene: "Contador de productos subiendo a mano, con el peso del trabajo repetitivo"
- voiceover: "Cargar los productos uno por uno. / 300 productos. / Una tarde entera."
- blueprint: kinetic-type-beats

Abre en el dolor concreto, sin nombrar el producto todavía. El espectador tiene que
reconocerse en los primeros 2 segundos o sigue scrolleando.

**Shot sequence**

- Scene 1 (0.0–1.2s): sobre canvas vacío entra **"Cargar los productos"** (display, centrado, tercio medio) con un `text-reveal` por palabra desde abajo, rápido. Nada más en pantalla.
- Scene 2 (1.2–2.3s): debajo aparece **"uno por uno."** en gris medio, y a su derecha un contador **`1 / 300`** en mono que empieza a subir con `count-up` — lento, cansino, como quien no termina más.
- Scene 3 (2.3–3.5s): el contador sigue subiendo (llega a ~47) y por detrás aparecen, muy tenues, filas de una tabla que se repiten hacia abajo — la sensación de lista interminable. El texto se sostiene quieto; solo el número se mueve.

---

## Frame 2 — El giro

- status: animated
- src: compositions/frames/02-el-giro.html
- duration: 3s
- transition_in: cut
- scene: "La pregunta que cambia todo: ¿y si le sacás una foto?"
- voiceover: "¿Y si le sacás una foto?"
- blueprint: kinetic-type-beats

El corte tiene que doler: de la lista infinita a una sola línea. Acá aparece el azul
por primera vez, en la palabra "foto".

**Shot sequence**

- Scene 1 (0.0–1.0s): corte seco a canvas limpio. Entra **"¿Y si le sacás una"** en display, centrado, con un `blur-in` corto. La última palabra todavía no está.
- Scene 2 (1.0–1.9s): **"foto?"** cae en su lugar en `accent` (azul), un punto más grande que el resto, con un pequeño `scale-pop`. Es el único elemento en color de la pantalla.
- Scene 3 (1.9–3.0s): quieto. Solo un `glow` muy sutil respira detrás de la palabra azul. Se sostiene la lectura.

---

## Frame 3 — La foto llena la ficha sola

- status: animated
- src: compositions/frames/03-ficha-automatica.html
- duration: 6.5s
- transition_in: cut
- scene: "Se saca la foto de un producto y los campos de la ficha se completan solos"
- voiceover: "Nombre. / Código de barras. / Categoría. / Y la foto. / Vos ponés el precio."
- blueprint: panel-edit-live-sync
- asset_candidates: assets/logo-0a274843.svg — el logo de Khaleesi System

El corazón del video. La **pareja en vivo**: el obturador dispara y, en la misma
pantalla, los campos de la ficha se van completando uno tras otro. Cada campo entra
cuando el texto lo nombra — nunca todos juntos.

**Shot sequence**

- Scene 1 (0.0–1.1s): marco de cámara (esquinas en `accent`, fondo canvas) ocupando el tercio superior, con la silueta de un producto de almacén dentro. Un `flash` blanco muy corto marca el disparo y el marco se contrae al tamaño de una miniatura arriba a la izquierda.
- Scene 2 (1.1–2.2s): debajo aparece una **ficha de producto vacía** (card según `frame.md`, borde tenue) con cuatro renglones rotulados en mono y gris: *Nombre · Código · Categoría · Foto*. Los valores están vacíos. Nada se completa todavía.
- Scene 3 (2.2–3.1s): el renglón **Nombre** se escribe solo (`typewriter`, ~14 caracteres) y al terminar el rótulo pasa a `accent`. Un check chico aparece a la derecha.
- Scene 4 (3.1–3.9s): el **Código de barras** aparece de golpe (`snap`, mono, dígitos con `tabular-nums`) + check.
- Scene 5 (3.9–4.7s): la **Categoría** entra como pill en `accent` suave + check.
- Scene 6 (4.7–5.4s): la miniatura de la foto **viaja** desde la esquina superior hasta el casillero *Foto* de la ficha y encastra ahí (`transform` con easing de llegada). Los cuatro renglones quedan completos y en azul.
- Scene 7 (5.4–6.5s): entra abajo, en gris, **"Vos ponés el precio."** — y nada más se mueve. Cierre de la demostración en quietud.

---

## Frame 4 — También la factura entera

- status: animated
- src: compositions/frames/04-factura.html
- duration: 3.5s
- transition_in: cut
- scene: "Una foto de la factura del proveedor carga todos los productos y suma el stock"
- voiceover: "¿Llegó mercadería? / Una foto de la factura. / Todo el pedido cargado."
- blueprint: grid-card-assemble

Amplifica la promesa: no es un producto, es una compra entera. Sube la apuesta justo
antes del cierre.

**Shot sequence**

- Scene 1 (0.0–1.0s): entra **"Una foto de la factura"** arriba (display, dos líneas) y debajo la silueta de un remito inclinado, en gris.
- Scene 2 (1.0–2.2s): del remito salen **seis tarjetitas de producto** que se acomodan en una grilla de 2×3 (`stagger` de ~90ms entre cada una), cada una con su nombre y una cantidad en mono.
- Scene 3 (2.2–3.5s): sobre la grilla aparece **"+ stock actualizado"** en `accent` con un check, y las cantidades hacen un `count-up` corto y se detienen. Hold.

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

Cierre limpio. La marca ocupa el centro, se condensa en el botón y el dedo lo aprieta:
el gesto que queremos que el espectador repita.

**Shot sequence**

- Scene 1 (0.0–1.2s): sobre canvas, el **logo** entra al centro con `scale-in` corto y debajo **"Khaleesi System"** en display. Se sostiene un instante.
- Scene 2 (1.2–2.2s) — *movimiento firma*: el bloque de marca **se condensa** en el mismo centro y se convierte en un **botón azul** que dice **"Probalo gratis 7 días"** — el logo se achica y desvanece exactamente mientras el botón escala en su lugar, con el mismo origen: se lee como una transformación, no como un reemplazo.
- Scene 3 (2.2–2.9s): un puntero entra desde abajo a la derecha, desacelerando, y se detiene apenas descentrado sobre el botón.
- Scene 4 (2.9–3.5s): **click**: puntero y botón se comprimen juntos y sueltan con un destello. Debajo queda fija la dirección **khaleesisystem.com.ar** en mono. Hold sobre el estado presionado.
