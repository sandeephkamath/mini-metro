import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Relative base so the production build works from any subpath (e.g. GitHub Pages'
  // /mini-metro/ project-site path) without needing to hardcode it — leaves the dev
  // server (and the testing/ harness, which navigates to http://localhost:PORT/) untouched.
  base: './',
  plugins: [react()],
})
