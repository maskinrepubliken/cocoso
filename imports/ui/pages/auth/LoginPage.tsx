import { Meteor } from 'meteor/meteor';
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAtom, useAtomValue } from 'jotai';

import { Box, Center, Image, Modal, Text } from '/imports/ui/core';
import { message } from '/imports/ui/generic/message';
import { call } from '../../../api/_utils/shared';
import { siteAtom, currentUserAtom, roleAtom } from '/imports/state';

import { loginWithPassword } from './functions';
import { Login } from './index';
import AuthPanel from './AuthPanel';
import { clearEncryptionKey } from '/imports/utils/setupEncryption';

export default function LoginPage() {
  const site = useAtomValue(siteAtom);
  const currentUser = useAtomValue(currentUserAtom);
  const [role, setRole] = useAtom(roleAtom);
  const [t] = useTranslation('accounts');
  const [submitted, setSubmitted] = useState(false);
  const [joinModal, setJoinModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) {
      return;
    }
    const membership = currentUser?.memberships?.[0];
    setRole(membership?.role || null);
    if (['participant', 'contributor', 'admin'].includes(membership?.role)) {
      navigate('/admin/my-profile/general');
    } else {
      setJoinModal(true);
    }
  }, [currentUser]);

  const handleSubmit = async (values: any) => {
    if (values?.username?.length < 4 || values?.password?.length < 8) {
      return;
    }
    setSubmitted(true);
    try {
      await loginWithPassword(values.username, values.password);
    } catch (error) {
      message.error(error.reason);
    } finally {
      setSubmitted(false);
    }
  };

  const cancelJoin = () => {
    clearEncryptionKey();
    Meteor.logout();
    setJoinModal(false);
    setSubmitted(false);
    message.info(t('logout.messages.success'));
  };

  const confirmJoin = async () => {
    try {
      await call('setSelfAsParticipant');
      message.success(t('profile.message.participant'));
    } catch (error) {
      message.error(error.reason || error.error);
    }
  };

  return (
    <Box pb="8">
      <AuthPanel
        title={t('login.labels.title')}
        lead={
          <>
            {t('login.labels.subtitle')}{' '}
            <Link className="auth-panel-link" to="/register">
              {t('actions.signup')}
            </Link>
          </>
        }
        links={[
          { to: '/forgot-password', label: t('actions.reset') },
          { to: '/register', label: t('actions.signup') },
        ]}
      >
        <Login isSubmitted={submitted} onSubmit={handleSubmit} />
      </AuthPanel>

      <Modal
        open={joinModal}
        id="login-page-join"
        title={t('profile.joinHost', {
          host: site?.settings?.name,
        })}
        onConfirm={() => confirmJoin()}
        onClose={() => cancelJoin()}
        confirmText={t('profile.join')}
      >
        <Center>
          <Image
            alt={`${site?.settings?.name} logo`}
            src={site?.logo}
            m="4"
            width="4xs"
          />
        </Center>
        <Text fontSize="lg">{t('profile.joinAsParticipantQuestion')}</Text>
      </Modal>
    </Box>
  );
}
