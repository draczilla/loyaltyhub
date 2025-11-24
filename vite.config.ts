import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'esbuild',
    target: 'es2015',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor chunks
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react-vendor';
            }
            if (id.includes('@supabase')) {
              return 'supabase';
            }
            if (id.includes('@stripe')) {
              return 'stripe';
            }
            if (id.includes('lucide-react')) {
              return 'icons';
            }
            if (id.includes('qrcode')) {
              return 'qrcode';
            }
            // Other node_modules
            return 'vendor';
          }

          // Split admin pages into separate chunk
          if (id.includes('/src/pages/SuperAdmin')) {
            return 'admin-pages';
          }

          // Split customer portal into separate chunk
          if (id.includes('/src/pages/Customer')) {
            return 'customer-portal';
          }

          // Split verification pages
          if (id.includes('/src/pages/Verify') || id.includes('/src/pages/AcceptInvitation')) {
            return 'verification';
          }
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
  optimizeDeps: {
    include: [
      '@stripe/stripe-js',
      '@supabase/supabase-js',
      '@supabase/postgrest-js',
      '@supabase/realtime-js',
      '@supabase/storage-js',
      '@supabase/functions-js',
      'react',
      'react-dom',
      'react-router-dom',
      'lucide-react'
    ],
    force: false,
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  server: {
    warmup: {
      clientFiles: ['./src/main.tsx', './src/App.tsx', './src/contexts/AuthContext.tsx', './src/pages/Landing.tsx', './src/pages/Login.tsx'],
    },
  },
});
