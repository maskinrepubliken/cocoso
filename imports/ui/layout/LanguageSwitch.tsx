import React from 'react';
import { useTranslation } from 'react-i18next';
import GlobeIcon from 'lucide-react/dist/esm/icons/globe';

import { allLangs, rememberLang } from '/imports/startup/i18n';

export interface LanguageSwitchProps {
  // 'pill' is the footer's paper pill; 'row' sits inside a menu.
  variant?: 'pill' | 'row';
}

// The language switch: a globe and the languages written out, the current
// one marked, so it reads as a choice and not as a form field.
export default function LanguageSwitch({
  variant = 'pill',
}: LanguageSwitchProps) {
  const { i18n, t: tc } = useTranslation('common');
  const current = i18n.language;
  const choose = (value: string) => {
    rememberLang(value);
    i18n.changeLanguage(value);
  };
  return (
    <div
      className={`site-footer-langs ${variant === 'row' ? 'is-row' : ''}`}
      role="group"
      aria-label={tc('langs.label')}
    >
      <span className="site-footer-langs-icon" aria-hidden>
        <GlobeIcon width={16} height={16} />
      </span>
      {allLangs.map((lang) => (
        <button
          key={lang.value}
          type="button"
          className={`site-footer-lang ${
            current === lang.value ? 'is-active' : ''
          }`}
          aria-pressed={current === lang.value}
          lang={lang.value}
          onClick={() => choose(lang.value)}
        >
          {lang.label}
        </button>
      ))}
    </div>
  );
}
