import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import NotasCDTab from '../NotasCDTab';

// Mock de SearchBar
vi.mock('../SearchBar', () => ({
  default: ({ onSelect, onTextChange, placeholder }) => (
    <input
      data-testid="search-bar-cliente"
      placeholder={placeholder}
      onChange={(e) => {
        if (onTextChange) onTextChange(e.target.value);
        // Simulamos que si escribe "Cliente Existente", selecciona uno
        if (e.target.value === 'Cliente Existente') {
          onSelect({ id: 'c1', nombre: 'Cliente Existente' });
        }
      }}
    />
  ),
}));

// Mock del contexto
const mockHandleCrearNotaManual = vi.fn();
const mockHandleEliminarNotaCD = vi.fn();
const mockMostrarMensaje = vi.fn();

vi.mock('../../context/AppContext', () => ({
  useAppContext: () => ({
    notasCD: [],
    handleCrearNotaManual: mockHandleCrearNotaManual,
    handleEliminarNotaCD: mockHandleEliminarNotaCD,
    clientes: [{ id: 'c1', nombre: 'Cliente Existente' }],
    productos: [],
    mostrarMensaje: mockMostrarMensaje,
  }),
}));

describe('NotasCDTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería renderizar el formulario', () => {
    render(<NotasCDTab />);
    expect(screen.getByText('Generar Nueva Nota')).toBeInTheDocument();
  });

  it('debería permitir generar una nota con nombre de cliente manual', () => {
    render(<NotasCDTab />);

    // Llenar motivo y monto
    fireEvent.change(screen.getByPlaceholderText('Ej: Devolución, ajuste...'), {
      target: { value: 'Motivo Test' },
    });
    fireEvent.change(screen.getByPlaceholderText('Monto de la nota'), {
      target: { value: '100' },
    });

    // Escribir nombre manual en SearchBar mockeado
    const searchInput = screen.getByTestId('search-bar-cliente');
    fireEvent.change(searchInput, { target: { value: 'Cliente Manual' } });

    // Click en Generar Nota
    fireEvent.click(screen.getByText('Generar Nota'));

    // Verificar que se llamó a handleCrearNotaManual con el nombre manual
    expect(mockHandleCrearNotaManual).toHaveBeenCalledWith(
      expect.objectContaining({
        cliente: 'Cliente Manual',
        monto: 100,
        motivo: 'Motivo Test',
      }),
    );
  });

  it('debería permitir generar una nota con cliente seleccionado', () => {
    render(<NotasCDTab />);

    fireEvent.change(screen.getByPlaceholderText('Ej: Devolución, ajuste...'), {
      target: { value: 'Motivo Test' },
    });
    fireEvent.change(screen.getByPlaceholderText('Monto de la nota'), {
      target: { value: '100' },
    });

    // Simular selección de cliente existente
    const searchInput = screen.getByTestId('search-bar-cliente');
    fireEvent.change(searchInput, { target: { value: 'Cliente Existente' } });

    fireEvent.click(screen.getByText('Generar Nota'));

    expect(mockHandleCrearNotaManual).toHaveBeenCalledWith(
      expect.objectContaining({
        cliente: expect.objectContaining({
          id: 'c1',
          nombre: 'Cliente Existente',
        }),
      }),
    );
  });
});
