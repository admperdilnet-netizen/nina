import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const isCapacitorBuild = process.env.CAPACITOR_BUILD === 'true'

export default defineConfig({
  plugins: [react()],
  base: isCapacitorBuild ? './' : '/nina/',
})
