import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 80,
        functions: 75,
        branches: 70,
        statements: 80
      },
      exclude: [
        'node_modules/',
        'dist/',
        'prisma/',
        'src/test/',
        '**/*.d.ts'
      ]
    },
    setupFiles: ['./src/test/setup.ts']
  }
});