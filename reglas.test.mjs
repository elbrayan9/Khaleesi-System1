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
