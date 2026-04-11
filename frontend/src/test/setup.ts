import '@testing-library/jest-dom/vitest';
import { beforeEach, vi } from 'vitest';

// jsdom ya proporciona window, document y localStorage.
// Solo reseteamos el estado entre tests si es necesario.

beforeEach(() => {
  // Limpiar localStorage
  localStorage.clear();
  
  // Limpiar el DOM si es necesario (aunque RTL lo hace por defecto con render)
  document.documentElement.className = '';
  
  // Limpiar todos los mocks de Vitest
  vi.clearAllMocks();
});
