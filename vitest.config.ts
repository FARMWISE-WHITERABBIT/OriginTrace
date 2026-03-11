import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    exclude: ['node_modules', 'dist', 'tests/e2e/**', '.cache/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
