const { register } = require("node:module");
const { pathToFileURL } = require("node:url");

const hookCode = `
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('./') || specifier.startsWith('../')) {
    const parentURL = context.parentURL;
    if (parentURL && parentURL.startsWith('file:')) {
      const parentDir = path.dirname(fileURLToPath(parentURL));
      const target = path.resolve(parentDir, specifier);
      if (fs.existsSync(target) && fs.statSync(target).isFile()) {
        return nextResolve(specifier, context);
      }
      if (target.endsWith('.js') && !fs.existsSync(target)) {
        const tsVariant = target.slice(0, -3) + '.ts';
        if (fs.existsSync(tsVariant)) {
          return nextResolve(pathToFileURL(tsVariant).href, context);
        }
      }
      if (fs.existsSync(target + '.js')) {
        return nextResolve(pathToFileURL(target + '.js').href, context);
      }
      if (fs.existsSync(target + '.ts')) {
        return nextResolve(pathToFileURL(target + '.ts').href, context);
      }
      const indexPath = path.join(target, 'index.js');
      if (fs.existsSync(indexPath)) {
        return nextResolve(pathToFileURL(indexPath).href, context);
      }
      const indexTs = path.join(target, 'index.ts');
      if (fs.existsSync(indexTs)) {
        return nextResolve(pathToFileURL(indexTs).href, context);
      }
    }
  }
  return nextResolve(specifier, context);
}
`;

register(`data:text/javascript,${encodeURIComponent(hookCode)}`, pathToFileURL(__filename).href);

let appPromise: Promise<any> | null = null;

function getApp(): Promise<any> {
  if (!appPromise) {
    appPromise = import("../artifacts/api-server/src/app.js").then((mod: any) => mod.default);
  }
  return appPromise;
}

async function handler(req: any, res: any) {
  const app = await getApp();
  return app(req, res);
}

module.exports = handler;
module.exports.default = handler;


