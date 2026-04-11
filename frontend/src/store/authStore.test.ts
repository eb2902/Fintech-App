/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from './authStore';

describe('authStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
    });
  });

  it('should initialize with default state', () => {
    const store = useAuthStore.getState();
    expect(store.user).toBeNull();
    expect(store.token).toBeNull();
    expect(store.isAuthenticated).toBe(false);
  });

  it('should login user and store token in localStorage', () => {
    const store = useAuthStore.getState();
    const mockUser = {
      id: '123',
      name: 'Test User',
      email: 'test@example.com',
      createdAt: '2024-01-01T00:00:00.000Z',
    };
    const mockToken = 'test-jwt-token';

    store.login(mockUser, mockToken);

    const updatedStore = useAuthStore.getState();
    expect(updatedStore.user).toEqual(mockUser);
    expect(updatedStore.token).toBe(mockToken);
    expect(updatedStore.isAuthenticated).toBe(true);
    expect(localStorage.getItem('token')).toBe(mockToken);
  });

  it('should logout user and clear localStorage', () => {
    const store = useAuthStore.getState();
    const mockUser = {
      id: '123',
      name: 'Test User',
      email: 'test@example.com',
      createdAt: '2024-01-01T00:00:00.000Z',
    };
    store.login(mockUser, 'test-token');

    store.logout();

    const updatedStore = useAuthStore.getState();
    expect(updatedStore.user).toBeNull();
    expect(updatedStore.token).toBeNull();
    expect(updatedStore.isAuthenticated).toBe(false);
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('should update user', () => {
    const store = useAuthStore.getState();
    const mockUser = {
      id: '123',
      name: 'Test User',
      email: 'test@example.com',
      createdAt: '2024-01-01T00:00:00.000Z',
    };
    store.login(mockUser, 'test-token');

    const updatedUser = { ...mockUser, name: 'Updated Name' };
    store.setUser(updatedUser);

    const updatedStore = useAuthStore.getState();
    expect(updatedStore.user?.name).toBe('Updated Name');
  });
});