// Las reglas de Firestore, probadas contra el emulador.
//
// El punto central: los Access Token de Mercado Pago de los comercios quedan
// fuera del alcance del navegador. Antes vivían dentro de la configuración de
// la sucursal, que se descarga entera al cliente, así que un XSS alcanzaba para
// llevarse la cuenta de cobro de un comercio.
//
// Se prueba con el emulador y no leyendo las reglas porque el detalle que
// importa es contraintuitivo: en Firestore alcanza con que UNA regla permita
// para que el acceso se conceda. Un `allow read: if false` NO bloquea nada si
// otra regla más general permite.
//
// Correr con:
//   firebase emulators:exec --only firestore "node reglas.test.mjs"

import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert';

const env = await initializeTestEnvironment({
  projectId: 'khaleesy-system',
  firestore: {
    rules: readFileSync('firestore.rules', 'utf8'),
    host: '127.0.0.1',
    port: 8080,
  },
});

const DUENO = 'dueno123';
const OTRO = 'intruso456';

// Datos de partida, puestos sin pasar por las reglas.
await env.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  await setDoc(doc(db, 'datosNegocio', DUENO), {
    userId: DUENO,
    subscriptionStatus: 'active',
  });
  await setDoc(doc(db, 'sucursales', 'suc1'), {
    userId: DUENO,
    configuracion: { nombre: 'Kiosco', mpConfigurado: true },
  });
  // El secreto, tal como lo escribe la Cloud Function.
  await setDoc(doc(db, 'secretosMp', 'suc_suc1'), {
    accessToken: 'APP_USR-secreto-de-verdad',
    uid: DUENO,
    ultimos4: 'dad',
  });
  // El puente del escáner, con contenido.
  await setDoc(doc(db, 'scannerRelay', 'suc1'), { userId: DUENO, codigo: '779' });

  // El caché de direcciones: guarda dónde vive gente que hizo pedidos.
  await setDoc(doc(db, 'geocache', 'abc123'), {
    q: 'av cordoba 1234',
    lat: -34.6,
    lng: -58.4,
    label: 'Av. Córdoba 1234, CABA',
  });
  // Los frenos anti-abuso.
  await setDoc(doc(db, 'contadores', 'geocoding_2026-08-30'), { usadas: 12 });
  // Y uno con userId, que es lo que el comodín podría dejar pasar.
  await setDoc(doc(db, 'contadores', 'con_dueno'), { userId: DUENO, usadas: 1 });

  // El caso que el comodín podría dejar pasar: un secreto con userId.
  await setDoc(doc(db, 'secretosMp', 'uid_' + DUENO), {
    accessToken: 'APP_USR-otro-secreto',
    userId: DUENO,
    uid: DUENO,
  });
});

const comoDueno = env.authenticatedContext(DUENO).firestore();
const comoOtro = env.authenticatedContext(OTRO).firestore();
const comoAdmin = env.authenticatedContext('admin1', { admin: true }).firestore();
const sinSesion = env.unauthenticatedContext().firestore();

test('el dueño NO puede leer su propio Access Token', async () => {
  await assertFails(getDoc(doc(comoDueno, 'secretosMp', 'suc_suc1')));
});

test('tampoco el que tiene el campo userId, que el comodín podría dejar pasar', async () => {
  await assertFails(getDoc(doc(comoDueno, 'secretosMp', 'uid_' + DUENO)));
});

test('un intruso autenticado no lo lee', async () => {
  await assertFails(getDoc(doc(comoOtro, 'secretosMp', 'suc_suc1')));
});

test('sin sesión tampoco', async () => {
  await assertFails(getDoc(doc(sinSesion, 'secretosMp', 'suc_suc1')));
});

test('ni siquiera el admin: nadie lo necesita desde el navegador', async () => {
  await assertFails(getDoc(doc(comoAdmin, 'secretosMp', 'suc_suc1')));
});

test('nadie puede escribir un token desde el navegador', async () => {
  await assertFails(
    setDoc(doc(comoDueno, 'secretosMp', 'suc_suc1'), { accessToken: 'robado' }),
  );
});

test('nadie lee el caché de direcciones, que tiene domicilios de clientes', async () => {
  await assertFails(getDoc(doc(comoDueno, 'geocache', 'abc123')));
  await assertFails(getDoc(doc(comoOtro, 'geocache', 'abc123')));
  await assertFails(getDoc(doc(comoAdmin, 'geocache', 'abc123')));
  await assertFails(getDoc(doc(sinSesion, 'geocache', 'abc123')));
});

test('tampoco se escribe una dirección al caché desde el navegador', async () => {
  await assertFails(
    setDoc(doc(comoDueno, 'geocache', 'abc123'), { lat: 0, lng: 0 }),
  );
});

test('los contadores anti-abuso quedan fuera de la vista', async () => {
  await assertFails(getDoc(doc(comoDueno, 'contadores', 'geocoding_2026-08-30')));
  // Ni siquiera el que lleva su propio userId, que es por donde se colaría.
  await assertFails(getDoc(doc(comoDueno, 'contadores', 'con_dueno')));
  await assertFails(
    setDoc(doc(comoDueno, 'contadores', 'con_dueno'), { usadas: 0 }),
  );
});

// --- El puente del escáner por celular ---
//
// Escuchar un documento que todavía no existe daba "Missing or insufficient
// permissions" y el celular como pistola no se enganchaba hasta recargar.

test('se puede escuchar el relay de una sucursal recién abierta, sin documento', async () => {
  await assertSucceeds(getDoc(doc(comoDueno, 'scannerRelay', 'suc-sin-doc')));
});

test('con documento, lo lee su dueño', async () => {
  const snap = await assertSucceeds(
    getDoc(doc(comoDueno, 'scannerRelay', 'suc1')),
  );
  assert.strictEqual(snap.data().codigo, '779');
});

test('pero el relay de otro comercio sigue cerrado', async () => {
  await assertFails(getDoc(doc(comoOtro, 'scannerRelay', 'suc1')));
});

test('y nadie escribe en el relay ajeno', async () => {
  await assertFails(
    setDoc(doc(comoOtro, 'scannerRelay', 'suc1'), {
      userId: OTRO,
      codigo: '000',
    }),
  );
});

test('el dueño sigue leyendo la configuración de su sucursal', async () => {
  // Lo que NO tiene que romperse: la app carga leyendo esto.
  const snap = await assertSucceeds(getDoc(doc(comoDueno, 'sucursales', 'suc1')));
  assert.strictEqual(snap.data().configuracion.nombre, 'Kiosco');
  // Y ahí ya no hay ningún token.
  assert.strictEqual(snap.data().configuracion.mpAccessToken, undefined);
});

test('un intruso no lee la sucursal ajena', async () => {
  await assertFails(getDoc(doc(comoOtro, 'sucursales', 'suc1')));
});

test.after(async () => {
  await env.cleanup();
});
