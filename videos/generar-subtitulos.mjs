// Genera la capa de subtítulos de un video y la inserta en su index.html.
//
// No se transcribe el audio: los textos de la locución los escribimos nosotros,
// así que son exactos. Lo único que hay que repartir es el tiempo, y eso se hace
// proporcional a la longitud de cada frase dentro del tramo de su frame.
//
// Los tramos de abajo están escritos contra la línea de tiempo del VIDEO, que es
// más larga que la locución (la voz clonada habla más rápido de lo que se
// dimensionaron los frames). Si se usan tal cual, el subtítulo se va atrasando y
// para el cierre llega a desfasarse varios segundos. Por eso se miden los
// segundos reales del vo.wav con ffprobe y se escala todo a esa duración.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

// Segundos reales de un archivo de audio. Se mide en vez de confiar en un número
// escrito a mano: la voz se regeneró varias veces y cada versión duraba distinto.
function duracionDeAudio(archivo) {
  const salida = execFileSync(
    'ffprobe',
    ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', archivo],
    { encoding: 'utf8' },
  );
  const segundos = Number(salida.trim());
  if (!Number.isFinite(segundos) || segundos <= 0) {
    throw new Error(`ffprobe no devolvió una duración usable para ${archivo}: "${salida}"`);
  }
  return segundos;
}

// Cada entrada: el tramo del video que ocupa esa parte de la locución, y las
// frases que se dicen ahí. Las frases se cortan cortas a propósito: en un reel
// no se lee más de una línea y media de un vistazo.
const GUIONES = {
  'khaleesi-promo': {
    audio: 18.2,
    tramos: [
      { desde: 0.2, hasta: 3.5, frases: ['Cargar los productos uno por uno.', 'Una tarde entera.'] },
      { desde: 3.6, hasta: 6.4, frases: ['¿Y si le sacás una foto?'] },
      { desde: 6.6, hasta: 12.8, frases: ['Nombre.', 'Código de barras.', 'Categoría. Y la foto.', 'Vos solo ponés el precio.'] },
      { desde: 13.0, hasta: 16.3, frases: ['¿Llegó mercadería?', 'Una foto de la factura', 'y entra todo el pedido.'] },
      { desde: 16.5, hasta: 19.6, frases: ['Khaleesi System.', 'Probalo gratis siete días.'] },
    ],
  },
  'khaleesi-promo-2': {
    audio: 17.6,
    tramos: [
      { desde: 0.2, hasta: 3.5, frases: ['Un pedido por WhatsApp.', 'Otro por teléfono.', 'Y vos atendiendo el mostrador.'] },
      { desde: 3.6, hasta: 6.4, frases: ['¿Y si tuvieras tu propia tienda?'] },
      { desde: 6.6, hasta: 12.8, frases: ['El cliente compra.', 'Suena la alarma.', 'El pedido ya está en tu caja,', 'con el ticket impreso.'] },
      { desde: 13.0, hasta: 16.3, frases: ['El repartidor lo toma,', 'y el cliente lo ve llegar en el mapa.'] },
      { desde: 16.5, hasta: 19.6, frases: ['Khaleesi System.', 'Probalo gratis siete días.'] },
    ],
  },
  'khaleesi-promo-3': {
    audio: 15.6,
    tramos: [
      { desde: 0.2, hasta: 3.4, frases: ['El cuaderno de la caja.', 'La app de facturar.', 'La de cobrar.'] },
      { desde: 3.6, hasta: 6.4, frases: ['Todo eso, en una sola pantalla.'] },
      { desde: 6.6, hasta: 12.8, frases: ['Cargás la venta.', 'Facturás en ARCA.', 'Cobrás por QR.', 'Sin salir de la pantalla.'] },
      { desde: 13.0, hasta: 16.3, frases: ['Y al cerrar la caja,', 'los números ya están.'] },
      { desde: 16.5, hasta: 19.6, frases: ['Khaleesi System.', 'Probalo gratis siete días.'] },
    ],
  },
  'khaleesi-promo-4': {
    audio: 27.9,
    tramos: [
      { desde: 0.3, hasta: 3.9, frases: ['Tu almacén, entero,', 'en un solo sistema.'] },
      { desde: 4.1, hasta: 8.9, frases: ['Vendé escaneando el código,', 'dictando por voz,', 'o sacándole una foto al producto.'] },
      { desde: 9.1, hasta: 13.9, frases: ['La inteligencia artificial completa', 'el nombre, el código y la categoría.'] },
      { desde: 14.1, hasta: 18.4, frases: ['Facturá en ARCA', 'desde la misma pantalla.'] },
      { desde: 18.6, hasta: 22.9, frases: ['Cobrá por QR, con tarjeta,', 'en efectivo o por transferencia.'] },
      { desde: 23.1, hasta: 27.4, frases: ['Y al cerrar la caja,', 'mirá cómo te fue', 'sin sacar una cuenta.'] },
      { desde: 27.6, hasta: 31.0, frases: ['Khaleesi System.', 'Probalo gratis siete días.'] },
    ],
  },
};

const MARCA_INICIO = '      <!-- subtitulos:inicio -->';
const MARCA_FIN = '<!-- subtitulos:fin -->';

// assemble-index.mjs solo arma pistas de voz por frame, a partir de
// audio_meta.json. Estos videos tienen una única locución continua, así que la
// pista se agrega acá — y se agrega en cada corrida, porque cada re-ensamblado
// del index.html la borra.
const bloqueDeVoz = (segundos) =>
  [
    '      <audio',
    '        id="el-voz"',
    '        class="clip"',
    '        src="assets/audio/vo.wav"',
    '        data-start="0"',
    `        data-duration="${segundos.toFixed(2)}"`,
    '        data-track-index="10"',
    '      ></audio>',
  ].join('\n');

const escapar = (t) =>
  t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function construirCapa(guion, segundosDeVoz) {
  const clips = [];
  let pista = 30; // lejos de las pistas de los frames y del audio

  // Los tramos están escritos contra la duración del video; la voz dura menos.
  // Se comprime todo por ese factor para que el último subtítulo caiga junto con
  // la última palabra en vez de quedar colgado después del silencio.
  const finDeLosTramos = Math.max(...guion.tramos.map((t) => t.hasta));
  const factor = segundosDeVoz / finDeLosTramos;

  for (const tramo of guion.tramos) {
    const desde = tramo.desde * factor;
    const hasta = tramo.hasta * factor;
    const total = hasta - desde;
    // El tiempo se reparte por cantidad de caracteres: una frase larga se lee
    // más despacio que una corta.
    const pesos = tramo.frases.map((f) => f.length);
    const suma = pesos.reduce((a, b) => a + b, 0);

    let t = desde;
    tramo.frases.forEach((frase, i) => {
      // El piso de 0.9s evita que una frase corta parpadee, pero no puede pasarse
      // del tramo: si lo hiciera, empujaría al siguiente y volvería el desfase.
      const dur = Math.min(total, Math.max(0.9, (total * pesos[i]) / suma));
      clips.push(
        `      <div\n` +
          `        id="sub-${pista}"\n` +
          `        class="clip subtitulo"\n` +
          `        data-start="${t.toFixed(2)}"\n` +
          `        data-duration="${dur.toFixed(2)}"\n` +
          `        data-track-index="${pista}"\n` +
          `      ><span>${escapar(frase)}</span></div>`,
      );
      t += dur;
      pista += 1;
    });
  }

  const estilo = `
      <style>
        /* Subtítulos: van sobre la zona segura de Reels (los últimos 220px los
           tapa la interfaz de Instagram), y por debajo del texto grande de cada
           frame para no competir con él. */
        #root .subtitulo {
          position: absolute;
          left: 90px;
          right: 90px;
          top: 1500px;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          pointer-events: none;
        }
        #root .subtitulo span {
          display: inline-block;
          max-width: 100%;
          padding: 14px 26px;
          border-radius: 16px;
          background: rgba(9, 9, 12, 0.82);
          color: #FFFFFF;
          /* NO Inter: la copia incluida en el proyecto está recortada y sus
             minúsculas se dibujan como mayúsculas, así que "sacás" salía
             "SACáS". Una fuente del sistema tiene el alfabeto completo. */
          font-family: "Segoe UI", system-ui, -apple-system, Arial, sans-serif;
          font-weight: 700;
          font-size: 46px;
          /* Los frames ponen su texto en mayúsculas y eso se hereda. Acá no:
             la Inter incluida no tiene mayúsculas acentuadas (saldría "SACáS"),
             y en minúscula el subtítulo se distingue del título grande en vez
             de leerse como una repetición. */
          text-transform: none;
          line-height: 1.25;
          letter-spacing: -0.01em;
          text-wrap: balance;
        }
      </style>`;

  // Los marcadores delimitan la capa para poder borrarla exacta al regenerar.
  // Antes se buscaba el bloque por su contenido y la búsqueda arrancaba en el
  // <style> del encabezado, así que se llevaba puesto medio archivo.
  return `${MARCA_INICIO}\n${estilo}\n${clips.join('\n')}\n      ${MARCA_FIN}\n`;
}

// ── main ──
const proyecto = process.argv[2];
if (!proyecto || !GUIONES[proyecto]) {
  console.error(`uso: node generar-subtitulos.mjs <${Object.keys(GUIONES).join('|')}>`);
  process.exit(1);
}

const indexPath = path.join(proyecto, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

// Los subtítulos viejos se borran siempre: la voz se regeneró varias veces y
// dejarlos sería quedarse con el reparto de tiempos de una versión que ya no es.
// El borrado va entre marcadores y nada más: cualquier otra forma de ubicar el
// bloque termina mordiendo el <style> del encabezado y arrasando el archivo.
const desde = html.indexOf(MARCA_INICIO);
const hasta = html.indexOf(MARCA_FIN);
const yaTenia = desde !== -1 && hasta > desde;
if (yaTenia) {
  html = html.slice(0, desde) + html.slice(hasta + MARCA_FIN.length + 1);
} else if (html.includes('class="clip subtitulo"')) {
  throw new Error(
    `${proyecto}: tiene subtítulos sin marcadores (de una versión vieja de este script). ` +
      'Reconstruí el index.html con assemble-index.mjs antes de regenerarlos.',
  );
}

const segundosDeVoz = duracionDeAudio(path.join(proyecto, 'assets', 'audio', 'vo.wav'));
const capa = construirCapa(GUIONES[proyecto], segundosDeVoz);

const teniaVoz = html.includes('id="el-voz"');
const voz = teniaVoz ? '' : bloqueDeVoz(segundosDeVoz) + '\n';

const cierre = html.lastIndexOf('    </div>');
html = html.slice(0, cierre) + voz + capa + html.slice(cierre);
fs.writeFileSync(indexPath, html);

const cuantos = (capa.match(/class="clip subtitulo"/g) || []).length;
const finDeLosTramos = Math.max(...GUIONES[proyecto].tramos.map((t) => t.hasta));
console.log(
  `${proyecto}: ${cuantos} subtítulos ${yaTenia ? 'regenerados' : 'insertados'} · ` +
    `voz ${segundosDeVoz.toFixed(2)}s${teniaVoz ? '' : ' (pista agregada)'} · ` +
    `comprimidos x${(segundosDeVoz / finDeLosTramos).toFixed(3)}`,
);
