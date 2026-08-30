// ¿Puede un comercio usar el token de Mercado Pago de otro?
//
// Esta es la prueba que faltaba. El Access Token permite cobrar y hacer
// devoluciones, y todas las funciones que cobran reciben el `sucursalId` desde
// el navegador. Ese identificador **es público**: viaja en la URL de la tienda
// online que cada comercio le pasa a sus clientes. Sin comprobar de quién es la
// sucursal, alcanzaba con cambiar ese dato en el pedido para operar con la
// cuenta ajena.
//
// Se corre contra el emulador, con la base de verdad, porque el control vive en
// una consulta a Firestore y un doble no probaría nada:
//
//   firebase emulators:exec --only firestore "node functions/tokenMp.test.mjs"

import test from 'node:test';
import assert from 'node:assert';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const admin = require('firebase-admin');
const { crearBoveda } = require('./tokenMp.js');
const { esDuenoDeSucursal } = require('./tenencia.js');

process.env.FIRESTORE_EMULATOR_HOST =
  process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
admin.initializeApp({ projectId: 'khaleesy-system' });
const db = admin.firestore();

const boveda = crearBoveda(db, admin, { esDuenoDeSucursal });

const ANA = 'comercio-ana';
const BETO = 'comercio-beto';
const SUC_ANA = 'sucursal-de-ana';
const SUC_BETO = 'sucursal-de-beto';

const TOKEN_ANA = 'APP_USR-token-de-ana';
const TOKEN_BETO = 'APP_USR-token-de-beto';

test.before(async () => {
  await db.collection('sucursales').doc(SUC_ANA).set({ userId: ANA });
  await db.collection('sucursales').doc(SUC_BETO).set({ userId: BETO });
  await db
    .collection('secretosMp')
    .doc(`suc_${SUC_ANA}`)
    .set({ accessToken: TOKEN_ANA, uid: ANA });
  await db
    .collection('secretosMp')
    .doc(`suc_${SUC_BETO}`)
    .set({ accessToken: TOKEN_BETO, uid: BETO });
});

test('cada comercio llega a su propio token', async () => {
  assert.strictEqual(
    await boveda.leerAccessTokenComercio(ANA, SUC_ANA),
    TOKEN_ANA,
  );
  assert.strictEqual(
    await boveda.leerAccessTokenComercio(BETO, SUC_BETO),
    TOKEN_BETO,
  );
});

test('NO llega al token de otro comercio', async () => {
  // El ataque: Ana manda el id de la sucursal de Beto, que saca de la URL
  // pública de su tienda online.
  const robado = await boveda.leerAccessTokenComercio(ANA, SUC_BETO);
  assert.strictEqual(robado, null, 'Ana no puede obtener el token de Beto');
  assert.notStrictEqual(robado, TOKEN_BETO);
});

test('tampoco con una sucursal que no existe', async () => {
  assert.strictEqual(
    await boveda.leerAccessTokenComercio(ANA, 'sucursal-inventada'),
    null,
  );
});

test('el token guardado a nombre del dueño sigue funcionando sin sucursal', async () => {
  // Un comercio sin sucursales guarda su token bajo su uid.
  await db
    .collection('secretosMp')
    .doc(`uid_${ANA}`)
    .set({ accessToken: 'APP_USR-de-ana-sin-sucursal', uid: ANA });
  assert.strictEqual(
    await boveda.leerAccessTokenComercio(ANA, null),
    'APP_USR-de-ana-sin-sucursal',
  );
});

test('y ese token propio NO se entrega al pedirlo con una sucursal ajena', async () => {
  // El respaldo "si no está por sucursal, buscá por dueño" no puede volverse
  // una puerta lateral: el corte ocurre antes de llegar a ese respaldo.
  assert.strictEqual(await boveda.leerAccessTokenComercio(ANA, SUC_BETO), null);
});

test('la migración desde el lugar viejo también respeta de quién es', async () => {
  // Un comercio que todavía tiene el token en la configuración de su sucursal.
  await db
    .collection('sucursales')
    .doc(SUC_BETO)
    .set(
      { userId: BETO, configuracion: { mpAccessToken: 'APP_USR-viejo-beto' } },
      { merge: true },
    );
  await db.collection('secretosMp').doc(`suc_${SUC_BETO}`).delete();

  // Ana no puede provocar la mudanza del token de Beto ni verlo.
  assert.strictEqual(await boveda.leerAccessTokenComercio(ANA, SUC_BETO), null);

  // Beto sí, y de paso queda migrado.
  assert.strictEqual(
    await boveda.leerAccessTokenComercio(BETO, SUC_BETO),
    'APP_USR-viejo-beto',
  );
});

test.after(async () => {
  await admin.app().delete();
});
