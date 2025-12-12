import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ReportesTab from '../ReportesTab';

// Mock de helpers
vi.mock('../utils/helpers', () => ({
  formatCurrency: (val) => `$${val}`,
  obtenerNombreMes: () => 'Enero',
}));

// Mock de componentes hijos
vi.mock('../PaginationControls', () => ({
  default: () => <div>Pagination</div>,
}));
vi.mock('../SalesChart', () => ({ default: () => <div>SalesChart</div> }));
vi.mock('../SalesHeatmap', () => ({ default: () => <div>SalesHeatmap</div> }));
vi.mock('../HistorialTurnos', () => ({
  default: () => <div>HistorialTurnos</div>,
}));
vi.mock('../CajaGeneral', () => ({ default: () => <div>CajaGeneral</div> }));

// Mock del contexto
const mockHandleRegistrarIngresoManual = vi.fn();
const mockHandleRegistrarEgreso = vi.fn();

vi.mock('../../context/AppContext.jsx', () => ({
  __esModule: true,
  useAppContext: () => ({
    ventas: [
      {
        id: 'v1',
        total: 1000,
        fecha: '2023-01-01',
        items: [],
        pagos: [{ metodo: 'efectivo', monto: 1000 }],
      },
    ],
    egresos: [],
    ingresosManuales: [],
    clientes: [],
    handleRegistrarIngresoManual: mockHandleRegistrarIngresoManual,
    handleEliminarIngresoManual: vi.fn(),
    handleRegistrarEgreso: mockHandleRegistrarEgreso,
    handleEliminarEgreso: vi.fn(),
    handleEliminarVenta: vi.fn(),
    mostrarMensaje: vi.fn(),
    datosNegocio: {},
  }),
}));

describe('ReportesTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería renderizar los componentes principales', () => {
    render(<ReportesTab />);
    expect(screen.getByText('Caja y Reportes')).toBeInTheDocument();
    expect(screen.getByText('CajaGeneral')).toBeInTheDocument();
    expect(screen.getByText('SalesChart')).toBeInTheDocument();
  });

  it('debería permitir registrar un ingreso manual', () => {
    render(<ReportesTab />);

    const descInputs = screen.getAllByLabelText(/Descripción:/i);
    const montoInputs = screen.getAllByLabelText(/Monto \(\$\):/i);

    // Asumimos que el formulario de ingreso es el primero
    const descInput = descInputs[0];
    const montoInput = montoInputs[0];

    fireEvent.change(descInput, { target: { value: 'Ingreso Test' } });
    fireEvent.change(montoInput, { target: { value: '500' } });

    fireEvent.click(screen.getByText('Registrar Ingreso'));

    expect(mockHandleRegistrarIngresoManual).toHaveBeenCalledWith(
      'Ingreso Test',
      500,
    );
  });
});
