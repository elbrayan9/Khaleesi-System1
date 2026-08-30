// Qué funciones hay que desplegar después de tocar algo.
//
// Nace de un error caro: se arregló un bug del QR dentro de un ayudante
// compartido y se desplegó una función que NO EXISTE con ese nombre. Firebase
// acepta el filtro sin coincidencias y responde "Deploy complete!" sin avisar
// que no desplegó nada, así que el arreglo nunca llegó a producción y el error
// siguió apareciendo en la caja durante días.
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

/**
 * Qué funciones exportadas usan un ayudante.
 *
 * Se resuelve por posición en el archivo: cada uso pertenece al último
 * `exports.` que quedó por encima. Es simple y alcanza porque este proyecto
 * declara una función tras otra; si algún día se reordena en módulos, esto hay
 * que rehacerlo.
 */
function funcionesQueUsan(codigo, ayudante) {
  const exportados = leerExports(codigo);
  const usadas = new Set();
  const re = new RegExp(ayudante.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\(', 'g');
  let m;
  while ((m = re.exec(codigo)) !== null) {
    // La definición del propio ayudante no cuenta como uso.
    const inicioLinea = codigo.lastIndexOf('\n', m.index) + 1;
    const linea = codigo.slice(inicioLinea, m.index);
    if (/function\s*$/.test(linea) || /^\s*(async\s+)?function\s*$/.test(linea)) {
      continue;
    }
    const previas = exportados.filter((e) => e.desde < m.index);
    if (previas.length) usadas.add(previas[previas.length - 1].nombre);
  }
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
    console.log('¿Está bien escrito? Fijate la lista con: node que-desplegar.js');
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

module.exports = { leerExports, funcionesQueUsan };
