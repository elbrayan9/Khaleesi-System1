// Qué se compró, leído del pago.
//
// Cada caso de acá corresponde a un intento de pagar poco y llevarse mucho.

const test = require('node:test');
const assert = require('node:assert');
const {
  referenciaDeSuscripcion,
  datosDeLaReferencia,
  diasDelCiclo,
} = require('./suscripcion');

test('lo que se arma es lo que se lee', () => {
  const ref = referenciaDeSuscripcion('uid123', 'premium', 'anual');
  assert.deepStrictEqual(datosDeLaReferencia(ref), {
    uid: 'uid123',
    plan: 'premium',
    ciclo: 'anual',
  });
});

test('el plan sale de la referencia y no de otro lado', () => {
  const ref = referenciaDeSuscripcion('uid123', 'basic', 'mensual');
  const d = datosDeLaReferencia(ref);
  assert.strictEqual(d.plan, 'basic');
  assert.strictEqual(d.ciclo, 'mensual');
});

test('una referencia vieja, sin ciclo, se toma como mensual', () => {
  // Formato anterior: sub_<uid>_<plan>_<marca de tiempo>. Ante la duda, lo
  // menos: un error no puede regalar un año.
  const d = datosDeLaReferencia('sub_uid123_premium_1800000000000');
  assert.strictEqual(d.plan, 'premium');
  assert.strictEqual(d.ciclo, 'mensual');
});

test('no se acepta un plan inventado', () => {
  assert.strictEqual(datosDeLaReferencia('sub_uid123_platinum_anual_1'), null);
  assert.strictEqual(datosDeLaReferencia('sub_uid123_admin_anual_1'), null);
});

test('lo que no es una suscripción no se lee como una', () => {
  // Un cobro común de un comercio no puede pasar por una suscripción.
  assert.strictEqual(datosDeLaReferencia('qr_uid123_1800000000000'), null);
  assert.strictEqual(datosDeLaReferencia('venta-abc123'), null);
  assert.strictEqual(datosDeLaReferencia(''), null);
  assert.strictEqual(datosDeLaReferencia(null), null);
  assert.strictEqual(datosDeLaReferencia('sub_uid'), null);
});

test('un ciclo escrito de cualquier otra forma queda en mensual', () => {
  assert.strictEqual(
    datosDeLaReferencia('sub_uid123_premium_ANUAL_1').ciclo,
    'mensual',
  );
  assert.strictEqual(
    datosDeLaReferencia('sub_uid123_premium_eterno_1').ciclo,
    'mensual',
  );
});

test('armar con datos inválidos cae en lo más barato y más corto', () => {
  const ref = referenciaDeSuscripcion('uid1', 'platinum', 'decenal');
  const d = datosDeLaReferencia(ref);
  assert.strictEqual(d.plan, 'basic');
  assert.strictEqual(d.ciclo, 'mensual');
});

test('los días salen del ciclo', () => {
  assert.strictEqual(diasDelCiclo('anual'), 365);
  assert.strictEqual(diasDelCiclo('mensual'), 30);
  assert.strictEqual(diasDelCiclo(undefined), 30);
});
