// Dónde cae el logo dentro de la factura.
//
// Con el logo puesto, el encabezado salía apretado: el logo bajaba hasta la
// línea de "Razón Social" y se le encimaba, y arrancaba tres milímetros más a
// la izquierda que el resto del texto, así que la columna se veía torcida.
//
// En vez de mirar el PDF a ojo, se anota dónde dibuja cada elemento y se
// comprueba la geometría. jsPDF define sus métodos en la instancia y no en el
// prototipo, así que se reemplaza entero por un doble que registra.

import { describe, it, expect, vi, beforeEach } from 'vitest';

const LOGO =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJ/9k=';

// Lo que el PDF fue dibujando, en milímetros.
const dibujo = { imagenes: [], textos: [] };

vi.mock('jspdf', () => {
  class DobleJsPDF {
    constructor() {
      this.internal = {
        pageSize: { width: 210, height: 297 },
        getNumberOfPages: () => 1,
      };
      this.tam = 12;
    }
    setFontSize(t) {
      this.tam = t;
      return this;
    }
    getFontSize() {
      return this.tam;
    }
    // Ancho aproximado en mm: suficiente para probar que el nombre se achica
    // cuando no entra.
    getTextWidth(txt) {
      return String(txt).length * this.tam * 0.3527 * 0.52;
    }
    addImage(data, fmt, x, y, w, h) {
      dibujo.imagenes.push({ x, y, w, h });
      return this;
    }
    text(txt, x, y) {
      const lineas = Array.isArray(txt) ? txt.map(String) : [String(txt)];
      dibujo.textos.push({ t: lineas.join(' '), lineas, x, y, tam: this.tam });
      return this;
    }
    // Parte por palabras igual que jsPDF, para que el test vea el mismo
    // resultado que el PDF real.
    splitTextToSize(txt, ancho) {
      const palabras = String(txt).split(' ');
      const lineas = [];
      let actual = '';
      for (const p of palabras) {
        const prueba = actual ? `${actual} ${p}` : p;
        if (this.getTextWidth(prueba) > ancho && actual) {
          lineas.push(actual);
          actual = p;
        } else {
          actual = prueba;
        }
      }
      if (actual) lineas.push(actual);
      return lineas;
    }
    setFont() {
      return this;
    }
    setLineWidth() {
      return this;
    }
    setDrawColor() {
      return this;
    }
    setFillColor() {
      return this;
    }
    setTextColor() {
      return this;
    }
    rect() {
      return this;
    }
    line() {
      return this;
    }
    roundedRect() {
      return this;
    }
    addPage() {
      return this;
    }
    setPage() {
      return this;
    }
    save() {
      return this;
    }
    output() {
      return new Blob();
    }
    getImageProperties() {
      return { width: 100, height: 100 };
    }
  }
  return { default: DobleJsPDF };
});

vi.mock('jspdf-autotable', () => ({
  default: (doc) => {
    doc.lastAutoTable = { finalY: 150 };
  },
}));
vi.mock('qrcode', () => ({
  default: { toDataURL: vi.fn().mockResolvedValue(LOGO) },
}));
vi.mock('../storageService', () => ({ subirComprobantePdf: vi.fn() }));

const negocio = (extra) => ({
  nombre: 'Florencia Mariel Loyola',
  direccion: 'Av. Velez Sarsfield 294, Barrio Centro Sur C.P.: 5000 Cordoba',
  cuit: '27393259006',
  condicionIva: 'Responsable Monotributo',
  puntoVenta: 2,
  ingresosBrutos: 'EXENTO',
  inicioActividades: '01/01/2024',
  ...extra,
});

const venta = {
  id: 'x1',
  fecha: '30/08/2026',
  total: 1,
  items: [
    { id: 'p1', nombre: 'Talco para Pies Rexona', cantidad: 1, precio: 1 },
  ],
  metodoPago: 'efectivo',
  afipData: {
    cae: '86360562869073',
    vencimientoCae: '09/09/2026',
    cbteTipo: 11,
  },
};

const cliente = { nombre: 'Consumidor Final' };

async function facturar(datosNegocio) {
  dibujo.imagenes = [];
  dibujo.textos = [];
  const { generarPdfVenta } = await import('../pdfService.js');
  await generarPdfVenta(venta, datosNegocio, cliente, 'Factura C', 'blob');
  return {
    // El QR de ARCA tambien es una imagen: el logo es el del encabezado.
    logo: dibujo.imagenes.find((i) => i.y < 40),
    texto: (t) => dibujo.textos.find((x) => x.t === t),
    contiene: (t) => dibujo.textos.find((x) => x.t.includes(t)),
  };
}

describe('el logo en el encabezado de la factura', () => {
  beforeEach(() => {
    global.Image = class {
      set src(_v) {
        // Un logo cuadrado, que es el caso que se encimaba.
        this.naturalWidth = 512;
        this.naturalHeight = 512;
        setTimeout(() => this.onload?.(), 0);
      }
    };
    vi.resetModules();
  });

  it('no se encima con los datos del emisor', async () => {
    const f = await facturar(negocio({ logoDataUrl: LOGO }));
    const razon = f.texto('Razón Social:');

    expect(f.logo).toBeDefined();
    expect(razon).toBeDefined();

    const baseLogo = f.logo.y + f.logo.h;
    // El texto de 9pt se levanta unos 3.2mm por encima de su línea de base.
    const topeRazon = razon.y - 3.2;
    expect(baseLogo).toBeLessThanOrEqual(topeRazon);
  });

  it('arranca en la misma columna que el texto de abajo', async () => {
    const f = await facturar(negocio({ logoDataUrl: LOGO }));
    expect(f.logo.x).toBeCloseTo(f.texto('Razón Social:').x, 1);
  });

  it('deja el nombre dentro de su mitad, sin cruzar la letra del comprobante', async () => {
    // Un nombre largo con el logo al lado: el caso que se iba de la columna.
    const f = await facturar(
      negocio({
        logoDataUrl: LOGO,
        nombre: 'Distribuidora Mayorista San Cayetano del Norte',
      }),
    );
    const nombre = f.contiene('Distribuidora');
    // Ningún renglón cruza la línea divisoria (105 - 15/2 = 97.5mm).
    const anchoDe = (l) => l.length * nombre.tam * 0.3527 * 0.52;
    const masLargo = Math.max(...nombre.lineas.map(anchoDe));
    expect(nombre.x + masLargo).toBeLessThanOrEqual(97.5);
    // Se achicó y encima hizo falta partirlo.
    expect(nombre.tam).toBeLessThan(18);
    expect(nombre.lineas.length).toBeGreaterThan(1);
  });

  it('sin logo, el encabezado queda como estaba', async () => {
    const f = await facturar(negocio({}));
    const nombre = f.contiene('Florencia');
    expect(f.logo).toBeUndefined();
    expect(nombre.x).toBe(15); // margin + 5
    expect(nombre.tam).toBe(18);
  });

  it('el logo no se sale de la caja del encabezado', async () => {
    const f = await facturar(negocio({ logoDataUrl: LOGO }));
    expect(f.logo.y).toBeGreaterThanOrEqual(10);
    expect(f.logo.y + f.logo.h).toBeLessThanOrEqual(60);
  });
});
