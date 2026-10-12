import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': rootDir,
      },
    },
    build: {
      chunkSizeWarningLimit: 1200,
    },
    server: {
      // Allow all hostnames (including published .ai.studio and .vercel.app domains)
      allowedHosts: [
        'fraud-detection-systm.ai.studio',
        '.ai.studio',
        '.vercel.app',
        'localhost',
        '127.0.0.1'
      ],
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    preview: {
      allowedHosts: [
        'fraud-detection-systm.ai.studio',
        '.ai.studio',
        '.vercel.app',
        'localhost',
        '127.0.0.1'
      ],
    },
  };
});
