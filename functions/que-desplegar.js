// Qué funciones hay que desplegar después de tocar algo.
//
// Nace de un error caro: se arregló un bug del QR dentro de un ayudante
// compartido y se desplegó una función que NO EXISTE con ese nombre. Firebase
// acepta el filtro sin coincidencias, responde "Deploy complete!" y no
// despliega nada, así que el arreglo nunca llegó a producción y el error siguió
// apareciendo en la caja durante días.
//
// Cada Cloud Function lleva su propia copia del código: tocar un ayudante no
// actualiza a nadie hasta que se despliega cada función que lo usa.
//
//   node que-desplegar.js leerAccessTokenComercio
//   node que-desplegar.js               (revisa que los nombres existan)

const fs = require('fs');
const path = require('path');

const RUTA = path.join(__dirname, 'index.js');

/** Todas las funciones exportadas, con la posición donde arranca cada una. */
function leerExports(codigo) {
  const salida = [];
  const re = /^exports\.(\w+)/gm;
  let m;
  while ((m = re.exec(codigo)) !== null) {
    salida.push({ nombre: m[1], desde: m.index });
  }
  return salida;
}

/** Las funciones sueltas —los ayudantes— declaradas arriba de todo. */
function leerAyudantes(codigo) {
  const salida = [];
  const re = /^(?:async\s+)?function\s+(\w+)\s*\(/gm;
  let m;
  while ((m = re.exec(codigo)) !== null) {
    salida.push({ nombre: m[1], desde: m.index });
  }
  return salida;
}

/**
 * Qué funciones exportadas usan un ayudante, siguiendo la cadena.
 *
 * Lo de "siguiendo la cadena" no es un lujo: un ayudante casi nunca lo llama
 * una función exportada de forma directa, sino otro ayudante. Sin resolver eso,
 * la herramienta contesta el nombre de la función exportada que quedó justo
 * arriba en el archivo —que no tiene nada que ver— y uno termina desplegando la
 * equivocada. Sería el mismo error que esto vino a evitar, con otro disfraz.
 *
 * A quién pertenece cada línea se resuelve por posición: la declaración de
 * arriba de todo más cercana hacia atrás. Alcanza porque este archivo declara
 * una función tras otra; si algún día se parte en módulos, hay que rehacerlo.
 */
function funcionesQueUsan(codigo, ayudante, vistos = new Set()) {
  if (vistos.has(ayudante)) return []; // un ayudante que se llama a sí mismo
  vistos.add(ayudante);

  const exportados = leerExports(codigo);
  const ayudantes = leerAyudantes(codigo);
  const declaraciones = [...exportados, ...ayudantes].sort(
    (a, b) => a.desde - b.desde,
  );
  const nombresExportados = new Set(exportados.map((e) => e.nombre));

  const usadas = new Set();
  const intermedios = new Set();
  const escapado = ayudante.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(escapado + '\\s*\\(', 'g');

  let m;
  while ((m = re.exec(codigo)) !== null) {
    // La definición del propio ayudante no cuenta como uso.
    const inicioLinea = codigo.lastIndexOf('\n', m.index) + 1;
    const linea = codigo.slice(inicioLinea, m.index);
    if (/(async\s+)?function\s*$/.test(linea)) continue;

    const previas = declaraciones.filter((d) => d.desde < m.index);
    if (!previas.length) continue;
    const duenio = previas[previas.length - 1].nombre;

    if (nombresExportados.has(duenio)) {
      usadas.add(duenio);
    } else if (duenio !== ayudante) {
      // Lo usa otro ayudante: hay que seguir para arriba.
      intermedios.add(duenio);
    }
  }

  intermedios.forEach((intermedio) => {
    funcionesQueUsan(codigo, intermedio, vistos).forEach((f) => usadas.add(f));
  });

  return [...usadas].sort();
}

function principal() {
  const codigo = fs.readFileSync(RUTA, 'utf8');
  const ayudante = process.argv[2];

  if (!ayudante) {
    const nombres = leerExports(codigo).map((e) => e.nombre);
    console.log(`${nombres.length} funciones en index.js:\n`);
    console.log(nombres.sort().join('\n'));
    console.log(
      '\nAntes de desplegar, confirmá que el nombre esté en esta lista:',
    );
    console.log('un filtro sin coincidencias termina con "Deploy complete!"');
    console.log('sin haber desplegado nada.');
    return;
  }

  const usan = funcionesQueUsan(codigo, ayudante);
  if (usan.length === 0) {
    console.log(`Ninguna función usa "${ayudante}".`);
    console.log(
      '¿Está bien escrito? Fijate la lista con: node que-desplegar.js',
    );
    return;
  }
  console.log(`Funciones que usan "${ayudante}" (${usan.length}):\n`);
  usan.forEach((n) => console.log('  ' + n));
  console.log('\nPara desplegarlas todas:\n');
  console.log(
    '  firebase deploy --only ' + usan.map((n) => `functions:${n}`).join(','),
  );
}

if (require.main === module) principal();

module.exports = { leerExports, leerAyudantes, funcionesQueUsan };
