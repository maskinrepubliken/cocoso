import { Meteor } from 'meteor/meteor';
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAtom, useAtomValue } from 'jotai';

import { Box, Button, Center, Image, Modal, Text } from '/imports/ui/core';
import { message } from '/imports/ui/generic/message';
import { call } from '../../../api/_utils/shared';
import { siteAtom, currentUserAtom, roleAtom } from '/imports/state';

import LinkIcon from 'lucide-react/dist/esm/icons/link';
import LoaderCircle from 'lucide-react/dist/esm/icons/loader-circle';

import { loginWithEmail } from './functions';
import EmailLogin from './EmailLogin';
import PasswordLogin from './PasswordLogin';
import AuthPanel from './AuthPanel';

export default function LoginPage({
  mode = 'login',
}: {
  mode?: 'login' | 'signup';
}) {
  const site = useAtomValue(siteAtom);
  const currentUser = useAtomValue(currentUserAtom);
  const [role, setRole] = useAtom(roleAtom);
  const [t] = useTranslation('accounts');
  const [joinModal, setJoinModal] = useState(false);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const linkToken = searchParams.get('token');
  // Administrators' way in if mail is down — /login?losenord, behind a
  // small grey link under the panel. The server refuses passwords for
  // everyone else.
  const passwordMode = searchParams.has('losenord');
  // The button in the login email lands here with ?token=…
  const [linkState, setLinkState] = useState<'checking' | 'failed' | null>(
    linkToken ? 'checking' : null
  );

  useEffect(() => {
    if (!linkToken || currentUser) {
      return;
    }
    setSearchParams({}, { replace: true });
    setLinkState('checking');
    loginWithEmail({ token: linkToken })
      .then(() => message.success(t('login.messages.success')))
      .catch(() => setLinkState('failed'));
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

  const links =
    mode === 'signup'
      ? [{ to: '/login', label: t('emailLogin.signup.toLogin') }]
      : [
          { to: '/register', label: t('emailLogin.toSignup') },
          {
            to: '/login?losenord',
            label: t('emailLogin.withPassword'),
            quiet: true,
          },
        ];

  let panel;
  if (currentUser || linkState === 'checking') {
    // Logged in (or logging in from the email link): on the way elsewhere
    panel = (
      <AuthPanel
        icon={<LoaderCircle className="auth-spinner" />}
        title={t('emailLogin.link.busy')}
      />
    );
  } else if (linkState === 'failed') {
    panel = (
      <AuthPanel
        icon={<LinkIcon />}
        tone="error"
        title={t('emailLogin.link.failedTitle')}
        lead={t('emailLogin.errors.invalidLink')}
      >
        <Button
          size="lg"
          css={{ width: '100%', minHeight: '3rem' }}
          onClick={() => setLinkState(null)}
        >
          {t('emailLogin.link.newCode')}
        </Button>
      </AuthPanel>
    );
  } else if (passwordMode) {
    panel = (
      <PasswordLogin
        links={[
          { to: '/login', label: t('emailLogin.withEmail'), quiet: true },
        ]}
      />
    );
  } else {
    panel = <EmailLogin key={mode} links={links} mode={mode} />;
  }

  return (
    <Box pb="8">
      {panel}

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
