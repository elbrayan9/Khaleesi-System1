// El modo cajero pasó de ser un dato suelto en el menú a algo que varias
// pantallas consultan para tapar los importes. Estas pruebas fijan lo que esas
// pantallas dan por sentado.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  estaEnModoCajero,
  setModoCajero,
  getPinCajero,
  setPinCajero,
  alCambiarModoCajero,
} from '../modoCajero.js';

describe('modoCajero', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('arranca apagado', () => {
    expect(estaEnModoCajero()).toBe(false);
  });

  it('se prende y se apaga', () => {
    setModoCajero(true);
    expect(estaEnModoCajero()).toBe(true);
    setModoCajero(false);
    expect(estaEnModoCajero()).toBe(false);
  });

  it('sobrevive a recargar la página', () => {
    // Guardar en localStorage no es un detalle: si viviera en memoria, apretar
    // F5 sacaría a cualquiera del modo cajero.
    setModoCajero(true);
    expect(localStorage.getItem('modoCajero')).toBe('1');
  });

  it('avisa a quien esté escuchando, en la misma pestaña', () => {
    // El evento `storage` del navegador solo llega a las OTRAS pestañas. Sin un
    // evento propio, Reportes se enteraría del cambio recién al recargar y
    // mientras tanto seguiría mostrando los importes.
    const escucha = vi.fn();
    const desuscribir = alCambiarModoCajero(escucha);

    setModoCajero(true);
    expect(escucha).toHaveBeenCalledWith(true);

    setModoCajero(false);
    expect(escucha).toHaveBeenLastCalledWith(false);

    desuscribir();
    setModoCajero(true);
    expect(escucha).toHaveBeenCalledTimes(2); // ya no escucha
  });

  it('el PIN se guarda y se lee', () => {
    expect(getPinCajero()).toBe('');
    setPinCajero('1234');
    expect(getPinCajero()).toBe('1234');
  });

  it('sin almacenamiento no explota: se comporta como apagado', () => {
    // Una ventana privada o un navegador con las cookies bloqueadas hacen que
    // localStorage tire error al leerlo. Que la pantalla se caiga por eso sería
    // peor que no tener el modo.
    const original = Object.getOwnPropertyDescriptor(
      window,
      'localStorage',
    );
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('bloqueado');
      },
    });

    expect(() => estaEnModoCajero()).not.toThrow();
    expect(estaEnModoCajero()).toBe(false);
    expect(getPinCajero()).toBe('');
    expect(() => setModoCajero(true)).not.toThrow();

    Object.defineProperty(window, 'localStorage', original);
  });
});
