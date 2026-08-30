// Todas las formas en que alguien carga el mismo celular.
//
// El caso que importa: si el número queda mal armado, wa.me no falla — abre un
// chat con un contacto que no existe. El comprobante no llega y nadie se
// entera. Por eso las variantes de acá son las que se ven en la vida real, no
// casos inventados.

import { describe, it, expect } from 'vitest';
import { telefonoWhatsapp } from '../telefono.js';

describe('telefonoWhatsapp', () => {
  // Un celular de Córdoba, escrito de las cinco maneras que llegan al campo.
  const CORDOBA = '5493517694103';

  it('el formato que pide el formulario', () => {
    expect(telefonoWhatsapp('3517694103')).toBe(CORDOBA);
    expect(telefonoWhatsapp('3517 69-4103')).toBe(CORDOBA);
  });

  it('con el 0 de larga distancia, como está en la agenda', () => {
    expect(telefonoWhatsapp('03517694103')).toBe(CORDOBA);
  });

  it('con 0 y 15, que es como lo dicta la mayoría de la gente', () => {
    expect(telefonoWhatsapp('0351 15 769-4103')).toBe(CORDOBA);
  });

  it('copiado de un contacto del teléfono', () => {
    expect(telefonoWhatsapp('+54 9 351 769-4103')).toBe(CORDOBA);
  });

  it('con código de país pero sin el 9: se lo agrega', () => {
    // Sin el 9, wa.me apunta a una línea fija y el mensaje no llega.
    expect(telefonoWhatsapp('54 351 769-4103')).toBe(CORDOBA);
  });

  it('característica de 2 dígitos (Buenos Aires) con 15', () => {
    expect(telefonoWhatsapp('011 15 6941-0300')).toBe('5491169410300');
  });

  it('característica de 4 dígitos (interior) con 15', () => {
    expect(telefonoWhatsapp('02954 15 694103')).toBe('5492954694103');
  });

  it('un 15 que es parte del número no se toca', () => {
    // 351 6941503: el "15" está adentro del abonado, no es el prefijo. La
    // cuenta de dígitos es lo que los distingue: acá son 10, no 12.
    expect(telefonoWhatsapp('3516941503')).toBe('5493516941503');
  });

  it('sin teléfono devuelve null, para que la pantalla avise', () => {
    // Devolver una cadena vacía armaría https://wa.me/?text=... , que abre
    // WhatsApp sin destinatario: parece que anduvo y no se mandó nada.
    expect(telefonoWhatsapp('')).toBe(null);
    expect(telefonoWhatsapp(null)).toBe(null);
    expect(telefonoWhatsapp(undefined)).toBe(null);
    expect(telefonoWhatsapp('sin número')).toBe(null);
  });

  it('no rompe lo que ya estaba bien guardado', () => {
    expect(telefonoWhatsapp('5493517694103')).toBe(CORDOBA);
  });
});
