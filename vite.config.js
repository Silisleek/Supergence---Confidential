import { defineConfig, loadEnv } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendPort = process.env.ACTIVE_SERVER_PORT || env.PORT || 3001;

  return {
    root: 'client',
    publicDir: command === 'build' ? '../.cache/vite-public' : false,
    plugins: [],
    server: {
      port: 5173,
      watch: {
        ignored: [
          '**/workspace/**',
          '**/data/**',
          '**/scratch/**',
          '**/.sandbox/**',
          '**/*.json',
          '**/*.log',
        ],
      },
      proxy: {
        '/vendor/three': {
          target: `http://localhost:${backendPort}`,
          changeOrigin: true,
        },
        '/api': {
          target: `http://localhost:${backendPort}`,
          changeOrigin: true,
        },
        '/workspace': {
          target: `http://localhost:${backendPort}`,
          changeOrigin: true,
        },
        '/release': {
          target: `http://localhost:${backendPort}`,
          changeOrigin: true,
        },
        '/download': {
          target: `http://localhost:${backendPort}`,
          changeOrigin: true,
        },
        '/ws': {
          target: `ws://localhost:${backendPort}`,
          ws: true,
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: '../dist',
      emptyOutDir: true,
      rollupOptions: {
        input: {
          app: fileURLToPath(new URL('./client/index.html', import.meta.url)),
          guide: fileURLToPath(new URL('./client/guide.html', import.meta.url)),
        },
        external: [
          'three',
          'three/examples/jsm/controls/OrbitControls.js',
          'three/examples/jsm/postprocessing/EffectComposer.js',
          'three/examples/jsm/postprocessing/RenderPass.js',
          'three/examples/jsm/postprocessing/UnrealBloomPass.js',
        ],
      },
    },
    optimizeDeps: {
      exclude: ['three'],
    },
  };
});
