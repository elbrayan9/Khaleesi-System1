import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LoginScreen from '../LoginScreen';
import { signIn } from '../../services/authService';

// Mock de react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  Link: ({ children }) => <a>{children}</a>,
}));

// Mock de authService
vi.mock('../../services/authService', () => ({
  signIn: vi.fn(),
}));

// Mock del contexto
const mockMostrarMensaje = vi.fn();
vi.mock('../../context/AppContext', () => ({
  useAppContext: () => ({
    mostrarMensaje: mockMostrarMensaje,
  }),
}));

// Mock de componentes hijos
vi.mock('./AppLogo', () => ({ default: () => <div>Logo</div> }));
vi.mock('./Footer', () => ({ default: () => <div>Footer</div> }));
vi.mock('./ParticleBackground', () => ({
  default: () => <div>Particles</div>,
}));

describe('LoginScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería renderizar el formulario de login', () => {
    render(<LoginScreen />);
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    // Use exact match to avoid matching the button's aria-label
    expect(screen.getByLabelText(/^Contraseña$/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Ingresar/i }),
    ).toBeInTheDocument();
  });

  it('debería llamar a signIn y navegar al home al enviar credenciales válidas', async () => {
    signIn.mockResolvedValueOnce({ user: { email: 'test@test.com' } });
    render(<LoginScreen />);

    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: 'test@test.com' },
    });
    fireEvent.change(screen.getByLabelText(/^Contraseña$/i), {
      target: { value: 'password123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Ingresar/i }));

    expect(signIn).toHaveBeenCalledWith('test@test.com', 'password123');

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('debería mostrar un error si las credenciales son inválidas', async () => {
    signIn.mockRejectedValueOnce(new Error('Auth failed'));
    render(<LoginScreen />);

    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: 'wrong@test.com' },
    });
    fireEvent.change(screen.getByLabelText(/^Contraseña$/i), {
      target: { value: 'wrongpass' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Ingresar/i }));

    await waitFor(() => {
      expect(mockMostrarMensaje).toHaveBeenCalledWith(
        'Email o contraseña incorrectos.',
        'error',
      );
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
