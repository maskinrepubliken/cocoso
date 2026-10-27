import React, { useState } from 'react';
import { Link } from 'react-router';
import { Trans, useTranslation } from 'react-i18next';
import UserPlus from 'lucide-react/dist/esm/icons/user-plus';

import { Button } from '/imports/ui/core';

import AuthPanel, { AuthError } from './AuthPanel';
import { loginWithEmail, markNewAccount } from './functions';

interface ConfirmSignupProps {
  email: string;
  // The code or link token the person already proved, sent again with
  // createAccount once they confirm
  credentials: { email?: string; code?: string; token?: string };
  onCancel: () => void;
}

// Shown when a valid code or link belongs to an address with no account:
// nothing is created until the person says so here and accepts the terms
// (the server refuses otherwise — imports/api/users/emailLogin.js).
export default function ConfirmSignup({
  email,
  credentials,
  onCancel,
}: ConfirmSignupProps) {
  const [t] = useTranslation('accounts');
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    if (!accepted) {
      setError(t('emailLogin.confirm.needTerms'));
      return;
    }
    setBusy(true);
    setError(null);
    markNewAccount();
    try {
      await loginWithEmail({
        ...credentials,
        createAccount: { acceptedTerms: true },
      });
    } catch (err: any) {
      markNewAccount(false);
      setError(
        err?.error === 'login-code-invalid'
          ? t('emailLogin.confirm.expired')
          : t('emailLogin.errors.sendFailed')
      );
      setBusy(false);
    }
  };

  return (
    <AuthPanel
      icon={<UserPlus />}
      title={t('emailLogin.confirm.title')}
      lead={
        <Trans
          t={t}
          i18nKey="emailLogin.confirm.lead"
          values={{ email }}
          components={{ strong: <strong /> }}
        />
      }
    >
      <form
        className="auth-form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          confirm();
        }}
      >
        <ul className="auth-facts">
          <li>{t('emailLogin.confirm.factEmail')}</li>
          <li>{t('emailLogin.confirm.factProfile')}</li>
          <li>{t('emailLogin.confirm.factDelete')}</li>
        </ul>

        <label className="auth-check">
          <input
            checked={accepted}
            type="checkbox"
            onChange={(event) => {
              setAccepted(event.target.checked);
              setError(null);
            }}
          />
          <span>
            {t('emailLogin.confirm.terms')}{' '}
            <Link
              rel="noopener noreferrer"
              target="_blank"
              to="/terms-&-privacy-policy"
            >
              {t('signup.form.terms.terms')}
            </Link>
          </span>
        </label>

        {error && <AuthError>{error}</AuthError>}

        <Button
          disabled={!accepted}
          loading={busy}
          size="lg"
          type="submit"
          css={{ width: '100%', minHeight: '3rem' }}
        >
          {t('emailLogin.confirm.submit')}
        </Button>
        <button className="auth-text-button" type="button" onClick={onCancel}>
          {t('emailLogin.confirm.cancel')}
        </button>
      </form>
    </AuthPanel>
  );
}
