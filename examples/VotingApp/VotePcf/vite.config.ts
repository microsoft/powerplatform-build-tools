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
      console.info(`closeBundle copy ${resolve(__dirname, 'src/ControlManifest.Input.xml')}`)
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
      formats: ['es', 'umd', 'cjs']
    },
    rollupOptions: {
      external: [
        '@fluentui/react',
        '@fluentui/react/lib/Button',
        '@fluentui/react/lib/ContextualMenu',
        '@fluentui/react/lib/DetailsList',
        '@fluentui/react/lib/Link',
        '@fluentui/react/lib/Overlay',
        '@fluentui/react/lib/ScrollablePane',
        '@fluentui/react/lib/Selection',
        '@fluentui/react/lib/Stack',
        '@fluentui/react/lib/Sticky',
        '@fluentui/react/lib/Text',
        '@fluentui/react/lib/Utilities',
        '@fluentui/set-version',
        '@fluentui/style-utilities',
        'react',
        'react/jsx-runtime',
        'react-dom',
      ],
      output: {
        generatedCode: {
          symbols: false
        },
        preserveModules: false,
        globals: {
          'react': 'React',
          'react-dom': 'ReactDOM',
          '@fluentui/react': 'FluentUIReactv8290',
          '@fluentui/react/lib/Button': 'FluentUIReactv8290',
          '@fluentui/react/lib/ContextualMenu': 'FluentUIReactv8290',
          '@fluentui/react/lib/DetailsList': 'FluentUIReactv8290',
          '@fluentui/react/lib/Link': 'FluentUIReactv8290',
          '@fluentui/react/lib/Overlay': 'FluentUIReactv8290',
          '@fluentui/react/lib/ScrollablePane': 'FluentUIReactv8290',
          '@fluentui/react/lib/Selection': 'FluentUIReactv8290',
          '@fluentui/react/lib/Stack': 'FluentUIReactv8290',
          '@fluentui/react/lib/Sticky': 'FluentUIReactv8290',
          '@fluentui/react/lib/Text': 'FluentUIReactv8290',
          '@fluentui/react/lib/Utilities': 'FluentUIReactv8290',
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
