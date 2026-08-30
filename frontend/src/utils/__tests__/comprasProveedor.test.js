import { describe, it, expect } from 'vitest';
import {
  comprasDeProveedor,
  fechaCorta,
  diasDesde,
} from '../comprasProveedor.js';

// Un reloj fijo: si dependiera del día en que se corre, la prueba fallaría sola
// dentro de un mes y nadie sabría por qué.
const HOY = new Date('2026-08-30T12:00:00Z');

const PEDIDOS = [
  // Del proveedor A: recibido hace 5 días.
  {
    proveedorId: 'A',
    estado: 'recibido',
    fechaRecepcion: '2026-08-25',
    totalCosto: 50000,
  },
  // Del proveedor A: recibido hace 100 días, fuera de la ventana.
  {
    proveedorId: 'A',
    estado: 'recibido',
    fechaRecepcion: '2026-05-22',
    totalCosto: 900000,
  },
  // Del proveedor A: encargado pero NO recibido.
  {
    proveedorId: 'A',
    estado: 'pedido',
    fechaPedido: '2026-08-29',
    totalCosto: 70000,
  },
  // Del proveedor A: cancelado.
  {
    proveedorId: 'A',
    estado: 'cancelado',
    fechaPedido: '2026-08-28',
    totalCosto: 30000,
  },
  // De otro proveedor.
  {
    proveedorId: 'B',
    estado: 'recibido',
    fechaRecepcion: '2026-08-29',
    totalCosto: 12000,
  },
];

describe('comprasDeProveedor', () => {
  it('suma solo lo recibido dentro de la ventana', () => {
    const r = comprasDeProveedor(PEDIDOS, 'A', 30, HOY);
    expect(r.total).toBe(50000);
    expect(r.cantidad).toBe(1);
  });

  it('no cuenta lo encargado ni lo cancelado', () => {
    // Un pedido hecho y no entregado no es plata gastada, y uno cancelado
    // menos. Contarlos daría un número más grande que la realidad, justo cuando
    // lo que se está por decidir es a quién comprarle.
    const r = comprasDeProveedor(PEDIDOS, 'A', 30, HOY);
    expect(r.total).not.toBe(120000); // con el 'pedido' sumado
    expect(r.total).not.toBe(150000); // con el cancelado también
  });

  it('la última compra mira TODAS las recibidas, no solo la ventana', () => {
    // Un proveedor al que no le comprás hace seis meses tiene que mostrar esa
    // fecha, no un guión: es la información que dice que dejaste de comprarle.
    const viejo = [
      {
        proveedorId: 'C',
        estado: 'recibido',
        fechaRecepcion: '2026-01-10',
        totalCosto: 5000,
      },
    ];
    const r = comprasDeProveedor(viejo, 'C', 30, HOY);
    expect(r.ultima).toBe('2026-01-10');
    expect(r.total).toBe(0);
  });

  it('no mezcla proveedores', () => {
    expect(comprasDeProveedor(PEDIDOS, 'B', 30, HOY).total).toBe(12000);
  });

  it('un proveedor sin compras devuelve todo en cero', () => {
    const r = comprasDeProveedor(PEDIDOS, 'Z', 30, HOY);
    expect(r).toEqual({ ultima: null, total: 0, cantidad: 0 });
  });

  it('los pedidos viejos sin fecha de recepción usan la del pedido', () => {
    const sinRecepcion = [
      {
        proveedorId: 'D',
        estado: 'recibido',
        fechaPedido: '2026-08-20',
        totalCosto: 8000,
      },
    ];
    const r = comprasDeProveedor(sinRecepcion, 'D', 30, HOY);
    expect(r.ultima).toBe('2026-08-20');
    expect(r.total).toBe(8000);
  });

  it('aguanta que no haya pedidos todavía', () => {
    expect(comprasDeProveedor(undefined, 'A').total).toBe(0);
    expect(comprasDeProveedor([], 'A').ultima).toBe(null);
    expect(comprasDeProveedor(PEDIDOS, null).total).toBe(0);
  });
});

describe('fechaCorta', () => {
  it('pasa a como se lee acá', () => {
    expect(fechaCorta('2026-08-25')).toBe('25/08/2026');
    expect(fechaCorta(null)).toBe(null);
  });
});

describe('diasDesde', () => {
  it('cuenta días enteros', () => {
    expect(diasDesde('2026-08-30', HOY)).toBe(0);
    expect(diasDesde('2026-08-29', HOY)).toBe(1);
    expect(diasDesde('2026-08-25', HOY)).toBe(5);
  });

  it('sin fecha devuelve null', () => {
    expect(diasDesde(null, HOY)).toBe(null);
    expect(diasDesde('cualquier cosa', HOY)).toBe(null);
  });
});
