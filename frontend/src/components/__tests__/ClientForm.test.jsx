// frontend/src/components/__tests__/ClientForm.test.jsx

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ClientForm from '../ClientForm';

// 1. Creamos una función "espía" (mock) que reemplazará a la real.
const mostrarMensajeMock = vi.fn();

// 2. Le decimos a Vitest que intercepte cualquier importación del AppContext.
// Cuando ClientForm llame a useAppContext(), le daremos nuestra versión falsa.
vi.mock('../../context/AppContext', () => ({
  useAppContext: () => ({
    mostrarMensaje: mostrarMensajeMock,
  }),
}));

describe('ClientForm', () => {
  // Limpiamos el historial del mock antes de cada prueba.
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería llamar a onSave con los datos correctos cuando el formulario se envía', () => {
    const handleSave = vi.fn();
    render(<ClientForm onSave={handleSave} />);

    fireEvent.change(screen.getByLabelText(/Nombre\/Razón Social/i), {
      target: { value: 'Cliente Válido' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Agregar/i }));

    expect(handleSave).toHaveBeenCalledTimes(1);
    // Verificamos que el mensaje de error NO fue llamado.
    expect(mostrarMensajeMock).not.toHaveBeenCalled();
  });

  it('debería mostrar un mensaje de advertencia si el nombre está vacío', () => {
    const handleSave = vi.fn();
    render(<ClientForm onSave={handleSave} />);

    // Buscamos el formulario por su role (o por un test-id si fuera necesario)
    // Nota: Al renderizar, el form tiene role="form" implícito o se puede buscar por texto.
    // Una forma robusta es buscar el botón y luego su formulario, o usar fireEvent.submit(screen.getByRole('button').closest('form'))
    // Pero aquí, simplemente buscaremos el botón y usaremos fireEvent.submit en el formulario que lo contiene.
    const submitButton = screen.getByRole('button', { name: /Agregar/i });
    // fireEvent.click(submitButton); // Esto a veces es bloqueado por 'required' en jsdom

    // Simulamos el envío directo del formulario para probar la lógica de validación JS
    fireEvent.submit(submitButton.closest('form'));

    // Verificamos que onSave NO se haya llamado.
    expect(handleSave).not.toHaveBeenCalled();

    // Verificamos que nuestra función espía SÍ fue llamada con el mensaje correcto.
    expect(mostrarMensajeMock).toHaveBeenCalledWith(
      'El nombre del cliente es obligatorio.',
      'warning',
    );
  });
});
