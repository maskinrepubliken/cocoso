import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';

import { Box, Text } from '/imports/ui/core';

import { message } from '/imports/ui/generic/message';
import { call } from '../../../api/_utils/shared';
import { currentUserAtom } from '/imports/state';

import { ForgotPassword } from './index';
import AuthPanel from './AuthPanel';

export default function ForgotPasswordPage() {
  const [t] = useTranslation('accounts');
  const [emailSent, setEmailSent] = useState(false);
  const currentUser = useAtomValue(currentUserAtom);
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) {
      return;
    }
    navigate(`/@${currentUser.username}`);
    t('login.messages.success');
  }, [currentUser]);

  const handleForgotPassword = async (email: string) => {
    try {
      await call('resetUserPassword', email);
      message.success(t('password.message.checkMail'));
      setEmailSent(true);
    } catch (error: any) {
      message.error(error?.error?.reason || error?.reason);
    }
  };

  return (
    <Box pb="8">
      <AuthPanel
        title={t('password.labels.title')}
        lead={t('password.labels.subtitle.forgot')}
        links={[
          { to: '/login', label: t('actions.login') },
          { to: '/register', label: t('actions.signup') },
        ]}
      >
        {emailSent ? (
          <Text textAlign="center">{t('password.message.linkSend')}</Text>
        ) : (
          <ForgotPassword onForgotPassword={handleForgotPassword} />
        )}
      </AuthPanel>
    </Box>
  );
}
