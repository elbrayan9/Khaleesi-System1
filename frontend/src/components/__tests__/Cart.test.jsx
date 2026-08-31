import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Cart from '../Cart';

// Mock del contexto
const mockSetCartItems = vi.fn();
// Quitar un item ya no escribe el carrito a mano: lo hace el contexto, que
// además registra la quita en el control anti-robo. La prueba miraba la versión
// vieja y por eso fallaba.
const mockRemoveItem = vi.fn();
const mockMostrarMensaje = vi.fn();
const mockProductos = [
  {
    id: 'p1',
    nombre: 'Producto 1',
    precio: 100,
    stock: 10,
    vendidoPor: 'unidad',
  },
  { id: 'p2', nombre: 'Producto 2', precio: 50, stock: 5, vendidoPor: 'peso' },
];

vi.mock('../../context/AppContext', () => ({
  useAppContext: () => ({
    cartItems: [
      {
        cartId: 'c1',
        id: 'p1',
        nombre: 'Producto 1',
        cantidad: 2,
        precioOriginal: 100,
        precioFinal: 200,
        descuentoPorcentaje: 0,
        vendidoPor: 'unidad',
      },
    ],
    setCartItems: mockSetCartItems,
    handleRemoveItemFromCart: mockRemoveItem,
    handleUpdateCartQuantity: vi.fn(),
    handleClearCart: vi.fn(),
    productos: mockProductos,
    mostrarMensaje: mockMostrarMensaje,
  }),
}));

// Mock de SearchBar para simplificar
vi.mock('../SearchBar', () => ({
  default: ({ onSelect, placeholder }) => (
    <input
      data-testid="mock-search-bar"
      placeholder={placeholder}
      onChange={(e) => onSelect({ id: 'c1', nombre: 'Cliente Test' })}
    />
  ),
}));

describe('Cart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería renderizar los items del carrito', () => {
    render(
      <Cart
        onCheckout={() => {}}
        clients={[]}
        selectedClientId={null}
        onClientSelect={() => {}}
      />,
    );

    expect(screen.getByText('Producto 1')).toBeInTheDocument();
    // El importe aparece dos veces —el renglón y el total del carrito—, así que
    // se mira el total por su id en vez de buscar el texto suelto.
    expect(document.getElementById('carrito-total')).toHaveTextContent(
      '$200,00',
    ); // 2 * 100
  });

  it('debería llamar a onCheckout al hacer clic en el botón de pago', () => {
    const handleCheckout = vi.fn();
    render(
      <Cart
        onCheckout={handleCheckout}
        clients={[]}
        selectedClientId={null}
        onClientSelect={() => {}}
      />,
    );

    // El botón se llama "Cobrar" desde que se rehízo el carrito.
    fireEvent.click(screen.getByText('Cobrar'));
    expect(handleCheckout).toHaveBeenCalled();
  });

  it('debería eliminar un item al hacer clic en el botón de eliminar', () => {
    render(
      <Cart
        onCheckout={() => {}}
        clients={[]}
        selectedClientId={null}
        onClientSelect={() => {}}
      />,
    );

    const deleteButton = screen.getByTitle('Quitar');
    fireEvent.click(deleteButton);

    expect(mockRemoveItem).toHaveBeenCalledWith('c1');
  });
});
