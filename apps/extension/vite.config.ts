import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.config'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    crx({ manifest }),
    {
      name: "tailwind-properties",
      transform(code, id) {
        if (id.endsWith("tailwind-properties.css?inline")) {
          // Change custom properties to inherit so they work across shadow boundaries
          code = code.replace(/inherits: false/g, "inherits: true");

          // Remove everything before the property declarations
          const propertyStart = code.indexOf("@property");
          if (propertyStart !== -1) {
            code = code.substring(propertyStart);
          }
          
          return code;
        }
      },
    }
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3000,
    strictPort: true,
    hmr: {
      clientPort: 3000,
    },
  },
})
