// Las cuentas del mapa del pedido.
//
// Se prueban acá porque son la parte del seguimiento donde un error no se ve:
// el marcador igual se dibuja, solo que en el lugar equivocado o con un ritmo
// que se siente falso.

import { describe, it, expect } from 'vitest';
import {
  distanciaMetros,
  bearing,
  interpolar,
  estimarIntervalo,
  esPunto,
  INTERVALO_MIN,
  INTERVALO_MAX,
} from '../geo.js';

// Dos esquinas del Obelisco, a una cuadra de distancia.
const OBELISCO = { lat: -34.6037, lng: -58.3816 };

describe('distanciaMetros', () => {
  it('da cero para el mismo punto', () => {
    expect(distanciaMetros(OBELISCO, OBELISCO)).toBe(0);
  });

  it('mide bien un grado de latitud', () => {
    // Un grado de latitud son ~111,2 km en cualquier punto del planeta.
    const d = distanciaMetros({ lat: 0, lng: 0 }, { lat: 1, lng: 0 });
    expect(d).toBeGreaterThan(110000);
    expect(d).toBeLessThan(112000);
  });

  it('mide una cuadra porteña en el orden esperado', () => {
    // Una cuadra son ~110 m; 0.001 grados de latitud son ~111 m.
    const d = distanciaMetros(OBELISCO, {
      lat: OBELISCO.lat + 0.001,
      lng: OBELISCO.lng,
    });
    expect(d).toBeGreaterThan(100);
    expect(d).toBeLessThan(125);
  });

  it('es simétrica', () => {
    const a = OBELISCO;
    const b = { lat: -34.61, lng: -58.37 };
    expect(distanciaMetros(a, b)).toBeCloseTo(distanciaMetros(b, a), 6);
  });

  it('no explota con datos incompletos', () => {
    expect(distanciaMetros(null, OBELISCO)).toBe(0);
    expect(distanciaMetros(OBELISCO, { lat: NaN, lng: 0 })).toBe(0);
  });
});

describe('bearing', () => {
  it('hacia el norte da 0', () => {
    expect(bearing({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(0, 1);
  });

  it('hacia el este da 90', () => {
    expect(bearing({ lat: 0, lng: 0 }, { lat: 0, lng: 1 })).toBeCloseTo(90, 1);
  });

  it('hacia el sur da 180', () => {
    expect(bearing({ lat: 0, lng: 0 }, { lat: -1, lng: 0 })).toBeCloseTo(180, 1);
  });

  it('hacia el oeste da 270', () => {
    expect(bearing({ lat: 0, lng: 0 }, { lat: 0, lng: -1 })).toBeCloseTo(270, 1);
  });

  it('siempre devuelve un ángulo entre 0 y 360', () => {
    const b = bearing({ lat: -34.6, lng: -58.4 }, { lat: -34.7, lng: -58.5 });
    expect(b).toBeGreaterThanOrEqual(0);
    expect(b).toBeLessThan(360);
  });
});

describe('interpolar', () => {
  const a = { lat: 0, lng: 0 };
  const b = { lat: 10, lng: 20 };

  it('en t=0 devuelve el punto de partida', () => {
    expect(interpolar(a, b, 0)).toEqual({ lat: 0, lng: 0 });
  });

  it('en t=1 devuelve el de llegada', () => {
    expect(interpolar(a, b, 1)).toEqual({ lat: 10, lng: 20 });
  });

  it('en t=0.5 devuelve el punto medio', () => {
    expect(interpolar(a, b, 0.5)).toEqual({ lat: 5, lng: 10 });
  });

  it('recorta t fuera del rango, que es lo que pasa si un cuadro llega tarde', () => {
    expect(interpolar(a, b, 1.4)).toEqual({ lat: 10, lng: 20 });
    expect(interpolar(a, b, -2)).toEqual({ lat: 0, lng: 0 });
  });
});

describe('estimarIntervalo', () => {
  it('sin datos usa un valor razonable, no cero', () => {
    // Cero dejaría el marcador saltando, que es justo lo que se quiere evitar.
    const r = estimarIntervalo([]);
    expect(r).toBeGreaterThanOrEqual(INTERVALO_MIN);
    expect(r).toBeLessThanOrEqual(INTERVALO_MAX);
    expect(estimarIntervalo(undefined)).toBe(r);
  });

  it('con un solo dato lo usa', () => {
    expect(estimarIntervalo([8000])).toBe(8000);
  });

  it('toma la mediana y no el promedio', () => {
    // El 60000 es el dato del túnel: con promedio daría 25333 y todas las
    // animaciones siguientes quedarían lentísimas.
    expect(estimarIntervalo([8000, 8000, 60000])).toBe(8000);
  });

  it('mira solo los últimos tres', () => {
    expect(estimarIntervalo([1, 1, 1, 1, 9000, 10000, 11000])).toBe(10000);
  });

  it('nunca baja del mínimo ni pasa del máximo', () => {
    expect(estimarIntervalo([10, 10, 10])).toBe(INTERVALO_MIN);
    expect(estimarIntervalo([999999, 999999])).toBe(INTERVALO_MAX);
  });

  it('descarta basura sin romperse', () => {
    expect(estimarIntervalo([NaN, -5, 0, 9000])).toBe(9000);
  });

  it('con dos datos promedia los del medio', () => {
    expect(estimarIntervalo([8000, 10000])).toBe(9000);
  });
});

describe('esPunto', () => {
  it('acepta un par de coordenadas válido', () => {
    expect(esPunto(OBELISCO)).toBe(true);
    expect(esPunto({ lat: 0, lng: 0 })).toBe(true);
  });

  it('rechaza lo que no sirve para dibujar', () => {
    expect(esPunto(null)).toBe(false);
    expect(esPunto(undefined)).toBe(false);
    expect(esPunto({})).toBe(false);
    expect(esPunto({ lat: -34.6 })).toBe(false);
    expect(esPunto({ lat: null, lng: null })).toBe(false);
    expect(esPunto({ lat: '-34.6', lng: '-58.4' })).toBe(false);
  });
});
