// Qué pasa al aplicar una factura al inventario.
//
// No prueba que la IA lea bien la foto —eso depende del papel—, sino lo de
// después, que es donde se perdía mercadería: el stock se sumaba leyendo el
// valor actual y escribiendo la suma desde el navegador, y el pedido se anotaba
// al final. Dos personas cargando facturas a la vez leían el mismo stock viejo
// y la segunda pisaba a la primera, sin dejar rastro.
//
// La lectura de la factura se reemplaza por una respuesta fija, y desde ahí se
// maneja la pantalla como la maneja una persona: revisar y aplicar.

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// El orden real de las escrituras, que es lo que se quiere fijar.
const orden = [];

vi.mock('../../services/firestoreService', () => ({
  addProducto: vi.fn(async (uid, data) => {
    orden.push(['addProducto', data]);
    return 'prod-nuevo';
  }),
  updateProducto: vi.fn(async (id, data) => {
    orden.push(['updateProducto', { id, ...data }]);
    return true;
  }),
  addPedido: vi.fn(async (uid, data) => {
    orden.push(['addPedido', data]);
    return 'pedido-1';
  }),
  recibirPedidoYActualizarStock: vi.fn(async (pedido) => {
    orden.push(['recibirPedido', pedido]);
    return true;
  }),
}));

const mostrarMensaje = vi.fn();

vi.mock('../../context/AppContext.jsx', () => ({
  useAppContext: () => ({
    productos: [
      {
        id: 'prod-viejo',
        nombre: 'Coca 2.25',
        codigoBarras: '',
        stock: 5,
        costo: 1000,
        precio: 1400,
      },
    ],
    proveedores: [],
    currentUser: { uid: 'u1' },
    sucursalActual: { id: 'suc1' },
    mostrarMensaje,
  }),
}));

vi.mock('../../utils/image.js', () => ({
  resizeImage: async (file) => file,
}));

// La respuesta de la Cloud Function que lee la factura: un producto que el
// comercio ya tiene y uno que no.
const RESPUESTA = {
  data: {
    proveedor: { nombre: 'Distribuidora Sur', comprobante: 'A-0001-00012345' },
    items: [
      {
        nombre: 'Coca 2.25',
        codigo: '7790895000997',
        cantidad: 12,
        costo: 1100,
      },
      { nombre: 'Galletitas Sur', codigo: '', cantidad: 6, costo: 500 },
    ],
  },
};

// Lo que se le manda a la Cloud Function, que es lo que distingue a los tres
// formatos.
const enviado = [];

vi.mock('firebase/functions', () => ({
  getFunctions: () => ({}),
  httpsCallable: () => async (payload) => {
    enviado.push(payload);
    return RESPUESTA;
  },
}));

// La planilla la convierte a texto el navegador, no el modelo.
vi.mock('xlsx', () => ({
  read: () => ({ SheetNames: ['Detalle'], Sheets: { Detalle: {} } }),
  utils: { sheet_to_csv: () => 'nombre,cantidad,costo\nCoca 2.25,12,1100' },
}));

import CargarFacturaModal from '../CargarFacturaModal.jsx';

/** Sube un archivo y espera a que aparezca la pantalla de revisar. */
async function llegarARevisar(
  archivo = new File(['x'], 'factura.jpg', { type: 'image/jpeg' }),
) {
  const { container } = render(<CargarFacturaModal onClose={() => {}} />);
  const input = container.querySelector('input[type="file"]');
  fireEvent.change(input, { target: { files: [archivo] } });
  await screen.findByText(/Aplicar al inventario/i);
}

/** Aplica y espera a que terminen las escrituras. */
async function aplicar() {
  fireEvent.click(screen.getByText(/Aplicar al inventario/i));
  await waitFor(() =>
    expect(orden.some(([q]) => q === 'recibirPedido')).toBe(true),
  );
}

describe('aplicar una factura al inventario', () => {
  beforeEach(() => {
    orden.length = 0;
    enviado.length = 0;
    vi.clearAllMocks();
  });

  it('el pedido se anota ANTES de que se mueva el stock', async () => {
    // Si se anotara después, un fallo a mitad de camino dejaría stock sumado sin
    // nada que explique de dónde salió ni forma de revertirlo.
    await llegarARevisar();
    await aplicar();

    const iPedido = orden.findIndex(([q]) => q === 'addPedido');
    const iStock = orden.findIndex(([q]) => q === 'recibirPedido');
    expect(iPedido).toBeGreaterThanOrEqual(0);
    expect(iStock).toBeGreaterThan(iPedido);
  });

  it('el producto nuevo nace en cero, así el lote no duplica las unidades', async () => {
    // Si naciera con las 6 unidades de la factura, el increment() posterior
    // sumaría otras 6: entraría el doble de lo que llegó.
    await llegarARevisar();
    await aplicar();

    const [, creado] = orden.find(([q]) => q === 'addProducto');
    expect(creado.stock).toBe(0);

    const [, pedido] = orden.find(([q]) => q === 'recibirPedido');
    const renglon = pedido.items.find((i) => i.productoId === 'prod-nuevo');
    expect(renglon.cantidad).toBe(6);
  });

  it('el stock del producto que ya existía no se escribe a mano', async () => {
    // Esta es la que importa: sumar leyendo y escribiendo es lo que hacía que
    // dos cargas simultáneas se pisaran. El stock sale del lote con increment(),
    // nunca de un updateProducto.
    await llegarARevisar();
    await aplicar();

    const escrituras = orden
      .filter(([q]) => q === 'updateProducto' || q === 'addProducto')
      .map(([, d]) => d);
    escrituras.forEach((d) => {
      if ('stock' in d) expect(d.stock).toBe(0);
    });

    const [, pedido] = orden.find(([q]) => q === 'recibirPedido');
    const renglon = pedido.items.find((i) => i.productoId === 'prod-viejo');
    expect(renglon.cantidad).toBe(12);
  });

  it('al producto que ya existía se le completa el código de barras que le faltaba', async () => {
    // Es lo que después permite escanearlo en la caja. Va aparte del stock
    // porque no es una suma: escribir el mismo código dos veces da lo mismo.
    await llegarARevisar();
    await aplicar();

    const codigo = orden.find(
      ([q, d]) => q === 'updateProducto' && d.id === 'prod-viejo',
    );
    expect(codigo[1].codigoBarras).toBe('7790895000997');
    expect(codigo[1].stock).toBeUndefined();
  });
});

// Una factura llega de tres formas: el proveedor manda un PDF por mail, manda
// una planilla, o el comercio le saca una foto al papel. Cada una tiene que
// tomar su camino, porque tratarlas igual las rompe: achicar un PDF como si
// fuera una imagen lo destruye, y mandar una planilla como archivo obliga a
// inventarle un formato que no tiene.
describe('de qué formas se puede subir una factura', () => {
  beforeEach(() => {
    orden.length = 0;
    enviado.length = 0;
    vi.clearAllMocks();
  });

  it('la foto se achica antes de mandarla', async () => {
    // Una foto de celular moderno pesa varios megas y no hace falta tanto para
    // leer un renglón.
    await llegarARevisar(
      new File(['x'], 'factura.jpg', { type: 'image/jpeg' }),
    );
    expect(enviado[0].mimeType).toBe('image/jpeg');
    expect(enviado[0].imageBase64).toBeTruthy();
  });

  it('el PDF viaja tal cual, sin pasar por el achicado de imágenes', async () => {
    // Es lo que el proveedor manda por mail y suele salir mejor que cualquier
    // foto, porque el texto ya es texto. resizeImage espera una imagen: pasarle
    // un PDF lo arruinaría.
    await llegarARevisar(
      new File(['%PDF'], 'factura.pdf', {
        type: 'application/pdf',
      }),
    );
    expect(enviado[0].mimeType).toBe('application/pdf');
    expect(enviado[0].texto).toBeUndefined();
  });

  it('la planilla viaja como texto, no como archivo', async () => {
    // Son celdas: no hay nada que mirar. Se convierten acá y encima viajan
    // muchísimo más livianas.
    await llegarARevisar(new File(['x'], 'remito.xlsx', { type: '' }));
    expect(enviado[0].texto).toContain('Coca 2.25');
    expect(enviado[0].imageBase64).toBeUndefined();
  });

  it('un CSV se trata como planilla aunque el navegador no le ponga tipo', async () => {
    // Windows manda .csv con type vacío bastante seguido; por eso también se
    // mira la extensión del nombre.
    await llegarARevisar(new File(['x'], 'remito.csv', { type: '' }));
    expect(enviado[0].texto).toBeTruthy();
  });
});
