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
const geocoding = require('./geocoding');
const {
  normalizarDireccion,
  claveCache,
  recuadroAlrededor,
  coordenadaValida,
  buscarDireccion,
} = geocoding;

test('normalizar saca tildes, mayúsculas y puntuación', () => {
  assert.strictEqual(
    normalizarDireccion('Av. CÓRDOBA 1234'),
    'av cordoba 1234',
  );
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
  const r = recuadroAlrededor({ lat: -34.6, lng: -58.4 }, 0.5)
    .split(',')
    .map(Number);
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

// --- Cuál de los dos buscadores se usa ---
//
// Importa porque uno es claramente mejor para direcciones argentinas y el otro
// no necesita clave. La regla es: el mejor si está disponible, y el otro si el
// mejor se cae — que un servicio no conteste no puede dejar al comercio sin
// poder ubicar su local.

const PUNTO_ORS = { lat: -31.42, lng: -64.18, label: 'desde ORS' };
const PUNTO_OSM = { lat: -34.6, lng: -58.4, label: 'desde OSM' };

test('sin clave va directo al buscador libre', async () => {
  let usoOrs = false;
  const buscadores = {
    ors: async () => {
      usoOrs = true;
      return PUNTO_ORS;
    },
    osm: async () => PUNTO_OSM,
  };
  const r = await buscarDireccion('Av. Colón 100', null, null, buscadores);
  assert.strictEqual(usoOrs, false, 'no debería intentar con ORS sin clave');
  assert.strictEqual(r.proveedor, 'nominatim');
  assert.strictEqual(r.label, 'desde OSM');
});

test('sin referencia, con clave usa el buscador bueno', async () => {
  const r = await buscarDireccion('Av. Colón 100', null, 'una-clave', {
    ors: async () => PUNTO_ORS,
    osm: async () => PUNTO_OSM,
  });
  assert.strictEqual(r.proveedor, 'ors');
  assert.strictEqual(r.lat, PUNTO_ORS.lat);
});

// --- Con un punto de referencia, gana el más cercano ---
//
// Este es el caso real que motivó la regla: probando en Córdoba, cada buscador
// clavó una dirección que el otro mandaba a decenas de kilómetros. Quedarse
// siempre con el mismo se comía uno de los dos casos.

const CENTRO_CBA = { lat: -31.42, lng: -64.18 };

test('gana el candidato más cercano a la referencia, aunque sea el de respaldo', async () => {
  const r = await buscarDireccion(
    'Bv. San Juan 1000',
    CENTRO_CBA,
    'una-clave',
    {
      // Lo que devolvió ORS de verdad con esta dirección: 47 km al oeste.
      ors: async () => ({ lat: -31.42, lng: -64.68, label: 'lejos' }),
      osm: async () => ({ lat: -31.425, lng: -64.19, label: 'la buena' }),
    },
  );
  assert.strictEqual(r.proveedor, 'nominatim');
  assert.strictEqual(r.label, 'la buena');
});

test('y también gana el bueno cuando el de respaldo es el que se va lejos', async () => {
  const r = await buscarDireccion('9 de Julio 500', CENTRO_CBA, 'una-clave', {
    ors: async () => ({ lat: -31.423, lng: -64.185, label: 'la buena' }),
    // Saldán, 16 km: el resultado real de Nominatim con esta dirección.
    osm: async () => ({ lat: -31.28, lng: -64.3, label: 'Saldan' }),
  });
  assert.strictEqual(r.proveedor, 'ors');
  assert.strictEqual(r.label, 'la buena');
});

test('con referencia, si uno no encuentra nada gana el otro', async () => {
  const r = await buscarDireccion('Calle rara 1', CENTRO_CBA, 'una-clave', {
    ors: async () => null,
    osm: async () => ({ lat: -31.43, lng: -64.19, label: 'unico' }),
  });
  assert.strictEqual(r.label, 'unico');
});

test('si el buscador bueno se cae, sigue con el otro', async () => {
  const r = await buscarDireccion('Av. Colón 100', null, 'una-clave', {
    ors: async () => {
      throw new Error('503');
    },
    osm: async () => PUNTO_OSM,
  });
  assert.strictEqual(r.proveedor, 'nominatim', 'tiene que caer al respaldo');
});

test('si el bueno no encuentra nada, igual se prueba con el otro', async () => {
  const r = await buscarDireccion('Calle inventada 1', null, 'una-clave', {
    ors: async () => null,
    osm: async () => PUNTO_OSM,
  });
  assert.strictEqual(r.proveedor, 'nominatim');
});

test('si ninguno la encuentra, devuelve null y no rompe', async () => {
  assert.strictEqual(
    await buscarDireccion('Calle inventada 1', null, 'una-clave', {
      ors: async () => null,
      osm: async () => null,
    }),
    null,
  );
});
