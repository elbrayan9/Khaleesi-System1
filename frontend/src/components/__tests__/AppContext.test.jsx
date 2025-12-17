import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React, { useContext } from 'react';
import { AppProvider, AppContext } from '../../context/AppContext';
import { auth } from '../../firebaseConfig';
import * as fsService from '../../services/firestoreService';

// Mock Firebase Auth
vi.mock('../../firebaseConfig', () => ({
  auth: {
    currentUser: null,
  },
  db: {},
}));

// Mock Firebase Functions
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(),
  onAuthStateChanged: vi.fn((auth, callback) => {
    // Simulate auth state change immediately if needed, or expose callback
    return vi.fn(); // Unsubscribe function
  }),
  signOut: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  onSnapshot: vi.fn(() => vi.fn()), // Unsubscribe
  query: vi.fn(),
  where: vi.fn(),
  doc: vi.fn(),
  increment: vi.fn(),
  getFirestore: vi.fn(),
}));

vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(),
  httpsCallable: vi.fn(),
}));

// Mock Firestore Service
vi.mock('../../services/firestoreService', () => ({
  getSucursales: vi.fn(() => Promise.resolve([])),
  addSucursal: vi.fn(),
  initializeBranchSettings: vi.fn(),
}));

// Helper component to consume context
const TestComponent = () => {
  const { currentUser, isLoggedIn } = useContext(AppContext);
  return (
    <div>
      <span data-testid="user-id">{currentUser?.uid || 'No User'}</span>
      <span data-testid="is-logged-in">{isLoggedIn ? 'Yes' : 'No'}</span>
    </div>
  );
};

describe('AppContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders children and initializes with default state', () => {
    render(
      <AppProvider>
        <div>Test Child</div>
      </AppProvider>,
    );
    expect(screen.getByText('Test Child')).toBeInTheDocument();
  });

  it('updates state when user logs in', async () => {
    // Mock onAuthStateChanged to simulate login
    const mockUser = {
      uid: 'test-user-123',
      email: 'test@example.com',
      getIdTokenResult: vi.fn().mockResolvedValue({ claims: {} }),
    };

    const { onAuthStateChanged } = await import('firebase/auth');
    onAuthStateChanged.mockImplementation((auth, callback) => {
      callback(mockUser);
      return vi.fn();
    });

    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-id')).toHaveTextContent('test-user-123');
      expect(screen.getByTestId('is-logged-in')).toHaveTextContent('Yes');
    });
  });

  it('updates state when user logs out', async () => {
    // Mock onAuthStateChanged to simulate logout
    const { onAuthStateChanged } = await import('firebase/auth');
    onAuthStateChanged.mockImplementation((auth, callback) => {
      callback(null);
      return vi.fn();
    });

    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-id')).toHaveTextContent('No User');
      expect(screen.getByTestId('is-logged-in')).toHaveTextContent('No');
    });
  });
});
