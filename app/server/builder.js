const { build } = require('esbuild');

build({
  entryPoints: ['./src/**/*'],
  outdir: 'dist',
  platform: 'node',
  format: 'cjs',
  target: 'node24',
  bundle: false,
  logLevel: 'info',
  loader: {
    '.ejs': 'copy',
  },
}).catch(() => process.exit(1));
