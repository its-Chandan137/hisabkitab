import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined;
          }

          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/react-router-dom/')
          ) {
            return 'vendor-react';
          }

          if (id.includes('node_modules/framer-motion/')) {
            return 'vendor-motion';
          }

          if (id.includes('node_modules/lucide-react/')) {
            return 'vendor-icons';
          }

          if (id.includes('node_modules/@supabase/')) {
            return 'vendor-supabase';
          }

          if (id.includes('node_modules/crypto-js/')) {
            return 'vendor-crypto';
          }

          if (id.includes('node_modules/date-fns/')) {
            return 'vendor-date';
          }

          return undefined;
        },
      },
    },
  },
});
