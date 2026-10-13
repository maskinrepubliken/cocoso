import { Meteor } from 'meteor/meteor';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import I18NextHttpBackend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';
import yaml from 'js-yaml';
import dayjs from 'dayjs';
import 'dayjs/locale/en-gb';
import 'dayjs/locale/sv';
import 'dayjs/locale/tr';

const { cdnServer } = Meteor.settings;

const allLangs = [
  {
    value: 'en',
    label: 'English',
  },
  {
    value: 'sv',
    label: 'Svenska',
  },
  {
    value: 'tr',
    label: 'Türkçe',
  },
];

const defaultLang = 'en';
const isServer = Meteor.isServer;

const path = '/i18n/{{lng}}/{{ns}}.yml';
const loadPath = Meteor.isProduction && cdnServer ? cdnServer + path : path;

// The browser fetches translations over HTTP. The server reads the same
// files from disk (imports/startup/server/i18nServerBackend.js): fetching
// them from itself over HTTP was unreliable during startup and left SSR
// rendering English for non-English visitors, which then failed hydration.
let Backend = I18NextHttpBackend;
if (isServer) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Backend = require('./server/i18nServerBackend').default;
}

const options = {
  backend: {
    loadPath,
    parse: (data) => yaml.load(data),
  },
  // debug: !Meteor.isProduction,
  debug: false,
  defaultNS: 'common',
  detection: isServer
    ? undefined // No browser language detection in SSR
    : {
        order: ['querystring', 'cookie', 'localStorage', 'navigator'],
        caches: ['cookie'],
      },
  fallbackLng: defaultLang,
  interpolation: {
    escapeValue: false,
  },
  lng: isServer ? defaultLang : undefined,
  load: 'languageOnly',
  ns: ['common', 'accounts'],
  preload: ['en'],
  react: {
    // renderToString (imports/startup/server/serverRenderer.js) can't
    // support real Suspense — a boundary that hasn't resolved synchronously
    // just errors out server-side. Keep Suspense only on the client (where
    // it fixes the raw-key flash); server keeps the old synchronous
    // fallback-to-key behavior instead of ever suspending.
    useSuspense: !isServer,
  },
  supportedLngs: allLangs.map((l) => l.value),
};

const initPromise = i18n
  .use(initReactI18next)
  .use(Backend)
  .use(LanguageDetector)
  .init(options);

// Server-only: block Meteor.startup (i.e. run before real traffic is
// served) until common+accounts are actually loaded for all three
// languages, not just the 'en' preload above. Without this,
// serverRenderer.js's renderToString would race an in-flight HTTP-backend
// fetch on every cold request. loadLanguages/loadNamespaces (rather than
// re-calling .init()) is used for the retries, since re-running .init()
// on an already-initialized instance would re-register the .use() plugins.
if (isServer) {
  const ALL_LANGS = allLangs.map((l) => l.value);
  const REQUIRED_NS = ['common', 'accounts'];
  const MAX_ATTEMPTS = 3;
  const RETRY_DELAY_MS = 500;

  const isFullyLoaded = () =>
    ALL_LANGS.every((lng) =>
      REQUIRED_NS.every((ns) => i18n.hasResourceBundle(lng, ns))
    );

  Meteor.startup(async () => {
    await initPromise;

    for (
      let attempt = 1;
      attempt <= MAX_ATTEMPTS && !isFullyLoaded();
      attempt += 1
    ) {
      if (attempt > 1) {
        console.warn(
          `[i18n] retrying server-side namespace load (attempt ${attempt})`
        );
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      }
      try {
        await i18n.loadLanguages(ALL_LANGS);
        await i18n.loadNamespaces(REQUIRED_NS);
      } catch (error) {
        console.error(
          '[i18n] server-side namespace load attempt failed',
          error
        );
      }
    }

    if (!isFullyLoaded()) {
      // Non-fatal: worst case, early requests render in English/raw keys
      // until this recovers on its own via i18next's normal lazy loading.
      console.error(
        '[i18n] server-side translations did not fully load after retries — SSR may serve English/raw keys until this recovers.'
      );
    }
  });
}

// A language the visitor picked in the language menu. Kept in its own
// cookie (the detector's `i18next` cookie is also written on automatic
// detection) so it can outrank the site's language on server and client.
const LANG_CHOICE_COOKIE = 'cocoso-lang';

const getChosenLang = () => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split('; ')
    .find((c) => c.startsWith(`${LANG_CHOICE_COOKIE}=`));
  const value = match && decodeURIComponent(match.split('=')[1]);
  return allLangs.some((l) => l.value === value) ? value : null;
};

const rememberLang = (lang) => {
  if (typeof document === 'undefined') return;
  document.cookie = `${LANG_CHOICE_COOKIE}=${encodeURIComponent(
    lang
  )}; path=/; max-age=31536000; SameSite=Lax`;
};

// Dates follow the interface language. Server and client both set it
// before rendering, so month and weekday names match at hydration.
const setDayjsLocale = (lang) => {
  dayjs.locale(!lang || lang === 'en' ? 'en-gb' : lang);
};

export default i18n;
export {
  allLangs,
  defaultLang,
  setDayjsLocale,
  LANG_CHOICE_COOKIE,
  getChosenLang,
  rememberLang,
};
