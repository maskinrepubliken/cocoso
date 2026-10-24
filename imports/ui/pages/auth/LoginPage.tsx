import { Meteor } from 'meteor/meteor';
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAtom, useAtomValue } from 'jotai';

import { Box, Center, Image, Modal, Text } from '/imports/ui/core';
import { message } from '/imports/ui/generic/message';
import { call } from '../../../api/_utils/shared';
import { siteAtom, currentUserAtom, roleAtom } from '/imports/state';

import { loginWithEmail, loginWithPassword } from './functions';
import EmailLogin from './EmailLogin';
import { Login } from './index';
import AuthPanel from './AuthPanel';

export default function LoginPage() {
  const site = useAtomValue(siteAtom);
  const currentUser = useAtomValue(currentUserAtom);
  const [role, setRole] = useAtom(roleAtom);
  const [t] = useTranslation('accounts');
  const [joinModal, setJoinModal] = useState(false);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const linkToken = searchParams.get('token');
  // Administrators' way in if mail is down — /login?losenord, linked from
  // nowhere. The server refuses passwords for everyone else.
  const passwordMode = searchParams.has('losenord');
  const [submitted, setSubmitted] = useState(false);

  const handlePasswordLogin = async (values: any) => {
    setSubmitted(true);
    await loginWithPassword(values.username, values.password);
    setSubmitted(false);
  };

  // The button in the login email lands here with ?token=…
  useEffect(() => {
    if (!linkToken || currentUser) {
      return;
    }
    setSearchParams({}, { replace: true });
    loginWithEmail({ token: linkToken })
      .then(() => message.success(t('login.messages.success')))
      .catch(() => message.error(t('emailLogin.errors.invalidLink')));
  }, [linkToken]);

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

  const cancelJoin = () => {
    Meteor.logout();
    setJoinModal(false);
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
        title={
          passwordMode
            ? t('actions.login')
            : t('emailLogin.title', { site: site?.settings?.name })
        }
      >
        {passwordMode ? (
          <Login isSubmitted={submitted} onSubmit={handlePasswordLogin} />
        ) : (
          <EmailLogin />
        )}
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
