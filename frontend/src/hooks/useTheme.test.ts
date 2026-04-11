/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTheme } from './useTheme';

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('should initialize with light theme when no saved preference', () => {
      const { result } = renderHook(() => useTheme());
      expect(result.current.isDark).toBe(false);
    });

    it('should initialize with dark theme when localStorage has "dark"', () => {
      localStorage.setItem('theme', 'dark');
      const { result } = renderHook(() => useTheme());
      expect(result.current.isDark).toBe(true);
    });

    it('should initialize with light theme when localStorage has "light"', () => {
      localStorage.setItem('theme', 'light');
      const { result } = renderHook(() => useTheme());
      expect(result.current.isDark).toBe(false);
    });

    it('should not add dark class on initial render when theme is light', () => {
      renderHook(() => useTheme());
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('should add dark class on initial render when theme is dark', () => {
      localStorage.setItem('theme', 'dark');
      renderHook(() => useTheme());
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
  });

  describe('toggle', () => {
    it('should toggle from light to dark', () => {
      const { result } = renderHook(() => useTheme());
      expect(result.current.isDark).toBe(false);

      act(() => {
        result.current.toggle();
      });

      expect(result.current.isDark).toBe(true);
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(localStorage.getItem('theme')).toBe('dark');
    });

    it('should toggle from dark to light', () => {
      localStorage.setItem('theme', 'dark');
      const { result } = renderHook(() => useTheme());
      expect(result.current.isDark).toBe(true);

      act(() => {
        result.current.toggle();
      });

      expect(result.current.isDark).toBe(false);
      expect(document.documentElement.classList.contains('dark')).toBe(false);
      expect(localStorage.getItem('theme')).toBe('light');
    });

    it('should persist theme changes in localStorage', () => {
      const { result } = renderHook(() => useTheme());

      // Toggle multiple times
      act(() => {
        result.current.toggle();
      });
      expect(localStorage.getItem('theme')).toBe('dark');

      act(() => {
        result.current.toggle();
      });
      expect(localStorage.getItem('theme')).toBe('light');

      act(() => {
        result.current.toggle();
      });
      expect(localStorage.getItem('theme')).toBe('dark');
    });
  });

  describe('class manipulation', () => {
    it('should add dark class to document element when toggled to dark', () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.toggle();
      });

      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should remove dark class from document element when toggled to light', () => {
      localStorage.setItem('theme', 'dark');
      // Manually add class to simulate dark mode
      document.documentElement.classList.add('dark');
      
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.toggle();
      });

      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });

  describe('return value', () => {
    it('should return both isDark and toggle', () => {
      const { result } = renderHook(() => useTheme());
      expect(result.current).toHaveProperty('isDark');
      expect(result.current).toHaveProperty('toggle');
      expect(typeof result.current.toggle).toBe('function');
      expect(typeof result.current.isDark).toBe('boolean');
    });
  });
});