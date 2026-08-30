// El detector de "qué hay que desplegar".
//
// Se prueba porque su respuesta decide si un arreglo llega a producción o se
// queda en el repo. El error que le dio origen fue justamente ese: se desplegó
// un nombre que no existía, Firebase respondió "Deploy complete!" y el bug
// siguió vivo en la caja.
//
// Se corre con: node --test

const test = require('node:test');
const assert = require('node:assert');
const { leerExports, funcionesQueUsan } = require('./que-desplegar');

const CODIGO = `
async function ayudanteCompartido(a) { return a; }

exports.primera = onCall(async () => {
  const t = await ayudanteCompartido(1);
  return t;
});

exports.segunda = onCall(async () => {
  return 'no usa nada';
});

exports.tercera = onRequest(async () => {
  const t = await ayudanteCompartido(2);
  return t;
});
`;

test('encuentra todas las funciones exportadas', () => {
  const nombres = leerExports(CODIGO).map((e) => e.nombre);
  assert.deepStrictEqual(nombres, ['primera', 'segunda', 'tercera']);
});

test('dice qué funciones usan un ayudante', () => {
  assert.deepStrictEqual(funcionesQueUsan(CODIGO, 'ayudanteCompartido'), [
    'primera',
    'tercera',
  ]);
});

test('no cuenta la definición del ayudante como un uso', () => {
  // Si la contara, aparecería una función de más y se desplegaría al pedo.
  const usan = funcionesQueUsan(CODIGO, 'ayudanteCompartido');
  assert.ok(!usan.includes('ayudanteCompartido'));
});

test('con un nombre que no existe devuelve vacío, que es la señal de alarma', () => {
  // Este es el caso exacto del error: `generarQrMp` no existía.
  assert.deepStrictEqual(funcionesQueUsan(CODIGO, 'funcionInventada'), []);
});

test('un nombre con puntos no rompe la búsqueda', () => {
  const c = `exports.uno = onCall(() => geocoding.buscar(1));`;
  assert.deepStrictEqual(funcionesQueUsan(c, 'geocoding.buscar'), ['uno']);
});

test('sobre el index.js real encuentra el caso que motivó todo esto', () => {
  const fs = require('fs');
  const path = require('path');
  const real = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8');

  // El ayudante del QR: si alguien lo toca, hay que desplegar esta función.
  assert.deepStrictEqual(funcionesQueUsan(real, 'asegurarPosQr'), [
    'crearQrInteroperable',
  ]);

  // Y el nombre que se desplegó por error no existe en ninguna parte.
  assert.strictEqual(
    leerExports(real).some((e) => e.nombre === 'generarQrMp'),
    false,
  );
});
