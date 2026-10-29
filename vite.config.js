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
      host: '127.0.0.1',
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
        '/__session': {
          target: `http://127.0.0.1:${backendPort}`,
          changeOrigin: true,
        },
        '/vendor/three': {
          target: `http://127.0.0.1:${backendPort}`,
          changeOrigin: true,
        },
        '/api': {
          target: `http://127.0.0.1:${backendPort}`,
          changeOrigin: true,
        },
        '/workspace': {
          target: `http://127.0.0.1:${backendPort}`,
          changeOrigin: true,
        },
        '/release': {
          target: `http://127.0.0.1:${backendPort}`,
          changeOrigin: true,
        },
        '/download': {
          target: `http://127.0.0.1:${backendPort}`,
          changeOrigin: true,
        },
        '/ws': {
          target: `ws://127.0.0.1:${backendPort}`,
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
