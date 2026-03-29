import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    // Use jsdom for DOM simulation in unit tests
    environment: 'jsdom',

    // Global test setup
    globals: true,

    // Test file patterns
    include: ['src/**/*.test.{js,ts,jsx,tsx}'],
    exclude: ['node_modules', 'dist'],

    // Coverage configuration (optional, for future use)
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/__tests__/',
        '**/*.test.{js,ts}',
        '**/dist/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
