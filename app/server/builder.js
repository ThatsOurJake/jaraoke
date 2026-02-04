const { build } = require('esbuild');

build({
  entryPoints: ['./src/**/*'],
  outdir: 'dist',
  platform: 'node',
  format: 'cjs',
  target: 'node24', // or your Node version
  sourcemap: true,
  bundle: false,
  logLevel: 'info',
  loader: {
    '.ejs': 'copy',
  },
}).catch(() => process.exit(1));
