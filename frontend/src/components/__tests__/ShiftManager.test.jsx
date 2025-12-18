import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ShiftManager from '../ShiftManager';
import { getOpenShift } from '../../services/firestoreService';

// Mock de firestoreService
vi.mock('../../services/firestoreService', () => ({
  getOpenShift: vi.fn(),
}));

// Mock del contexto
const mockHandleAbrirTurno = vi.fn();
const mockHandleCerrarTurno = vi.fn();
const mockSetTurnoActivo = vi.fn();

vi.mock('../../context/AppContext', () => ({
  useAppContext: () => ({
    vendedorActivoId: 'v1',
    currentUser: { uid: 'u1' },
    turnoActivo: null, // Inicialmente sin turno
    setTurnoActivo: mockSetTurnoActivo,
    handleAbrirTurno: mockHandleAbrirTurno,
    handleCerrarTurno: mockHandleCerrarTurno,
    ventas: [],
    sucursalActual: { id: 's1' },
    vendedores: [{ id: 'v1', nombre: 'Vendedor Test' }],
  }),
}));

describe('ShiftManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería mostrar botón de "Abrir Turno" cuando no hay turno activo', async () => {
    getOpenShift.mockResolvedValue({ empty: true });
    render(<ShiftManager />);

    await waitFor(() => {
      expect(screen.getByText('Abrir Turno')).toBeInTheDocument();
    });
  });

  it('debería llamar a handleAbrirTurno al confirmar apertura', async () => {
    getOpenShift.mockResolvedValue({ empty: true });
    render(<ShiftManager />);

    await waitFor(() => {
      expect(screen.getByText('Abrir Turno')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Abrir Turno'));

    // Llenar monto inicial
    const input = await screen.findByPlaceholderText(/Ej: 5000/i);
    fireEvent.change(input, { target: { value: '5000' } });

    fireEvent.click(screen.getByText('Confirmar e Iniciar'));

    expect(mockHandleAbrirTurno).toHaveBeenCalledWith('v1', '5000');
  });
});
