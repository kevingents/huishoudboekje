import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

// Pure-logica-tests (geen DB/Next). Path-alias '@' → projectroot, zodat tests
// dezelfde imports gebruiken als de app.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
})
