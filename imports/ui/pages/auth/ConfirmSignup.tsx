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
  // An account an admin made from an alias, waiting for this person: it
  // is taken over, not created
  invited?: boolean;
  onCancel: () => void;
}

// Shown when a valid code or link belongs to an address with no account:
// nothing is created until the person says so here and accepts the terms
// (the server refuses otherwise — imports/api/users/emailLogin.js). The
// same goes for an account made from an alias and handed to this address:
// its new owner accepts the terms here before the first login.
export default function ConfirmSignup({
  email,
  credentials,
  invited = false,
  onCancel,
}: ConfirmSignupProps) {
  const [t] = useTranslation('accounts');
  const key = invited ? 'emailLogin.invited' : 'emailLogin.confirm';
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    if (!accepted) {
      setError(t(`${key}.needTerms`));
      return;
    }
    setBusy(true);
    setError(null);
    // The welcome screen is for brand new accounts
    markNewAccount(!invited);
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
      title={t(`${key}.title`)}
      lead={
        <Trans
          t={t}
          i18nKey={`${key}.lead`}
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
          {invited ? (
            <li>{t('emailLogin.invited.factProfile')}</li>
          ) : (
            <>
              <li>{t('emailLogin.confirm.factProfile')}</li>
              <li>{t('emailLogin.confirm.factOrganizer')}</li>
            </>
          )}
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
              to="/about/terms"
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
          {t(`${key}.submit`)}
        </Button>
        <button className="auth-text-button" type="button" onClick={onCancel}>
          {t(`${key}.cancel`)}
        </button>
      </form>
    </AuthPanel>
  );
}
