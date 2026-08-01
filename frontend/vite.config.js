import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    // Bind explicitly to IPv4 so http://127.0.0.1:5173 works consistently.
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    watch: {
      ignored: [
        '**/node_modules/**',
        '**/node_modules_backup_*/**',
        '**/dist/**',
        '**/.git/**',
        '**/*.sql',
        '**/*.log',
        '**/backend/**'
      ],
    },
  },
})
