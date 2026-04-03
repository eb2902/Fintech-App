import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 95,
        functions: 95,
        branches: 95,
        statements: 95
      },
      exclude: [
        'node_modules/',
        'dist/',
        'prisma/',
        'src/test/',
        '**/*.d.ts',
        'src/index.ts',
        'src/config/database.ts'
      ]
    },
    setupFiles: ['./src/test/setup.ts']
  }
});