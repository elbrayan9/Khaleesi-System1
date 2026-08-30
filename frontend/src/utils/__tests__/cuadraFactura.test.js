import { describe, it, expect } from 'vitest';
import { cuadraFactura } from '../cuadraFactura.js';

// Los renglones de la factura real que disparó esto: cuatro items de una
// Factura A, subtotal $4.565,00, IVA 21% $958,65, total $5.523,65.
const FACTURA_A = [
  { costo: 1450, cantidad: 2 }, // 2.900
  { costo: 420, cantidad: 1 }, //    420
  { costo: 180, cantidad: 5 }, //    900
  { costo: 115, cantidad: 3 }, //    345
];

describe('cuadraFactura', () => {
  it('una Factura A cierra: los renglones son el subtotal y el total lleva IVA', () => {
    // Este es el caso que hacía saltar la alarma en todas las facturas A, que
    // son justamente las que recibe un responsable inscripto. Un aviso que
    // salta siempre deja de leerse, y el día que el número está mal de verdad
    // tampoco se lee.
    const r = cuadraFactura(FACTURA_A, 5523.65);
    expect(r.cuadra).toBe(true);
    expect(r.suma).toBe(4565);
    expect(Math.round(r.conIva)).toBe(5524);
  });

  it('sin IVA discriminado también cierra', () => {
    // Un monotributista factura el total sin desglosar.
    const r = cuadraFactura(FACTURA_A, 4565);
    expect(r.cuadra).toBe(true);
    expect(r.conIva).toBe(null); // no hay nada que aclarar
  });

  it('con la alícuota reducida del 10,5%', () => {
    expect(cuadraFactura(FACTURA_A, 5044.33).cuadra).toBe(true);
  });

  it('usa el IVA que la IA leyó en cada renglón', () => {
    // Una factura mixta: algo al 21 y algo al 10,5. Ninguna alícuota general
    // sola la explica; el desglose por renglón sí.
    const mixta = [
      { costo: 1000, cantidad: 1, iva: 21 }, // 1.210
      { costo: 1000, cantidad: 1, iva: 10.5 }, // 1.105
    ];
    expect(cuadraFactura(mixta, 2315).cuadra).toBe(true);
  });

  it('avisa cuando un renglón se leyó mal', () => {
    // El caso para el que existe el aviso: 4 unidades donde hay 40. Si no
    // saltara, entrarían 36 unidades de más al stock.
    const malLeida = [
      { costo: 1450, cantidad: 2 },
      { costo: 420, cantidad: 1 },
      { costo: 180, cantidad: 5 },
      { costo: 115, cantidad: 30 }, // eran 3
    ];
    expect(cuadraFactura(malLeida, 5523.65).cuadra).toBe(false);
  });

  it('aguanta el redondeo de centavos', () => {
    expect(cuadraFactura(FACTURA_A, 5523.6).cuadra).toBe(true);
    expect(cuadraFactura(FACTURA_A, 5524).cuadra).toBe(true);
  });

  it('solo cuenta los renglones marcados para incluir', () => {
    // Si el comercio destilda un renglón, la cuenta cambia y el aviso tiene que
    // seguir el criterio de lo que realmente se va a cargar.
    const conDestildado = [...FACTURA_A, { costo: 9999, cantidad: 1, incluir: false }];
    expect(cuadraFactura(conDestildado, 5523.65).cuadra).toBe(true);
  });

  it('sin total leído no inventa una alarma', () => {
    // Callarse es mejor que avisar sobre un dato que no se tiene.
    expect(cuadraFactura(FACTURA_A, 0).cuadra).toBe(true);
    expect(cuadraFactura(FACTURA_A, null).cuadra).toBe(true);
  });

  it('sin renglones tampoco', () => {
    expect(cuadraFactura([], 5523.65).cuadra).toBe(true);
    expect(cuadraFactura(undefined, 5523.65).cuadra).toBe(true);
  });
});
