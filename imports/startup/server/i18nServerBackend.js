import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

/**
 * i18next backend for the server that reads the translation files from disk.
 *
 * The client loads `public/i18n/<lng>/<ns>.yml` over HTTP. On the server the
 * same HTTP backend would have to fetch from the process that is still
 * starting up, which is unreliable and made SSR render English (or raw keys)
 * for non-English visitors and then fail hydration. Meteor copies `public/`
 * into the client program directory, which is reachable from the server
 * program directory in both development and production bundles:
 *
 *   <build>/programs/server        (process.cwd())
 *   <build>/programs/web.browser/app/i18n/<lng>/<ns>.yml
 */
const CANDIDATE_DIRS = [
  path.resolve(process.cwd(), '../web.browser/app/i18n'),
  path.resolve(process.cwd(), '../web.browser.legacy/app/i18n'),
  // Running outside a Meteor build (scripts, tests): the source tree.
  path.resolve(process.env.PWD || process.cwd(), 'public/i18n'),
];

function findTranslationsDir() {
  return CANDIDATE_DIRS.find((dir) => {
    try {
      return fs.statSync(path.join(dir, 'en', 'common.yml')).isFile();
    } catch {
      return false;
    }
  });
}

class FsBackend {
  constructor(services, options = {}) {
    this.type = 'backend';
    this.init(services, options);
  }

  init(services, options = {}) {
    this.options = options;
    this.dir = options.dir || findTranslationsDir();
    if (!this.dir) {
      console.error(
        '[i18n] Could not locate translation files on disk; looked in',
        CANDIDATE_DIRS
      );
    }
  }

  read(language, namespace, callback) {
    if (!this.dir) {
      callback(new Error('translations directory not found'), false);
      return;
    }
    const file = path.join(this.dir, language, `${namespace}.yml`);
    fs.readFile(file, 'utf8', (error, raw) => {
      if (error) {
        // Missing file: not fatal, i18next falls back to fallbackLng.
        callback(null, {});
        return;
      }
      try {
        callback(null, yaml.load(raw) || {});
      } catch (parseError) {
        callback(parseError, false);
      }
    });
  }
}

FsBackend.type = 'backend';

export default FsBackend;
