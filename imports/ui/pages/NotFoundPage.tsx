import { Link } from 'react-router';
import React from 'react';
import { useTranslation } from 'react-i18next';

import NoticeCard from '/imports/ui/generic/NoticeCard';

import Template from '../layout/Template';

// The page for a link that leads nowhere: a friendly note, not an error code.
export default function NotFoundPage() {
  const [t] = useTranslation('common');

  return (
    <Template>
      <NoticeCard
        icon="zoom"
        title={t('labels.notfound.info')}
        code="404"
        actions={
          <Link className="new-entry-helper-button" to="/">
            {t('labels.notfound.gohome')}
          </Link>
        }
      />
    </Template>
  );
}
