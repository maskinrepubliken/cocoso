import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import KeyRound from 'lucide-react/dist/esm/icons/key-round';

import { Button, Input } from '/imports/ui/core';
import { message } from '/imports/ui/generic/message';

import { loginWithPasswordAsync } from './functions';
import AuthPanel, { AuthError, AuthPanelProps } from './AuthPanel';

// The administrators' way in if mail is down (/login?losenord). The server
// refuses passwords for everyone else (imports/api/users/passwordLogin.js).
export default function PasswordLogin({
  links,
}: {
  links?: AuthPanelProps['links'];
}) {
  const [t] = useTranslation('accounts');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!username.trim() || !password) {
      setError(t('emailLogin.password.missing'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await loginWithPasswordAsync(username.trim(), password);
      message.success(t('login.messages.success'));
    } catch (err: any) {
      setError(
        err?.error === 'password-login-disabled'
          ? t('emailLogin.errors.passwordDisabled')
          : err?.error === 'too-many-requests'
          ? t('emailLogin.errors.tooMany')
          : t('emailLogin.password.wrong')
      );
      setBusy(false);
    }
  };

  return (
    <AuthPanel
      icon={<KeyRound />}
      title={t('emailLogin.password.title')}
      lead={
        <span className="auth-notice">{t('emailLogin.password.lead')}</span>
      }
      links={links}
    >
      <form
        className="auth-form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <label className="auth-field">
          <span className="auth-label">{t('login.form.username.label')}</span>
          <Input
            autoComplete="username"
            autoFocus
            value={username}
            onChange={(event) => {
              setUsername(event.target.value);
              setError(null);
            }}
          />
        </label>
        <label className="auth-field">
          <span className="auth-label">{t('login.form.password.label')}</span>
          <Input
            autoComplete="current-password"
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setError(null);
            }}
          />
        </label>
        {error && <AuthError>{error}</AuthError>}
        <Button
          loading={busy}
          size="lg"
          type="submit"
          css={{ width: '100%', minHeight: '3rem' }}
        >
          {t('actions.login')}
        </Button>
      </form>
    </AuthPanel>
  );
}
