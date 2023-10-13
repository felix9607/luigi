import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import * as csstree from 'css-tree';
import * as fs from 'fs';

const luigiPlugin = () => {
  return {
    enforce: 'pre',
    name: 'luigi-postprocess',
    generateBundle: (options, bundle) => {
      const cssFile = bundle['luigi_core.css'];
      cssFile.source = cssFile.source.replace(/(\.svelte-[a-z0-9]+){2,}/g, match => {
        const singleHash = match.match(/\.svelte-[a-z0-9]+/g)[0];
        return singleHash;
      });
      // console.log(bundle);
      const themingCSS = bundle['theming.css'];
      const fdCSS = bundle['fd.css'];
      let fullCSS = '' + cssFile.source + '\n' + fdCSS.source + '\n' + themingCSS.source;

      fs.writeFileSync('./public/luigi.css', fullCSS);

      const jsFile = bundle['luigi.js'];
      jsFile.code = jsFile.code.replace('__luigi_dyn_import', 'import');

      // parse css and extract custom properties into dedicated file
      const cssVarArray = [];
      const ast = csstree.parse(cssFile.source);
      csstree.walk(ast, node => {
        if (node.type === 'Declaration' && node.property.startsWith('--')) {
          cssVarArray.push(node.property.substring(2));
        }
      });
      fs.writeFileSync('./public/luigi_theme_vars.js', 'window.__luigiThemeVars=' + JSON.stringify(cssVarArray) + ';');
    }
  };
};

export default defineConfig({
  assetsInclude: /\.(png|jpg|gif|svg|eot|ttf|woff|woff2|css)$/,
  base: '',
  build: {
    cssCodeSplit: true,
    assetsInlineLimit: 0,
    sourcemap: true,
    rollupOptions: {
      input: ['src/main.js', 'src/styles/fd.scss', 'src/styles/theming.scss'],
      output: {
        entryFileNames: 'luigi.js',
        format: 'es',
        assetFileNames: assetInfo => {
          if (assetInfo.name.endsWith('main.css')) {
            return 'luigi_core.css';
          } else if (assetInfo.name.endsWith('fd.css')) {
            return 'fd.css';
          } else if (assetInfo.name.endsWith('theming.css')) {
            return 'theming.css';
          }
          return '[name]-[hash][extname]';
        }
      },
      plugins: []
    },
    outDir: 'public'
  },
  publicDir: 'public_root',
  plugins: [luigiPlugin(), svelte()]
});
