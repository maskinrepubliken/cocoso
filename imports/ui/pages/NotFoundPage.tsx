import { Link } from 'react-router';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { Center } from '/imports/ui/core';
import ThreeDIcon from '/imports/ui/generic/ThreeDIcon';

import Template from '../layout/Template';

// The page for a link that leads nowhere: a friendly note, not an error code.
export default function NotFoundPage() {
  const [t] = useTranslation('common');

  return (
    <Template>
      <Center py="12" px="4">
        <div className="new-entry-helper" style={{ maxWidth: '440px' }}>
          <ThreeDIcon name="zoom" size={96} />
          <h3>{t('labels.notfound.info')}</h3>
          <p>404</p>
          <Link className="new-entry-helper-button" to="/">
            {t('labels.notfound.gohome')}
          </Link>
        </div>
      </Center>
    </Template>
  );
}
