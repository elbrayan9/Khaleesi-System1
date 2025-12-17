import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ConfiguracionTab from '../ConfiguracionTab';
import { AppContext } from '../../context/AppContext';
import Swal from 'sweetalert2';
import * as fsService from '../../services/firestoreService';

// Mock dependencies
vi.mock('sweetalert2', () => ({
  default: {
    fire: vi.fn(() => Promise.resolve({ isConfirmed: true })),
    showLoading: vi.fn(),
    close: vi.fn(),
  },
}));

vi.mock('../../services/firestoreService', () => ({
  getSucursales: vi.fn(() =>
    Promise.resolve([{ id: 'suc-1', esPrincipal: true }]),
  ),
  forceAssignAllDataToSucursal: vi.fn(() => Promise.resolve(5)),
  getDatosNegocio: vi.fn(),
}));

vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(),
  httpsCallable: vi.fn(),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    button: ({ children, ...props }) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

// Mock child components
vi.mock('../ImportDataTab', () => ({
  default: () => <div data-testid="import-data-tab">Import Tab</div>,
}));

// Mock AppContext
const mockAppContext = {
  datosNegocio: { nombre: 'Test Business' },
  setDatosNegocio: vi.fn(),
  currentUser: { uid: 'user-123', email: 'test@example.com' },
  mostrarMensaje: vi.fn(),
  confirmarAccion: vi.fn(),
  handleGuardarDatosNegocio: vi.fn(),
  handleBackupData: vi.fn(),
  isLoading: false,
  canAccessAfip: true,
  canAccessDailyReport: true,
  isPremium: true,
  isAdmin: true,
  plan: 'premium',
};

describe('ConfiguracionTab - Reparar Datos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the Reparar Datos button', () => {
    render(
      <AppContext.Provider value={mockAppContext}>
        <ConfiguracionTab />
      </AppContext.Provider>,
    );

    expect(screen.getByText('Reparar Datos')).toBeInTheDocument();
    expect(
      screen.getByText('Usa esto si no ves tus ventas o productos antiguos.'),
    ).toBeInTheDocument();
  });

  it('calls Swal when button is clicked', async () => {
    render(
      <AppContext.Provider value={mockAppContext}>
        <ConfiguracionTab />
      </AppContext.Provider>,
    );

    const repairButton = screen.getByRole('button', { name: /reparar/i });
    fireEvent.click(repairButton);

    // Verify Swal confirmation was called
    expect(Swal.fire).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '¿Reparar Datos?',
        showCancelButton: true,
      }),
    );
  });
});
