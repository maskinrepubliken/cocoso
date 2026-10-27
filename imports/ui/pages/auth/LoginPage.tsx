import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';

import { Box, Button } from '/imports/ui/core';
import { message } from '/imports/ui/generic/message';
import { currentUserAtom } from '/imports/state';

import LinkIcon from 'lucide-react/dist/esm/icons/link';
import LoaderCircle from 'lucide-react/dist/esm/icons/loader-circle';

import { loginWithEmail, takeNewAccount } from './functions';
import ConfirmSignup from './ConfirmSignup';
import EmailLogin from './EmailLogin';
import PasswordLogin from './PasswordLogin';
import AuthPanel from './AuthPanel';

export default function LoginPage({
  mode = 'login',
}: {
  mode?: 'login' | 'signup';
}) {
  const currentUser = useAtomValue(currentUserAtom);
  const [t] = useTranslation('accounts');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const linkToken = searchParams.get('token');
  // Administrators' way in if mail is down — /login?losenord, behind a
  // small grey link under the panel. The server refuses passwords for
  // everyone else.
  const passwordMode = searchParams.has('losenord');
  // The button in the login email lands here with ?token=…
  const [linkState, setLinkState] = useState<
    'checking' | 'failed' | 'confirm' | null
  >(linkToken ? 'checking' : null);
  // A valid link for an address with no account yet: kept to confirm with
  const [pendingLink, setPendingLink] = useState<{
    token: string;
    email: string;
  } | null>(null);

  useEffect(() => {
    if (!linkToken || currentUser) {
      return;
    }
    setSearchParams({}, { replace: true });
    setLinkState('checking');
    loginWithEmail({ token: linkToken })
      .then(() => message.success(t('login.messages.success')))
      .catch((err) => {
        if (err?.error === 'account-not-found') {
          setPendingLink({ token: linkToken, email: err.details?.email || '' });
          setLinkState('confirm');
        } else {
          setLinkState('failed');
        }
      });
  }, [linkToken]);

  useEffect(() => {
    if (!currentUser) {
      return;
    }
    // A confirmed sign-up goes to the welcome screen, not the profile
    if (takeNewAccount()) {
      navigate('/welcome');
      return;
    }
    // Everyone with an account belongs to the site (the server sees to the
    // membership on login), so there is no "join" question any more
    navigate('/admin/my-profile/general');
  }, [currentUser]);

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
  } else if (linkState === 'confirm' && pendingLink) {
    panel = (
      <ConfirmSignup
        credentials={{ token: pendingLink.token }}
        email={pendingLink.email}
        onCancel={() => {
          setPendingLink(null);
          setLinkState(null);
        }}
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

  return <Box pb="8">{panel}</Box>;
}
