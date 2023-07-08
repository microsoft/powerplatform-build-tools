// vite.config.js
import { resolve } from 'path'
import * as fs from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const fileRegex = /\.(xml)$/

function myPlugin() {
  return {
    name: 'transform-file',

    closeBundle() {
      console.warn(`closeBundle copy ${resolve(__dirname, 'src/ControlManifest.Input.xml')}`)
      fs.copyFileSync(
        resolve(__dirname, 'src/ControlManifest.Input.xml'),
        resolve(__dirname, 'dist/ControlManifest.xml'))
    },
    transform(src, id) {
      if (fileRegex.test(id)) {
        console.log(`Transforming id: ${id}`)
        return {
          code: src,
          map: null, // provide source map if available
        }
      }
    },
  }
}

export default defineConfig({
  plugins: [ myPlugin() ],
  publicDir: "node_modules/pcf-start",
  assetsInclude: ['**/*.xml'],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  build: {
    // Relative to the root
    outDir: './dist',
    lib: {
      // Could also be a dictionary or array of multiple entry points
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'DPX',
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
          'react': 'React',
          '@fluentui/react': 'FluentUIReactv8290',
        },
        assetFileNames: resolve(__dirname, 'src/ControlManifest.Input.xml'),
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
