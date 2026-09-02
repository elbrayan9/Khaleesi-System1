// El error que reportó un cliente: cobró por venta rápida y el carrito le
// contó 28 pesos donde iban 28.000.
//
// Los casos de acá no son inventados: son las formas en que se escribe un
// importe cuando el propio sistema te lo viene mostrando como "28.000,00".

import { describe, it, expect } from 'vitest';
import { parseMonto, parseMontoPositivo } from '../monto.js';

describe('parseMonto', () => {
  // ── EL BUG ────────────────────────────────────────────────────────────────
  it('el punto de miles es MIL, no una coma decimal', () => {
    // Esto es lo que cobraba mal: Number('28.000') da 28.
    expect(parseMonto('28.000')).toBe(28000);
    expect(parseMonto('1.000')).toBe(1000);
    expect(parseMonto('2.500')).toBe(2500);
    expect(parseMonto('105.000')).toBe(105000);
  });

  it('varios grupos de miles', () => {
    expect(parseMonto('1.234.567')).toBe(1234567);
    expect(parseMonto('12.500.000')).toBe(12500000);
  });

  // ── LO QUE NO HAY QUE ROMPER ──────────────────────────────────────────────
  it('un punto con uno o dos dígitos sigue siendo decimal', () => {
    // Es el propio ejemplo del campo: "Ej: 550.50".
    expect(parseMonto('550.50')).toBe(550.5);
    expect(parseMonto('550.5')).toBe(550.5);
    expect(parseMonto('0.99')).toBe(0.99);
  });

  it('un número pelado no cambia', () => {
    expect(parseMonto('1500')).toBe(1500);
    expect(parseMonto('0')).toBe(0);
    expect(parseMonto(2500)).toBe(2500);
  });

  // ── LA COMA, QUE ANTES EL NAVEGADOR RECHAZABA ─────────────────────────────
  it('la coma decimal, que es como lo muestra el sistema', () => {
    expect(parseMonto('550,50')).toBe(550.5);
    expect(parseMonto('28.000,50')).toBe(28000.5);
    expect(parseMonto('1.234.567,89')).toBe(1234567.89);
  });

  it('el formato en inglés, que llega copiado de otros sistemas', () => {
    expect(parseMonto('1,234.56')).toBe(1234.56);
    expect(parseMonto('1,234,567')).toBe(1234567);
  });

  // ── LO QUE LLEGA PEGADO ───────────────────────────────────────────────────
  it('el signo y los espacios de un copiar/pegar', () => {
    expect(parseMonto('$ 28.000')).toBe(28000);
    expect(parseMonto('  1.500,25  ')).toBe(1500.25);
    expect(parseMonto('ARS 999')).toBe(999);
  });

  it('los negativos, que existen en los movimientos de caja', () => {
    expect(parseMonto('-1.500')).toBe(-1500);
    expect(parseMonto('-550,50')).toBe(-550.5);
  });

  // ── VACÍO NO ES CERO ──────────────────────────────────────────────────────
  it('devuelve null cuando no hay monto, para poder distinguirlo del 0', () => {
    expect(parseMonto('')).toBeNull();
    expect(parseMonto('   ')).toBeNull();
    expect(parseMonto('abc')).toBeNull();
    expect(parseMonto('$')).toBeNull();
    expect(parseMonto(null)).toBeNull();
    expect(parseMonto(undefined)).toBeNull();
    expect(parseMonto(NaN)).toBeNull();
  });
});

describe('parseMontoPositivo', () => {
  it('deja pasar los montos que se pueden cobrar', () => {
    expect(parseMontoPositivo('28.000')).toBe(28000);
    expect(parseMontoPositivo('0,01')).toBe(0.01);
  });

  it('rechaza el cero y los negativos', () => {
    expect(parseMontoPositivo('0')).toBeNull();
    expect(parseMontoPositivo('-100')).toBeNull();
    expect(parseMontoPositivo('')).toBeNull();
  });
});
