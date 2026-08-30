// Las partes puras del geocodificador.
//
// Lo que se prueba acá es la clave del caché, que es lo que decide si una
// dirección se consulta o se reusa. Si dos formas de escribir la misma esquina
// dan claves distintas, el caché no sirve para nada justo en el caso para el
// que existe: el cliente que vuelve a pedir a la misma casa.
//
// Se corre con: node --test

const test = require('node:test');
const assert = require('node:assert');
const {
  normalizarDireccion,
  claveCache,
  recuadroAlrededor,
  coordenadaValida,
} = require('./geocoding');

test('normalizar saca tildes, mayúsculas y puntuación', () => {
  assert.strictEqual(normalizarDireccion('Av. CÓRDOBA 1234'), 'av cordoba 1234');
  assert.strictEqual(normalizarDireccion('  Güemes   señor  '), 'guemes senor');
});

test('la misma esquina escrita distinto da la misma clave', () => {
  const formas = [
    'Av. Córdoba 1234',
    'av cordoba 1234',
    'AV CORDOBA 1234',
    '  Av.  Córdoba   1234  ',
    'Av, Córdoba 1234',
  ];
  const claves = new Set(formas.map(claveCache));
  assert.strictEqual(claves.size, 1, 'deberían dar una sola clave');
});

test('direcciones distintas dan claves distintas', () => {
  assert.notStrictEqual(
    claveCache('Av. Córdoba 1234'),
    claveCache('Av. Córdoba 1235'),
  );
  assert.notStrictEqual(
    claveCache('Av. Córdoba 1234'),
    claveCache('Av. Corrientes 1234'),
  );
});

test('la clave es un hash parejo y no la dirección en claro', () => {
  const c = claveCache('Av. Córdoba 1234');
  assert.match(c, /^[0-9a-f]{40}$/);
});

test('el recuadro sale en el orden que espera Nominatim', () => {
  // izquierda, arriba, derecha, abajo
  const r = recuadroAlrededor({ lat: -34.6, lng: -58.4 }, 0.5).split(',').map(Number);
  assert.ok(r[0] < r[2], 'la izquierda va antes que la derecha');
  assert.ok(r[1] > r[3], 'arriba va antes que abajo');
  assert.strictEqual(r[0], -58.9);
  assert.strictEqual(r[3], -35.1);
});

test('sin punto de referencia no hay recuadro', () => {
  assert.strictEqual(recuadroAlrededor(null), null);
  assert.strictEqual(recuadroAlrededor({ lat: NaN, lng: 0 }), null);
  assert.strictEqual(recuadroAlrededor({}), null);
});

test('coordenadaValida acepta lo terrestre y rechaza el resto', () => {
  assert.ok(coordenadaValida(-34.6, -58.4));
  assert.ok(coordenadaValida(0, 0));
  assert.ok(!coordenadaValida(91, 0));
  assert.ok(!coordenadaValida(0, 181));
  assert.ok(!coordenadaValida(NaN, 0));
  assert.ok(!coordenadaValida('-34.6', '-58.4'));
});
