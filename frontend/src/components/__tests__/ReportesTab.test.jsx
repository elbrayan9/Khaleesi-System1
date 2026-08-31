import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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
// La caja tiene su propia pantalla y sus propias pruebas; acá solo interesa que
// esta la abra.
vi.mock('../CajaModal', () => ({
  default: ({ isOpen }) =>
    isOpen ? <div data-testid="caja-modal">CajaModal</div> : null,
}));

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

// Estos componentes navegan (useNavigate/useLocation), así que necesitan un
// Router alrededor. Sin él, React Router lanza y la prueba falla por el andamio
// y no por lo que quiere probar.
const conRouter = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('ReportesTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería renderizar los componentes principales', () => {
    conRouter(<ReportesTab />);
    expect(screen.getByText('Caja y Reportes')).toBeInTheDocument();
    expect(screen.getByText('SalesChart')).toBeInTheDocument();
  });

  it('el botón de Caja abre la pantalla de caja', () => {
    // Antes acá se probaba el alta de un ingreso manual, con un formulario que
    // vivía en esta pantalla. Ese formulario se mudó a CajaModal —junto con el
    // saldo, los movimientos y el desglose por medio de pago— y la prueba quedó
    // buscando campos que ya no existen, fallando por eso durante meses.
    //
    // Lo que sí le toca a esta pantalla es abrir la caja, que además es su
    // acción principal. El alta de movimientos se prueba donde ahora vive.
    conRouter(<ReportesTab />);
    fireEvent.click(screen.getByText('Caja'));
    expect(screen.getByTestId('caja-modal')).toBeInTheDocument();
  });
});
