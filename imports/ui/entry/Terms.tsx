import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';

import { Box, Heading, Text } from '/imports/ui/core';
import { siteAtom } from '/imports/state';

import Template from '../layout/Template';

interface TermsSection {
  title: string;
  paragraphs: string[];
}

// The site's terms and privacy policy. The text lives in the common
// translation files under `termsPage`, so it can be kept in every language
// and edited without touching code. {{site}} is the site's name.
export default function Terms() {
  const site = useAtomValue(siteAtom);
  const [tc] = useTranslation('common');

  if (!site) {
    return null;
  }

  const siteName = site.settings?.name || '';
  const sections = tc('termsPage.sections', {
    returnObjects: true,
    site: siteName,
  }) as TermsSection[];

  return (
    <Template heading={tc('termsPage.title')}>
      <Box className="text-content" mb="24">
        <Text css={{ color: 'var(--cocoso-mylla-soft)', marginBottom: '1.5rem' }}>
          {tc('termsPage.updated')}
        </Text>
        {Array.isArray(sections) &&
          sections.map((section) => (
            <Box key={section.title} mb="6">
              <Heading as="h2" size="md" css={{ marginBottom: '0.5rem' }}>
                {section.title}
              </Heading>
              {section.paragraphs.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </Box>
          ))}
      </Box>
    </Template>
  );
}
