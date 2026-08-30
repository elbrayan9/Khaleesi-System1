// Regla de Mercado Pago: el external_id tiene que ser alfanumérico.
//
// Se prueba porque el incumplimiento no se ve leyendo el código —el nombre
// `khaleesi_store_x` parece de lo más razonable— y el efecto es que el comercio
// no puede cobrar por QR.
//
// Se corre con: node --test

const test = require('node:test');
const assert = require('node:assert');
const { idsDeCajaQr } = require('./mpIds');

const ALFANUMERICO = /^[A-Za-z0-9]+$/;

test('los identificadores no llevan guiones bajos ni guiones', () => {
  const { storeExternalId, posExternalId } = idsDeCajaQr(
    'sucursal_principal-01',
    'abc123',
  );
  assert.match(storeExternalId, ALFANUMERICO);
  assert.match(posExternalId, ALFANUMERICO);
});

test('limpia cualquier basura que traiga el id de la sucursal', () => {
  for (const entrada of [
    'suc/con/barras',
    'con espacios',
    'acentuada-ñandú',
    'punto.y.coma;',
    '{llaves}',
  ]) {
    const { storeExternalId, posExternalId } = idsDeCajaQr(entrada, 'uid1');
    assert.match(storeExternalId, ALFANUMERICO, `falló con: ${entrada}`);
    assert.match(posExternalId, ALFANUMERICO, `falló con: ${entrada}`);
  }
});

test('si la sucursal no deja nada usable, cae al uid', () => {
  const { posExternalId } = idsDeCajaQr('___', 'uid9');
  assert.strictEqual(posExternalId, 'KHALEESIPOSuid9');
});

test('sin sucursal usa el uid', () => {
  const { storeExternalId } = idsDeCajaQr(null, 'MiUid123');
  assert.strictEqual(storeExternalId, 'KHALEESISTOREMiUid123');
});

test('la tienda y la caja son distintas entre sí', () => {
  const { storeExternalId, posExternalId } = idsDeCajaQr('s1', 'u1');
  assert.notStrictEqual(storeExternalId, posExternalId);
});

test('dos sucursales distintas no comparten caja', () => {
  const a = idsDeCajaQr('sucursalUno', 'u1');
  const b = idsDeCajaQr('sucursalDos', 'u1');
  assert.notStrictEqual(a.posExternalId, b.posExternalId);
});

test('no se pasa de largo con un uid de Firebase', () => {
  // 28 caracteres, que es lo que mide un uid real.
  const { storeExternalId } = idsDeCajaQr(null, 'a'.repeat(28));
  assert.ok(
    storeExternalId.length <= 40,
    `quedó de ${storeExternalId.length} caracteres`,
  );
});
