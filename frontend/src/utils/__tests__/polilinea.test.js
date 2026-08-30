// El decodificador de recorridos.
//
// Se prueba contra el ejemplo canónico de la documentación de Google, que es el
// caso de referencia del formato: si esto falla, la línea del mapa sale
// dibujada en cualquier parte del planeta.

import { describe, it, expect } from 'vitest';
import { decodificarPolilinea } from '../polilinea.js';

describe('decodificarPolilinea', () => {
  it('lee el ejemplo de la documentación', () => {
    const puntos = decodificarPolilinea('_p~iF~ps|U_ulLnnqC_mqNvxq`@');
    expect(puntos).toHaveLength(3);
    expect(puntos[0].lat).toBeCloseTo(38.5, 5);
    expect(puntos[0].lng).toBeCloseTo(-120.2, 5);
    expect(puntos[1].lat).toBeCloseTo(40.7, 5);
    expect(puntos[2].lat).toBeCloseTo(43.252, 5);
    expect(puntos[2].lng).toBeCloseTo(-126.453, 5);
  });

  it('con nada devuelve una lista vacía en vez de romper el mapa', () => {
    expect(decodificarPolilinea('')).toEqual([]);
    expect(decodificarPolilinea(null)).toEqual([]);
    expect(decodificarPolilinea(undefined)).toEqual([]);
    expect(decodificarPolilinea(123)).toEqual([]);
  });
});
