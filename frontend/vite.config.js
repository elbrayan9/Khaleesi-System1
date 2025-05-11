import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"
// Necesario para obtener __dirname en módulos ES (como los que usa Vite)
import { fileURLToPath } from 'url';

// Calcular __dirname de forma compatible con ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Define que '@/' apunta a la carpeta 'src' relativa al directorio actual (__dirname)
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
