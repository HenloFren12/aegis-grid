import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'firebase',
              test: /node_modules[\\/](@firebase|firebase)[\\/]/,
              priority: 30,
            },
            {
              name: 'leaflet',
              test: /node_modules[\\/](leaflet|react-leaflet)[\\/]/,
              priority: 20,
            },
          ],
        },
      },
    },
  },
})