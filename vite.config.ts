/// <reference types="vitest/config" />
import { defineConfig, configDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react'

declare const process: { env: Record<string, string | undefined> }
const stat = !!process.env.STAT

export default defineConfig({
  plugins: [react()],
  test: {
    include: [stat ? 'src/**/*.stat.test.ts' : 'src/**/*.test.ts'],
    exclude: [...configDefaults.exclude, ...(stat ? [] : ['src/**/*.stat.test.ts'])],
    testTimeout: stat ? 300_000 : 5_000,
  },
})
