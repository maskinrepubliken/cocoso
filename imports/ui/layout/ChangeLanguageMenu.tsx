import React from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Box, Select, Text } from '/imports/ui/core';
import { allLangs, rememberLang } from '/imports/startup/i18n';

export interface ChangeLanguageProps {
  hideHelper?: boolean;
  centered?: boolean;
  register?: any;
  select?: string;
  onChange?: (value: string) => void;
}

export default function ChangeLanguage({
  hideHelper = false,
  centered = false,
  register,
  select,
  onChange,
}: ChangeLanguageProps) {
  const { i18n, t: tc } = useTranslation('common');
  const currentLang = i18n.language;

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (onChange) {
      onChange(value);
    } else {
      rememberLang(value);
      i18n.changeLanguage(value);
    }
  };

  return (
    <Box
      p={hideHelper ? '0' : '4'}
      css={{
        backgroundColor: hideHelper ? 'transparent' : 'var(--cocoso-papper)',
        borderRadius: 'var(--cocoso-radius-kort)',
        minWidth: hideHelper ? '160px' : undefined,
      }}
    >
      {!hideHelper && (
        <Text
          fontSize="sm"
          mb="2"
          css={{
            marginBottom: '0.5rem',
            textAlign: 'center',
          }}
        >
          <Trans i18nKey="common:langs.form.label">Preferred Language</Trans>:
        </Text>
      )}
      <Select
        aria-label={tc('langs.label')}
        name="lang"
        placeholder={
          <Trans i18nKey="common:langs.form.holder">Select a language</Trans>
        }
        value={currentLang}
        onChange={handleChange}
        {...(register && register('lang'))}
      >
        {allLangs.map((lang) => (
          <option
            key={lang.value}
            // selected={lang.  value === currentLang}
            value={lang.value}
          >
            {lang.label}
          </option>
        ))}
      </Select>
    </Box>
  );
}
