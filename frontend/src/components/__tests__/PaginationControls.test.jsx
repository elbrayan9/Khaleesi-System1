// frontend/src/components/__tests__/PaginationControls.test.js

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PaginationControls from '../PaginationControls';

// Describimos el conjunto de pruebas para el componente PaginationControls
describe('PaginationControls', () => {
  it('debería renderizar los botones y la información de la página', () => {
    // Renderizamos el componente con props de ejemplo
    render(
      <PaginationControls
        currentPage={2}
        totalPages={5}
        onPageChange={() => {}}
        itemsPerPage={10}
        totalItems={45}
      />,
    );

    // Verificamos que el texto informativo sea correcto
    expect(screen.getByText('Mostrando 11-20 de 45')).toBeInTheDocument();

    // Verificamos que ambos botones estén en el documento
    expect(
      screen.getByRole('button', { name: /Anterior/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Siguiente/i }),
    ).toBeInTheDocument();
  });

  it('debería deshabilitar el botón "Anterior" en la primera página', () => {
    render(
      <PaginationControls
        currentPage={1}
        totalPages={5}
        onPageChange={() => {}}
        itemsPerPage={10}
        totalItems={45}
      />,
    );

    // Verificamos que el botón "Anterior" esté deshabilitado
    expect(screen.getByRole('button', { name: /Anterior/i })).toBeDisabled();
    // Verificamos que el botón "Siguiente" NO esté deshabilitado
    expect(
      screen.getByRole('button', { name: /Siguiente/i }),
    ).not.toBeDisabled();
  });

  it('debería deshabilitar el botón "Siguiente" en la última página', () => {
    render(
      <PaginationControls
        currentPage={5}
        totalPages={5}
        onPageChange={() => {}}
        itemsPerPage={10}
        totalItems={45}
      />,
    );

    expect(
      screen.getByRole('button', { name: /Anterior/i }),
    ).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /Siguiente/i })).toBeDisabled();
  });

  it('debería llamar a onPageChange con la página correcta al hacer clic en "Siguiente"', () => {
    // vi.fn() crea una "función espía" que nos permite saber si fue llamada y con qué argumentos
    const handlePageChange = vi.fn();

    render(
      <PaginationControls
        currentPage={3}
        totalPages={5}
        onPageChange={handlePageChange}
        itemsPerPage={10}
        totalItems={45}
      />,
    );

    // Simulamos un clic en el botón "Siguiente"
    const nextButton = screen.getByRole('button', { name: /Siguiente/i });
    fireEvent.click(nextButton);

    // Verificamos que nuestra función espía haya sido llamada una vez
    expect(handlePageChange).toHaveBeenCalledTimes(1);
    // Verificamos que haya sido llamada con el número de página correcto (3 + 1)
    expect(handlePageChange).toHaveBeenCalledWith(4);
  });
});
