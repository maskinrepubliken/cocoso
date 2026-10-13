import { Accounts } from 'meteor/accounts-base';
import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';

import { Box } from '/imports/ui/core';
import { currentUserAtom } from '/imports/state';
import { message } from '/imports/ui/generic/message';

import { ResetPassword } from './index';
import AuthPanel from './AuthPanel';

export default function ResetPasswordPage() {
  const currentUser = useAtomValue(currentUserAtom);
  const [t] = useTranslation('accounts');
  const navigate = useNavigate();
  const { token } = useParams();

  useEffect(() => {
    if (currentUser) {
      navigate(`/@${currentUser.username}`);
    }
  }, [currentUser]);

  const handleResetPassword = ({ password }: { password: string }) => {
    if (!token) {
      return;
    }
    Accounts.resetPassword(token, password, (error?: Error) => {
      if (error) {
        message.error((error as any).reason || error.message);
        return;
      }
      message.success(t('password.message.reset'));
      navigate('/login');
    });
  };

  return (
    <Box pb="8">
      <AuthPanel
        title={t('password.labels.title')}
        lead={t('password.labels.subtitle.reset')}
        links={[
          { to: '/login', label: t('actions.login') },
          { to: '/register', label: t('actions.signup') },
        ]}
      >
        <ResetPassword onResetPassword={handleResetPassword} />
      </AuthPanel>
    </Box>
  );
}
