import path from 'node:path';
import Router from '@koa/router';
import ejs from 'ejs';
import { parser } from 'vite-manifest-parser';
import { store } from '../data/store';

export const publicRouter = new Router();

let template: string = '';

const getTemplate = async () => {
  if (template.length > 0) {
    return template;
  }

  const { css, js, preload } = await parser({
    input: 'src/main.tsx',
    outDir: path.join(__dirname, '..', '.vite'),
  });

  const compiledTemplate = await new Promise<string>((resolve, reject) => {
    const templateLoc = path.join(__dirname, '..', 'templates', 'main.ejs');
    ejs.renderFile(
      templateLoc,
      {
        css,
        js,
        preload,
        player: store.settings.player,
      },
      (err: Error, str: string) => {
        if (err) {
          return reject(err);
        }

        return resolve(str);
      },
    );
  });

  template = compiledTemplate;

  return template;
};

publicRouter.get(/.*/, async (ctx) => {
  const body = await getTemplate();
  ctx.status = 200;
  ctx.body = body;
});
