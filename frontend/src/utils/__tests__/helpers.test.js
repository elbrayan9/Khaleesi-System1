// frontend/src/utils/__tests__/helpers.test.js

import { describe, it, expect } from 'vitest';
import { formatCurrency } from '../helpers';

// 'describe' agrupa tests relacionados. Es como un título para una sección de pruebas.
describe('formatCurrency', () => {

  // 'it' o 'test' define una prueba individual. Describe lo que debería hacer.
  it('debería formatear un número entero a dos decimales', () => {
    // expect(valor_real).toBe(valor_esperado);
    expect(formatCurrency(150)).toBe('150.00');
  });

  it('debería redondear un número con más de dos decimales', () => {
    expect(formatCurrency(80.756)).toBe('80.76');
  });

  it('debería manejar números que ya tienen dos decimales', () => {
    expect(formatCurrency(220.50)).toBe('220.50');
  });

  it('debería manejar el número 0 correctamente', () => {
    expect(formatCurrency(0)).toBe('0.00');
  });

  it('debería devolver "0.00" para entradas no numéricas como null o undefined', () => {
    expect(formatCurrency(null)).toBe('0.00');
    expect(formatCurrency(undefined)).toBe('0.00');
  });
});