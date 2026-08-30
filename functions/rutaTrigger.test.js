// Qué se guarda cuando el repartidor se mueve.
//
// La decisión de gastar o no una consulta del servicio de rutas se prueba acá,
// sin red: es lo que separa un delivery de diez llamadas de uno de cuatrocientas.
//
// Se corre con: node --test

const test = require('node:test');
const assert = require('node:assert');
const { calcularParaPedido } = require('./rutaTrigger');
const ruta = require('./ruta');

const AHORA = 1_800_000_000_000;
const DESTINO = { lat: -31.438, lng: -64.171 };
const POSICION = { lat: -31.425, lng: -64.185 };

// Una polilínea real, corta, para simular una ruta ya guardada.
const POLILINEA = '_p~iF~ps|U_ulLnnqC';

const pedidoBase = (extra = {}) => ({
  cliente: { geo: DESTINO },
  ...extra,
});

test('un pedido sin punto del cliente no gasta ninguna consulta', async () => {
  const r = await calcularParaPedido(
    { cliente: { nombre: 'Ana' } },
    POSICION,
    'clave',
    AHORA,
  );
  assert.strictEqual(r, null);
});

test('con la ruta recién calculada y yendo por ella, no se vuelve a pedir', async () => {
  const pedido = pedidoBase({
    ruta: { polilinea: POLILINEA, calculadaEn: AHORA - 5_000 },
    eta: { llegadaTs: AHORA + 900_000 },
  });
  // El repartidor tiene que estar SOBRE la ruta guardada, si no dispara el
  // freno de desvío y recalcula, que es lo correcto. Se toma el primer punto
  // de la propia polilínea.
  const sobreLaRuta = ruta.decodificarPolilinea(POLILINEA)[0];

  const original = global.fetch;
  global.fetch = async () => {
    throw new Error('no tendría que consultar el servicio en este caso');
  };
  try {
    const r = await calcularParaPedido(pedido, sobreLaRuta, 'clave', AHORA);
    assert.strictEqual(
      r,
      null,
      'no debería pedir nada estando fresca y en ruta',
    );
  } finally {
    global.fetch = original;
  }
});

test('a punto de llegar, no se pide más', async () => {
  const pedido = pedidoBase({
    ruta: { polilinea: POLILINEA, calculadaEn: AHORA - 600_000 },
    eta: { llegadaTs: AHORA + 60_000 }, // falta un minuto
  });
  assert.strictEqual(
    await calcularParaPedido(pedido, POSICION, 'clave', AHORA),
    null,
  );
});

test('si el servicio se cae, igual se devuelve un tiempo aproximado', async () => {
  // Sin ruta no se puede dibujar la línea, pero el cliente igual necesita saber
  // si son cinco minutos o cuarenta.
  const original = global.fetch;
  global.fetch = async () => ({ ok: false, status: 503 });
  try {
    const r = await calcularParaPedido(pedidoBase(), POSICION, 'clave', AHORA);
    assert.strictEqual(r.rutaError, 'servicio');
    assert.ok(r.eta.llegadaTs > AHORA, 'tiene que dar una llegada futura');
    assert.strictEqual(r.ruta, undefined, 'no hay geometría que guardar');
  } finally {
    global.fetch = original;
  }
});

test('con ruta, se guarda la geometría, la distancia y la llegada', async () => {
  const original = global.fetch;
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      routes: [
        {
          geometry: POLILINEA,
          summary: { distance: 2400.7, duration: 600 },
        },
      ],
    }),
  });
  try {
    const r = await calcularParaPedido(pedidoBase(), POSICION, 'clave', AHORA);
    assert.strictEqual(r.ruta.polilinea, POLILINEA);
    assert.strictEqual(r.ruta.distanciaM, 2401);
    assert.strictEqual(r.ruta.duracionS, 600);
    assert.strictEqual(r.ruta.calculadaEn, AHORA);
    // 600 s de manejo con colchón y redondeo dan 15 minutos.
    assert.strictEqual(r.eta.llegadaTs, AHORA + 15 * 60 * 1000);
    assert.strictEqual(r.rutaError, null);
  } finally {
    global.fetch = original;
  }
});

test('si el servicio contesta sin rutas, no se guarda nada inventado', async () => {
  const original = global.fetch;
  global.fetch = async () => ({ ok: true, json: async () => ({ routes: [] }) });
  try {
    assert.strictEqual(
      await calcularParaPedido(pedidoBase(), POSICION, 'clave', AHORA),
      null,
    );
  } finally {
    global.fetch = original;
  }
});
