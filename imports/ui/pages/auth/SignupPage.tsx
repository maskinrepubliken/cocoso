import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';

import { Box } from '/imports/ui/core';
import { currentUserAtom } from '/imports/state';

import { Signup } from './index';
import AuthPanel from './AuthPanel';
import { createAccount } from './functions';

export default function SignupPage() {
  const currentUser = useAtomValue(currentUserAtom);
  const [t] = useTranslation('accounts');
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) {
      return;
    }
    navigate(`/@${currentUser.username}`);
  }, [currentUser]);

  return (
    <Box pb="8">
      <AuthPanel
        title={t('signup.labels.title')}
        lead={
          <>
            {t('signup.labels.subtitle')}{' '}
            <Link className="auth-panel-link" to="/login">
              {t('actions.login')}
            </Link>
          </>
        }
        links={[{ to: '/forgot-password', label: t('actions.reset') }]}
      >
        <Signup onSubmit={(values) => createAccount(values)} />
      </AuthPanel>
    </Box>
  );
}
