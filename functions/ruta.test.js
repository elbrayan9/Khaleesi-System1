// Las cuentas del recorrido y del tiempo de llegada.
//
// Se prueban porque cada una decide algo que se paga o que se ve: cuándo
// gastar una consulta del servicio de rutas, y qué número lee la persona que
// está esperando su pedido.
//
// Se corre con: node --test

const test = require('node:test');
const assert = require('node:assert');
const {
  decodificarPolilinea,
  distanciaAPolilinea,
  debeRecalcular,
  minutosParaMostrar,
  llegadaEstimada,
  etaAproximada,
  MS_ENTRE_CALCULOS,
  DESVIO_M,
} = require('./ruta');

// --- Leer la geometría que manda el servicio ---

test('decodifica el ejemplo de la documentación de Google', () => {
  // Es el caso canónico del formato: tres puntos conocidos.
  const puntos = decodificarPolilinea('_p~iF~ps|U_ulLnnqC_mqNvxq`@');
  assert.strictEqual(puntos.length, 3);
  assert.ok(Math.abs(puntos[0].lat - 38.5) < 1e-5);
  assert.ok(Math.abs(puntos[0].lng - -120.2) < 1e-5);
  assert.ok(Math.abs(puntos[2].lat - 43.252) < 1e-5);
  assert.ok(Math.abs(puntos[2].lng - -126.453) < 1e-5);
});

test('con basura devuelve una lista vacía en vez de romperse', () => {
  assert.deepStrictEqual(decodificarPolilinea(''), []);
  assert.deepStrictEqual(decodificarPolilinea(null), []);
  assert.deepStrictEqual(decodificarPolilinea(undefined), []);
});

// --- Qué tan lejos está de la ruta ---
//
// Una cuadra porteña son unos 110 m, así que los números de acá se leen en
// cuadras: el umbral de desvío es poco más de una.

// Un tramo recto de un kilómetro hacia el este.
const TRAMO = [
  { lat: -31.42, lng: -64.18 },
  { lat: -31.42, lng: -64.169 },
];

test('sobre la ruta, la distancia es casi cero', () => {
  const encima = { lat: -31.42, lng: -64.1745 };
  assert.ok(distanciaAPolilinea(encima, TRAMO) < 5);
});

test('a un costado, mide la perpendicular', () => {
  // 0.0009 grados de latitud son ~100 m.
  const alCostado = { lat: -31.4209, lng: -64.1745 };
  const d = distanciaAPolilinea(alCostado, TRAMO);
  assert.ok(d > 80 && d < 120, `dio ${d}`);
});

test('pasado el final del tramo, mide contra la punta y no contra la recta infinita', () => {
  // Este es el caso que se escapa si uno proyecta sin recortar: el punto está
  // más allá del final, así que la distancia es hasta ese extremo.
  const masAlla = { lat: -31.42, lng: -64.159 };
  const d = distanciaAPolilinea(masAlla, TRAMO);
  assert.ok(d > 800 && d < 1100, `dio ${d}`);
});

test('sin ruta cargada, la distancia es infinita y no cero', () => {
  // Cero significaría "está justo encima", que es lo contrario de la verdad.
  assert.strictEqual(distanciaAPolilinea({ lat: 0, lng: 0 }, []), Infinity);
  assert.strictEqual(distanciaAPolilinea(null, TRAMO), Infinity);
});

// --- Cuándo se gasta una consulta ---

const AHORA = 1_800_000_000_000;
const EN_RUTA = { lat: -31.42, lng: -64.1745 };
const rutaGuardada = (calculadaEn) => ({ calculadaEn, puntos: TRAMO });

test('sin ruta previa, se calcula', () => {
  assert.strictEqual(debeRecalcular(null, EN_RUTA, 900, AHORA), true);
});

test('recién calculada y en camino, no se toca', () => {
  const r = rutaGuardada(AHORA - 10_000);
  assert.strictEqual(debeRecalcular(r, EN_RUTA, 900, AHORA), false);
});

test('pasado el tiempo mínimo, se recalcula', () => {
  const r = rutaGuardada(AHORA - MS_ENTRE_CALCULOS - 1);
  assert.strictEqual(debeRecalcular(r, EN_RUTA, 900, AHORA), true);
});

test('si dobló por otro lado, se recalcula aunque recién se haya calculado', () => {
  const lejos = { lat: -31.425, lng: -64.1745 }; // ~550 m al sur
  const r = rutaGuardada(AHORA - 5_000);
  assert.ok(distanciaAPolilinea(lejos, TRAMO) > DESVIO_M);
  assert.strictEqual(debeRecalcular(r, lejos, 900, AHORA), true);
});

test('a punto de llegar, se deja de gastar consultas', () => {
  // Aunque haya pasado el tiempo y esté desviado: ya está por tocar el timbre.
  const lejos = { lat: -31.425, lng: -64.1745 };
  const r = rutaGuardada(AHORA - 600_000);
  assert.strictEqual(debeRecalcular(r, lejos, 60, AHORA), false);
});

test('sin posición del repartidor no se calcula nada', () => {
  assert.strictEqual(debeRecalcular(null, null, 900, AHORA), false);
});

// --- El número que lee la persona ---

test('al tiempo de manejo se le suma el colchón y se redondea para arriba', () => {
  // 600 s de manejo = 10 min; con colchón son 12,5; se muestra 15.
  assert.strictEqual(minutosParaMostrar(600), 15);
});

test('nunca promete menos de cinco minutos', () => {
  assert.strictEqual(minutosParaMostrar(0), 5);
  assert.strictEqual(minutosParaMostrar(30), 5);
});

test('sube de a cinco', () => {
  const valores = [300, 600, 900, 1500, 2400].map(minutosParaMostrar);
  valores.forEach((v) =>
    assert.strictEqual(v % 5, 0, `${v} no es múltiplo de 5`),
  );
});

test('con una duración que no es número, no inventa un tiempo', () => {
  assert.strictEqual(minutosParaMostrar(null), null);
  assert.strictEqual(minutosParaMostrar(-5), null);
  assert.strictEqual(minutosParaMostrar('un rato'), null);
});

test('la llegada se guarda como momento y no como minutos', () => {
  // Es lo que permite que el contador de la pantalla baje solo entre cálculos.
  const t = llegadaEstimada(600, AHORA);
  assert.strictEqual(t, AHORA + 15 * 60 * 1000);
});

test('la estimación de respaldo crece con la distancia', () => {
  const cerca = etaAproximada(
    { lat: -31.42, lng: -64.18 },
    { lat: -31.425, lng: -64.18 },
  );
  const lejos = etaAproximada(
    { lat: -31.42, lng: -64.18 },
    { lat: -31.47, lng: -64.18 },
  );
  assert.ok(lejos > cerca);
  // Y siempre da algo: es mejor un número aproximado que ninguno.
  assert.ok(cerca > 0);
});

test('sin los dos extremos no hay estimación de respaldo', () => {
  assert.strictEqual(etaAproximada(null, { lat: 0, lng: 0 }), null);
});
