// vite.config.js
import { resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  root: 'src',
  build: {
    // Relative to the root
    outDir: '../dist',
    lib: {
      // Could also be a dictionary or array of multiple entry points
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'PCF_bundle',
      // the proper extensions will be added
      fileName: 'bundle',
      formats: ['es', 'umd', 'cjs', 'iife']
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        '@fluentui/react',
      ],
      output: {
        generatedCode: {
          symbols: false
        },
        globals: {
          '@fluentui/react': 'FluentUIReactv8290',
        }
      }
    }
  },
  esbuild: {
    jsx: 'transform',
  },
});

/*
export default defineConfig({
  plugins: [
    react({ jsxRuntime: 'classic' })
  ],
  root: './',
  build: {
    outDir: 'dist',
    lib: {
      // Could also be a dictionary or array of multiple entry points
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'PCF_bundle',
      // the proper extensions will be added
      fileName: 'bundle',
      formats: ['es', 'umd', 'cjs', 'iife']
    },
    rollupOptions: {
      // make sure to externalize deps that shouldn't be bundled
      // into your library
      external: [
        'react',
        'react/jsx-runtime',
        'react-dom',
        '@fluentui/react',
      ],
      output: {
        // Provide global variables to use in the UMD build
        // for externalized deps
        globals: {
          'react': 'react',
          '@fluentui/react': 'FluentUIReact'
        },
        generatedCode: {
          symbols: false
        }
      },
    },
  },
  optimizeDeps: {
    disabled: true,
    include: ['@fluentui/react', 'react'],
    esbuildOptions: {
      // Node.js global to browser globalThis
      define: {
        global: 'globalThis',
      },
    }
  },
  publicDir: "node_modules/pcf-start"
})
*/
