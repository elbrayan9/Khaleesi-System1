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
      { nombre: 'Coca 2.25', codigo: '7790895000997', cantidad: 12, costo: 1100 },
      { nombre: 'Galletitas Sur', codigo: '', cantidad: 6, costo: 500 },
    ],
  },
};

vi.mock('firebase/functions', () => ({
  getFunctions: () => ({}),
  httpsCallable: () => async () => RESPUESTA,
}));

import CargarFacturaModal from '../CargarFacturaModal.jsx';

/** Sube una foto cualquiera y espera a que aparezca la pantalla de revisar. */
async function llegarARevisar() {
  const { container } = render(<CargarFacturaModal onClose={() => {}} />);
  const input = container.querySelector('input[type="file"]');
  const foto = new File(['x'], 'factura.jpg', { type: 'image/jpeg' });
  fireEvent.change(input, { target: { files: [foto] } });
  await screen.findByText(/Aplicar al inventario/i);
}

/** Aplica y espera a que terminen las escrituras. */
async function aplicar() {
  fireEvent.click(screen.getByText(/Aplicar al inventario/i));
  await waitFor(() => expect(orden.some(([q]) => q === 'recibirPedido')).toBe(true));
}

describe('aplicar una factura al inventario', () => {
  beforeEach(() => {
    orden.length = 0;
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
