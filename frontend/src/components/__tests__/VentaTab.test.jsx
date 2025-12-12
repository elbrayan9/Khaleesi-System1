import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import VentaTab from '../VentaTab';

// Mocks de componentes hijos para aislar VentaTab
vi.mock('../SelectorVendedor', () => ({
  default: () => <div data-testid="selector-vendedor">SelectorVendedor</div>,
}));
vi.mock('../ShiftManager', () => ({
  default: () => <div data-testid="shift-manager">ShiftManager</div>,
}));
vi.mock('../Cart', () => ({
  default: ({ onCheckout }) => (
    <div data-testid="cart">
      Cart
      <button onClick={onCheckout}>Checkout Mock</button>
    </div>
  ),
}));
vi.mock('../PaymentModal', () => ({
  default: ({ isOpen, onConfirm }) =>
    isOpen ? (
      <div data-testid="payment-modal">
        PaymentModal
        <button onClick={() => onConfirm('Efectivo', 'B')}>
          Confirmar Pago
        </button>
      </div>
    ) : null,
}));
vi.mock('../SearchBar', () => ({
  default: ({ onSelect, placeholder }) => (
    <input
      data-testid="search-bar"
      placeholder={placeholder}
      onChange={(e) =>
        onSelect({ id: 'p1', nombre: 'Producto Manual', precio: 50 })
      }
    />
  ),
}));

// Mock del contexto
const mockHandleAddToCart = vi.fn();
const mockHandleSaleConfirmed = vi.fn();
const mockMostrarMensaje = vi.fn();
const mockHandleAddManualItemToCart = vi.fn();

vi.mock('../../context/AppContext', () => ({
  useAppContext: () => ({
    productos: [
      {
        id: 'p1',
        nombre: 'Producto 1',
        codigoBarras: '111',
        precio: 100,
        stock: 10,
      },
    ],
    clientes: [],
    vendedores: [{ id: 'v1', nombre: 'Vendedor 1' }],
    vendedorActivoId: 'v1',
    setVendedorActivoId: vi.fn(),
    cartItems: [{ id: 'item1', precioFinal: 100 }], // Simulamos items en el carrito
    setCartItems: vi.fn(),
    datosNegocio: { habilitarVentaRapida: true },
    handleSaleConfirmed: mockHandleSaleConfirmed,
    handleAddManualItemToCart: mockHandleAddManualItemToCart,
    mostrarMensaje: mockMostrarMensaje,
    handleAddToCart: mockHandleAddToCart,
  }),
}));

describe('VentaTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería renderizar correctamente', () => {
    render(<VentaTab />);
    expect(screen.getByText('Nueva Venta')).toBeInTheDocument();
    // Hay dos selectores de vendedor: uno para el cajero y otro para el vendedor de la venta
    const selectores = screen.getAllByTestId('selector-vendedor');
    expect(selectores).toHaveLength(2);
    expect(screen.getByTestId('cart')).toBeInTheDocument();
  });

  it('debería manejar la adición de productos por código de barras', () => {
    render(<VentaTab />);
    const input = screen.getByPlaceholderText('Ingrese o escanee código...');

    // Simular escaneo
    fireEvent.change(input, { target: { value: '111' } });
    fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });

    // Debería intentar agregar el producto
    // Nota: En la implementación real, se llama a handleAddToCart si encuentra el producto
    // Como mockeamos handleAddToCart, verificamos si se llamó con el producto correcto
    // Pero primero debemos asegurarnos de que el evento keyPress dispare la lógica.
    // React Testing Library a veces requiere fireEvent.keyDown o keyUp también.

    // Alternativa: Click en el botón de código de barras
    const btnBarcode = input.nextSibling; // El botón está al lado
    fireEvent.click(btnBarcode);

    expect(mockHandleAddToCart).toHaveBeenCalled();
  });

  it('debería abrir el modal de pago al hacer checkout en el carrito', () => {
    render(<VentaTab />);

    // Simular click en checkout del Cart mockeado
    fireEvent.click(screen.getByText('Checkout Mock'));

    // El modal debería abrirse
    expect(screen.getByTestId('payment-modal')).toBeInTheDocument();
  });

  it('debería confirmar la venta desde el modal de pago', () => {
    render(<VentaTab />);

    // Abrir modal
    fireEvent.click(screen.getByText('Checkout Mock'));

    // Confirmar pago en modal
    fireEvent.click(screen.getByText('Confirmar Pago'));

    expect(mockHandleSaleConfirmed).toHaveBeenCalled();
  });
});
