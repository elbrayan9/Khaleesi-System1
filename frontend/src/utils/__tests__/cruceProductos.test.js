// El caso que dio origen a esto: se cargó la misma factura dos veces y en vez
// de sumarle stock a los productos que ya estaban, se crearon copias.

import { describe, it, expect } from 'vitest';
import { normalizar, buscarProductoDeRenglon } from '../cruceProductos.js';

const CATALOGO = [
  { id: 'p1', nombre: 'Servidor Blade Rack 2U', codigoBarras: '' },
  { id: 'p2', nombre: 'Coca-Cola 2,25L', codigoBarras: '7790895000997' },
  { id: 'p3', nombre: 'Agua', codigoBarras: '' },
  { id: 'p4', nombre: 'Kit Cableado Estructurado Cat 6A', codigoBarras: '' },
];

describe('buscarProductoDeRenglon', () => {
  it('el código de barras manda, aunque el nombre no se parezca', () => {
    const r = buscarProductoDeRenglon(CATALOGO, {
      nombre: 'GASEOSA COCA 2250 CC',
      codigo: '7790895000997',
    });
    expect(r.id).toBe('p2');
  });

  it('mismo nombre escrito distinto: comas, guiones y mayúsculas', () => {
    expect(
      buscarProductoDeRenglon(CATALOGO, { nombre: 'coca cola 2.25 l' }).id,
    ).toBe('p2');
  });

  it('la segunda lectura se llevó la descripción del renglón', () => {
    // Este es el caso real: la IA transcribió el nombre solo una vez y con la
    // descripción pegada la otra. Son el mismo producto.
    const r = buscarProductoDeRenglon(CATALOGO, {
      nombre: 'Servidor Blade Rack 2U (Procesador 16-Core, 64GB RAM, 2TB SSD)',
    });
    expect(r.id).toBe('p1');
  });

  it('y al revés: el catálogo tiene el largo y la factura el corto', () => {
    const catalogoLargo = [
      { id: 'x', nombre: 'Kit Cableado Estructurado Cat 6A (Bobina 305m)' },
    ];
    const r = buscarProductoDeRenglon(catalogoLargo, {
      nombre: 'Kit Cableado Estructurado Cat 6A',
    });
    expect(r.id).toBe('x');
  });

  it('NO fusiona dos productos distintos que empiezan igual', () => {
    // Fusionar es peor que duplicar: el stock de los dos termina en una sola
    // ficha y ya no hay forma de separarlos. Por eso el piso de 12 caracteres.
    const r = buscarProductoDeRenglon(CATALOGO, { nombre: 'Agua oxigenada' });
    expect(r).toBeUndefined();
  });

  it('tampoco cuando el parecido es solo el final', () => {
    // "Rack 2U" no puede hacer juego con "Servidor Blade Rack 2U".
    const r = buscarProductoDeRenglon(
      [{ id: 'y', nombre: 'Servidor Blade Rack 2U' }],
      { nombre: 'Gabinete Rack 2U' },
    );
    expect(r).toBeUndefined();
  });

  it('un producto que de verdad es nuevo sigue siendo nuevo', () => {
    expect(
      buscarProductoDeRenglon(CATALOGO, { nombre: 'Licencia de Software' }),
    ).toBeUndefined();
  });

  it('aguanta catálogo vacío y renglones sin nombre', () => {
    expect(buscarProductoDeRenglon([], { nombre: 'algo' })).toBeUndefined();
    expect(buscarProductoDeRenglon(CATALOGO, { nombre: '' })).toBeUndefined();
    expect(buscarProductoDeRenglon(undefined, undefined)).toBeUndefined();
  });
});

describe('normalizar', () => {
  it('saca tildes, signos y espacios de más', () => {
    expect(normalizar('  Té  Verde-Orgánico, 500g ')).toBe('te verde organico 500g');
  });
});
