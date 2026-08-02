import path from 'node:path';
import Router from '@koa/router';
import ejs from 'ejs';
import { parser } from 'vite-manifest-parser';

export const publicRouter = new Router();

let template: string = '';

const getTemplate = async () => {
  if (template.length > 0) {
    return template;
  }

  // Dynamic import so esbuild inlines the template as text in the bundle;
  // in dev this code path is never reached (publicRouter is only registered
  // when IS_PRODUCTION=true) so tsx never needs to resolve the .ejs import.
  const { default: templateSource } = await import('../templates/main.ejs');

  const { css, js, preload } = await parser({
    input: 'src/main.tsx',
    outDir: path.join(__dirname, '..', '.vite'),
  });

  template = ejs.render(templateSource, {
    css,
    js,
    preload,
  });

  return template;
};

publicRouter.get(/.*/, async (ctx) => {
  const body = await getTemplate();
  ctx.status = 200;
  ctx.body = body;
});
