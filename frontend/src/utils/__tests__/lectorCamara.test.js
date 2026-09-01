// Por qué el escáner andaba en iPhone y no en Android.
//
// El iPhone expone UNA cámara trasera lógica. Android expone la principal, la
// gran angular, a veces una macro y hasta el sensor de profundidad, todas como
// si fueran cámaras comunes. `facingMode: environment` devuelve cualquiera, y
// si toca la gran angular —que enfoca recién a medio metro— las barras de un
// código a 20 cm quedan borrosas y no se leen nunca.

import { describe, it, expect } from 'vitest';
import { elegirCamara, restricciones, nombreDeCamara } from '../lectorCamara.js';

const cam = (label, deviceId) => ({ kind: 'videoinput', label, deviceId });

describe('elegirCamara', () => {
  it('evita la gran angular de un Android', () => {
    // El caso real de un Samsung: la gran angular aparece primera y el
    // navegador la elegía sola.
    const r = elegirCamara([
      cam('camera2 2, facing back (ultra wide)', 'ultra'),
      cam('camera2 0, facing back', 'principal'),
      cam('camera2 1, facing front', 'frente'),
    ]);
    expect(r).toBe('principal');
  });

  it('descarta macro, profundidad y teleobjetivo', () => {
    expect(
      elegirCamara([
        cam('Cámara trasera macro', 'macro'),
        cam('Cámara trasera de profundidad', 'depth'),
        cam('Cámara trasera', 'buena'),
      ]),
    ).toBe('buena');
  });

  it('no agarra la frontal aunque esté primera', () => {
    expect(
      elegirCamara([
        cam('Cámara frontal', 'frente'),
        cam('Cámara trasera', 'atras'),
      ]),
    ).toBe('atras');
  });

  it('en un iPhone, con una sola trasera, la elige', () => {
    expect(
      elegirCamara([
        cam('Front Camera', 'f'),
        cam('Back Camera', 'b'),
      ]),
    ).toBe('b');
  });

  it('si TODAS son lentes raras, agarra la primera trasera igual', () => {
    // Peor tener una cámara mala que ninguna: sin esto la pantalla queda negra.
    expect(
      elegirCamara([cam('Back ultra wide', 'uw'), cam('Front', 'f')]),
    ).toBe('uw');
  });

  it('sin permiso todavía, no decide nada', () => {
    // Los navegadores devuelven los nombres vacíos hasta que se da permiso.
    // Ahí hay que arrancar por facingMode, no adivinar.
    expect(elegirCamara([cam('', 'a'), cam('', 'b')])).toBeUndefined();
    expect(elegirCamara([])).toBeUndefined();
    expect(elegirCamara(undefined)).toBeUndefined();
  });

  it('ignora micrófonos y parlantes', () => {
    expect(
      elegirCamara([
        { kind: 'audioinput', label: 'Micrófono', deviceId: 'mic' },
        cam('Cámara trasera', 'cam'),
      ]),
    ).toBe('cam');
  });
});

describe('restricciones', () => {
  it('pide 1280x720: con menos, un EAN-13 no se resuelve', () => {
    const r = restricciones();
    expect(r.video.width).toEqual({ ideal: 1280 });
    expect(r.video.height).toEqual({ ideal: 720 });
  });

  it('van como ideal y no como exact', () => {
    // Con `exact`, un teléfono viejo que no llega a 720p no abre la cámara y
    // la persona ve una pantalla negra sin explicación.
    const r = restricciones();
    expect(r.video.width.exact).toBeUndefined();
  });

  it('pide enfoque continuo, que es lo que Android no hace solo', () => {
    expect(restricciones().video.advanced).toEqual([
      { focusMode: 'continuous' },
    ]);
  });

  it('con una cámara elegida, la fija; sin ninguna, cae en facingMode', () => {
    expect(restricciones('abc').video.deviceId).toEqual({ exact: 'abc' });
    expect(restricciones('abc').video.facingMode).toBeUndefined();
    expect(restricciones().video.facingMode).toEqual({ ideal: 'environment' });
  });
});

describe('nombreDeCamara', () => {
  it('avisa cuál no sirve de cerca, para que no la elijan', () => {
    expect(nombreDeCamara(cam('Back ultra wide', 'x'), 0)).toContain(
      'no sirve de cerca',
    );
  });

  it('sin nombre, la numera', () => {
    expect(nombreDeCamara(cam('', 'x'), 2)).toBe('Cámara 3');
  });
});
