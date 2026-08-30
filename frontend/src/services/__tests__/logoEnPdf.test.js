// El logo del negocio tiene que salir en la factura.
//
// Brian subió el logo y la factura salía sin él. La causa era que el PDF iba a
// buscarlo a Storage con un fetch en el momento de imprimir: si ese pedido
// falla —por la descarga cruzada, por App Check o porque no hay señal— el
// comprobante salía igual pero pelado, y el error se tragaba en un catch.
//
// Estas pruebas fijan las dos garantías que evitan que vuelva a pasar:
// la copia incrustada se usa sin tocar la red, y una descarga que falla nunca
// impide emitir el comprobante.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Un JPEG de 1x1 real: sirve como logo cargado.
const LOGO_1PX =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==';

// jsPDF y autoTable no se usan acá: lo que se prueba es de dónde sale el logo,
// no cómo se dibuja.
vi.mock('jspdf', () => ({ default: vi.fn() }));
vi.mock('jspdf-autotable', () => ({ default: vi.fn() }));
vi.mock('qrcode', () => ({ default: { toDataURL: vi.fn() } }));
vi.mock('../storageService', () => ({ subirComprobantePdf: vi.fn() }));

describe('el logo del negocio en los comprobantes', () => {
  beforeEach(() => {
    // Image no existe en el entorno de prueba: se resuelve al instante con un
    // tamaño cualquiera, que es lo único que el PDF necesita para la
    // proporción.
    global.Image = class {
      set src(_v) {
        this.naturalWidth = 200;
        this.naturalHeight = 100;
        setTimeout(() => this.onload?.(), 0);
      }
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('usa la copia incrustada sin pedirle nada a la red', async () => {
    const fetchEspia = vi.fn();
    global.fetch = fetchEspia;

    const { __cargarLogoParaPdf } = await import('../pdfService.js');
    const logo = await __cargarLogoParaPdf({
      logoDataUrl: LOGO_1PX,
      logoUrl: 'https://firebasestorage.googleapis.com/algo.jpg',
    });

    expect(logo.dataUrl).toBe(LOGO_1PX);
    // Lo importante: aunque haya URL de Storage, no se sale a buscarla.
    expect(fetchEspia).not.toHaveBeenCalled();
  });

  it('avisa cuando Storage rechaza la descarga, en vez de quedarse callado', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 403 });

    const { __cargarLogoParaPdf } = await import('../pdfService.js');

    await expect(
      __cargarLogoParaPdf({ logoUrl: 'https://firebasestorage.googleapis.com/x.jpg' }),
    ).rejects.toThrow('403');
  });

  it('no devuelve nada si el negocio todavía no cargó ningún logo', async () => {
    const fetchEspia = vi.fn();
    global.fetch = fetchEspia;

    const { __cargarLogoParaPdf } = await import('../pdfService.js');

    expect(await __cargarLogoParaPdf({})).toBeNull();
    expect(await __cargarLogoParaPdf(undefined)).toBeNull();
    expect(fetchEspia).not.toHaveBeenCalled();
  });
});
