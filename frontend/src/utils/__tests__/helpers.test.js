// Cómo se escribe la plata.
//
// Estas pruebas esperaban "150.00", con punto decimal, y quedaron rojas el día
// que formatCurrency pasó a formato argentino. El código estaba bien: acá
// $1.500,50 son mil quinientos con cincuenta, y escribirlo al revés en una
// pantalla de caja hace que alguien cobre mil veces de más o de menos. Lo que
// estaba mal era la prueba, y quedó fallando tanto tiempo que se volvió parte
// del paisaje.

import { describe, it, expect } from 'vitest';
import { formatCurrency } from '../helpers';

describe('formatCurrency', () => {
  it('un entero se escribe con dos decimales', () => {
    expect(formatCurrency(150)).toBe('150,00');
  });

  it('redondea a dos decimales', () => {
    expect(formatCurrency(80.756)).toBe('80,76');
  });

  it('respeta los decimales que ya vienen', () => {
    expect(formatCurrency(220.5)).toBe('220,50');
  });

  it('el cero se escribe entero, no vacío', () => {
    expect(formatCurrency(0)).toBe('0,00');
  });

  it('lo que no es un número se muestra como cero', () => {
    // Nunca "NaN" ni vacío en pantalla: un importe en blanco en la caja se lee
    // como que algo se rompió.
    expect(formatCurrency(null)).toBe('0,00');
    expect(formatCurrency(undefined)).toBe('0,00');
    expect(formatCurrency('cualquier cosa')).toBe('0,00');
  });

  it('los miles van con punto, como se escribe acá', () => {
    // Esto es lo que la prueba vieja no miraba, y es lo que de verdad importa:
    // el separador de miles y el de decimales son distintos, y confundirlos
    // cambia el número por mil.
    expect(formatCurrency(1500.5)).toBe('1.500,50');
    expect(formatCurrency(1234567.89)).toBe('1.234.567,89');
  });

  it('los negativos conservan el signo', () => {
    // Los egresos de caja y los vueltos se muestran en negativo.
    expect(formatCurrency(-350)).toBe('-350,00');
  });
});
