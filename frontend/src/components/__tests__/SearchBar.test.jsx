import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SearchBar from '../SearchBar';

describe('SearchBar', () => {
  const mockItems = [
    { id: '1', nombre: 'Cliente Uno', cuit: '111' },
    { id: '2', nombre: 'Cliente Dos', cuit: '222' },
  ];

  it('debería renderizar correctamente', () => {
    render(
      <SearchBar
        items={mockItems}
        placeholder="Buscar..."
        onSelect={() => {}}
        displayKey="nombre"
        filterKeys={['nombre']}
        inputId="test-search"
      />,
    );
    expect(screen.getByPlaceholderText('Buscar...')).toBeInTheDocument();
  });

  it('debería llamar a onTextChange cuando el usuario escribe', () => {
    const handleTextChange = vi.fn();
    render(
      <SearchBar
        items={mockItems}
        placeholder="Buscar..."
        onSelect={() => {}}
        onTextChange={handleTextChange}
        displayKey="nombre"
        filterKeys={['nombre']}
        inputId="test-search"
      />,
    );

    const input = screen.getByPlaceholderText('Buscar...');
    fireEvent.change(input, { target: { value: 'Hola' } });

    expect(handleTextChange).toHaveBeenCalledWith('Hola');
  });

  it('debería filtrar items y permitir selección', () => {
    const handleSelect = vi.fn();
    render(
      <SearchBar
        items={mockItems}
        placeholder="Buscar..."
        onSelect={handleSelect}
        displayKey="nombre"
        filterKeys={['nombre']}
        inputId="test-search"
      />,
    );

    const input = screen.getByPlaceholderText('Buscar...');

    // Escribir para filtrar
    fireEvent.change(input, { target: { value: 'Uno' } });

    // Debería aparecer la opción
    const option = screen.getByText('Cliente Uno');
    expect(option).toBeInTheDocument();

    // Seleccionar
    fireEvent.click(option);

    expect(handleSelect).toHaveBeenCalledWith(mockItems[0]);
    // El input debería actualizarse con el nombre seleccionado
    expect(input.value).toBe('Cliente Uno');
  });
});
