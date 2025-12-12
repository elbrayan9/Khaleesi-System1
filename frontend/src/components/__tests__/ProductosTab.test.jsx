import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ProductosTab from '../ProductosTab';

// Mocks de componentes hijos
vi.mock('../ProductForm', () => ({
  default: ({ onSave, onCancelEdit, productToEdit }) => (
    <div data-testid="product-form">
      ProductForm
      <button onClick={() => onSave({ nombre: 'Nuevo Producto' })}>
        Guardar Mock
      </button>
      {productToEdit && <button onClick={onCancelEdit}>Cancelar Mock</button>}
    </div>
  ),
}));

vi.mock('../ProductTable', () => ({
  default: ({ products, onEdit, onDelete }) => (
    <div data-testid="product-table">
      ProductTable ({products.length})
      {products.map((p) => (
        <div key={p.id}>
          {p.nombre}
          <button onClick={() => onEdit(p)}>Editar</button>
          <button onClick={() => onDelete(p.id, p.nombre)}>Eliminar</button>
        </div>
      ))}
    </div>
  ),
}));

// Mock del contexto
const mockHandleSaveProduct = vi.fn();
const mockHandleEditProduct = vi.fn();
const mockHandleDeleteProduct = vi.fn();
const mockHandleCancelEditProduct = vi.fn();
const mockHandleBulkPriceUpdate = vi.fn();
const mockHandleImportarProductos = vi.fn();
const mockHandleDeleteSelected = vi.fn();
const mockHandleDeleteDuplicates = vi.fn();

vi.mock('../../context/AppContext', () => ({
  useAppContext: () => ({
    productos: [
      { id: 'p1', nombre: 'Producto 1', precio: 100 },
      { id: 'p2', nombre: 'Producto 2', precio: 200 },
    ],
    handleSaveProduct: mockHandleSaveProduct,
    handleEditProduct: mockHandleEditProduct,
    handleDeleteProduct: mockHandleDeleteProduct,
    handleBulkPriceUpdate: mockHandleBulkPriceUpdate,
    editingProduct: null,
    handleCancelEditProduct: mockHandleCancelEditProduct,
    sucursalActual: { id: 's1', nombre: 'Sucursal 1' },
    handleImportarProductos: mockHandleImportarProductos,
    handleDeleteSelected: mockHandleDeleteSelected,
    handleDeleteDuplicates: mockHandleDeleteDuplicates,
  }),
}));

describe('ProductosTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería renderizar la tabla de productos y el formulario', () => {
    render(<ProductosTab />);
    expect(screen.getByTestId('product-table')).toBeInTheDocument();
    expect(screen.getByTestId('product-form')).toBeInTheDocument();
    expect(screen.getByText('ProductTable (2)')).toBeInTheDocument();
  });

  it('debería llamar a handleSaveProduct al guardar desde el formulario', () => {
    render(<ProductosTab />);
    fireEvent.click(screen.getByText('Guardar Mock'));
    expect(mockHandleSaveProduct).toHaveBeenCalledWith({
      nombre: 'Nuevo Producto',
    });
  });

  it('debería llamar a handleEditProduct al hacer clic en editar en la tabla', () => {
    render(<ProductosTab />);
    const editButtons = screen.getAllByText('Editar');
    fireEvent.click(editButtons[0]);
    expect(mockHandleEditProduct).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'p1' }),
    );
  });

  it('debería llamar a handleDeleteProduct al hacer clic en eliminar en la tabla', () => {
    render(<ProductosTab />);
    const deleteButtons = screen.getAllByText('Eliminar');
    fireEvent.click(deleteButtons[0]);
    expect(mockHandleDeleteProduct).toHaveBeenCalledWith('p1', 'Producto 1');
  });
});
