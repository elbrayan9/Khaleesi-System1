// El botón "Limpiar Duplicados" decía que no había duplicados justo cuando el
// catálogo tenía cuatro productos repetidos a la vista.

import { describe, it, expect } from 'vitest';
import { buscarDuplicados, resumenDuplicados } from '../duplicados.js';

describe('buscarDuplicados', () => {
  it('encuentra los repetidos SIN código de barras', () => {
    // El caso real: una factura de proveedor cargada dos veces. Esos productos
    // se crean sin EAN porque el proveedor factura con su código interno, y el
    // agrupado viejo —solo por código— los salteaba a todos.
    const catalogo = [
      { id: 'a', nombre: 'Servidor Blade Rack 2U', stock: 2 },
      { id: 'b', nombre: 'Servidor Blade Rack 2U', stock: 2 },
      { id: 'c', nombre: 'Switch Gigabit', stock: 1 },
    ];
    const { aEliminar, grupos } = buscarDuplicados(catalogo);
    expect(aEliminar).toHaveLength(1);
    expect(grupos[0].por).toBe('nombre');
  });

  it('sigue encontrando los repetidos por código de barras', () => {
    const catalogo = [
      { id: 'a', nombre: 'Coca 2.25', codigoBarras: '779', stock: 5 },
      { id: 'b', nombre: 'Coca Cola 2,25', codigoBarras: '779', stock: 12 },
    ];
    const { aEliminar, grupos } = buscarDuplicados(catalogo);
    expect(aEliminar).toEqual(['a']); // gana el de más stock
    expect(grupos[0].conserva.id).toBe('b');
    expect(grupos[0].por).toBe('codigo');
  });

  it('conserva el de mayor stock', () => {
    const catalogo = [
      { id: 'a', nombre: 'Agua', stock: 3 },
      { id: 'b', nombre: 'Agua', stock: 40 },
      { id: 'c', nombre: 'Agua', stock: 0 },
    ];
    const { aEliminar } = buscarDuplicados(catalogo);
    expect(aEliminar).toHaveLength(2);
    expect(aEliminar).not.toContain('b');
  });

  it('a igual stock, conserva el más reciente', () => {
    const catalogo = [
      { id: 'viejo', nombre: 'Agua', stock: 5, lastUpdated: { seconds: 100 } },
      { id: 'nuevo', nombre: 'Agua', stock: 5, lastUpdated: { seconds: 900 } },
    ];
    expect(buscarDuplicados(catalogo).aEliminar).toEqual(['viejo']);
  });

  it('el nombre se compara sin tildes, mayúsculas ni signos', () => {
    const catalogo = [
      { id: 'a', nombre: 'Café Molido, 500g', stock: 1 },
      { id: 'b', nombre: 'cafe molido 500g', stock: 2 },
    ];
    expect(buscarDuplicados(catalogo).aEliminar).toEqual(['a']);
  });

  it('NO junta dos productos con códigos de barras distintos', () => {
    // Aunque se llamen parecido: el EAN es la verdad y dice que son dos cosas.
    const catalogo = [
      { id: 'a', nombre: 'Coca 2.25', codigoBarras: '111', stock: 1 },
      { id: 'b', nombre: 'Coca 2.25', codigoBarras: '222', stock: 1 },
    ];
    expect(buscarDuplicados(catalogo).aEliminar).toHaveLength(0);
  });

  it('no toca un producto con código contra uno sin código', () => {
    // Que uno tenga EAN y el otro no puede ser a propósito: el suelto y el
    // envasado del mismo producto, por ejemplo.
    const catalogo = [
      { id: 'a', nombre: 'Queso', codigoBarras: '111', stock: 1 },
      { id: 'b', nombre: 'Queso', stock: 1 },
    ];
    expect(buscarDuplicados(catalogo).aEliminar).toHaveLength(0);
  });

  it('un producto sin nombre ni código no se considera duplicado de nada', () => {
    const catalogo = [
      { id: 'a', nombre: '', stock: 1 },
      { id: 'b', nombre: '', stock: 1 },
    ];
    expect(buscarDuplicados(catalogo).aEliminar).toHaveLength(0);
  });

  it('un catálogo sin repetidos no devuelve nada', () => {
    const catalogo = [
      { id: 'a', nombre: 'Agua', stock: 1 },
      { id: 'b', nombre: 'Pan', stock: 1 },
    ];
    expect(buscarDuplicados(catalogo).aEliminar).toHaveLength(0);
  });

  it('aguanta que no haya catálogo', () => {
    expect(buscarDuplicados(undefined).aEliminar).toEqual([]);
    expect(buscarDuplicados([]).grupos).toEqual([]);
  });
});

describe('resumenDuplicados', () => {
  it('nombra los productos, no solo los cuenta', () => {
    // Borrar fichas del catálogo no se deshace: un número suelto no alcanza
    // para decidir.
    const grupos = [
      { conserva: { nombre: 'Agua' }, borra: [{}] },
      { conserva: { nombre: 'Pan' }, borra: [{}, {}] },
    ];
    const texto = resumenDuplicados(grupos);
    expect(texto).toContain('Agua (2 fichas)');
    expect(texto).toContain('Pan (3 fichas)');
  });

  it('con muchos, corta y dice cuántos faltan', () => {
    const grupos = Array.from({ length: 10 }, (_, i) => ({
      conserva: { nombre: `P${i}` },
      borra: [{}],
    }));
    expect(resumenDuplicados(grupos, 6)).toContain('y 4 más');
  });
});
