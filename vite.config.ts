import legacy from '@vitejs/plugin-legacy';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  const legacyWithPatch = () => {
    const plugins = legacy({
      targets: ['ios >= 9', 'safari >= 9'],
      renderLegacyChunks: true,
    });
    const pluginsArray = Array.isArray(plugins) ? plugins : [plugins];
    return pluginsArray.map((plugin: any) => {
      if (plugin && typeof plugin.configResolved === 'function') {
        const originalConfigResolved = plugin.configResolved;
        plugin.configResolved = function (this: any, config: any) {
          const context = this || {};
          if (!context.meta) {
            context.meta = { viteVersion: '6.2.3' };
          } else if (!context.meta.viteVersion) {
            context.meta.viteVersion = '6.2.3';
          }
          return originalConfigResolved.call(context, config);
        };
      }
      return plugin;
    });
  };

  return {
    base: './',
    plugins: [
      react(),
      tailwindcss(),
      ...legacyWithPatch(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
