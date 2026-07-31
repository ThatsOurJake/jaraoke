const { build } = require('esbuild');

build({
  entryPoints: ['./src/index.ts'],
  outfile: 'dist/index.js',
  platform: 'node',
  format: 'cjs',
  target: 'node24',
  bundle: true,
  minify: process.env['DEBUG_BUILD'] !== 'true',
  external: ['pino-pretty'],
  logLevel: 'info',
  loader: {
    '.ejs': 'text',
  },
}).catch(() => process.exit(1));
