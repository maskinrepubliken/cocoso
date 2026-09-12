import 'i18next';

// i18next v22 types `t()` as possibly returning null unless told otherwise,
// which makes every `t('key')` unusable where a string is required.
// The runtime config never returns null for missing keys (fallbackLng is set),
// so declare that here.
declare module 'i18next' {
  interface CustomTypeOptions {
    returnNull: false;
  }
}
