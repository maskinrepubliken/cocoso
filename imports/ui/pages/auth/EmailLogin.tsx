import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Trans, useTranslation } from 'react-i18next';
import { z } from 'zod';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import MailCheck from 'lucide-react/dist/esm/icons/mail-check';

import { Button, Input } from '/imports/ui/core';
import { message } from '/imports/ui/generic/message';
import { call } from '/imports/api/_utils/shared';

import { loginWithEmail } from './functions';
import AuthPanel, { AuthError, AuthPanelProps } from './AuthPanel';
import CodeInput from './CodeInput';
import ConfirmSignup from './ConfirmSignup';

// Matches RESEND_AFTER_MS in imports/api/users/emailLogin.js
const RESEND_AFTER_S = 30;

const isEmail = (value: string) =>
  z.string().email().safeParse(value.trim()).success;

interface EmailLoginProps {
  // Same flow either way — a new address gets the confirm step after its
  // code — but /register and /login say different things
  mode?: 'login' | 'signup';
  links?: AuthPanelProps['links'];
  // An address to start from, e.g. after a dead link
  initialEmail?: string;
}

// The whole login: an address, then the code that was mailed to it. Same
// form for new and returning people; for an address without an account the
// server asks for confirmation first (ConfirmSignup).
export default function EmailLogin({
  mode = 'login',
  links,
  initialEmail = '',
}: EmailLoginProps) {
  const [t, i18n] = useTranslation('accounts');
  const [step, setStep] = useState<'email' | 'code' | 'confirm'>('email');
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wait, setWait] = useState(0);

  // Counts down to when "send a new code" is worth pressing
  useEffect(() => {
    if (wait <= 0) {
      return undefined;
    }
    const timer = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  const errorText = (err: any) =>
    ({
      'login-code-invalid': t('emailLogin.errors.invalidCode'),
      'invalid-email': t('emailLogin.errors.invalidEmail'),
      'too-many-requests': t('emailLogin.errors.tooMany'),
    }[err?.error as string] || t('emailLogin.errors.sendFailed'));

  const requestCode = async () => {
    setBusy(true);
    setError(null);
    try {
      await call('requestLoginCode', email.trim(), i18n.language);
      setStep('code');
      setCode('');
      setWait(RESEND_AFTER_S);
      return true;
    } catch (err: any) {
      setError(errorText(err));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async (value: string) => {
    setBusy(true);
    setError(null);
    try {
      await loginWithEmail({ email: email.trim(), code: value });
      message.success(t('login.messages.success'));
    } catch (err: any) {
      setBusy(false);
      if (err?.error === 'account-not-found') {
        // Right code, no account yet: confirm before anything is created
        setCode(value);
        setStep('confirm');
        return;
      }
      setError(errorText(err));
      setCode('');
    }
  };

  const changeCode = (value: string) => {
    setCode(value);
    if (error) {
      setError(null);
    }
    // The last digit logs in, no extra click
    if (value.length === 6 && !busy) {
      submitCode(value);
    }
  };

  if (step === 'confirm') {
    return (
      <ConfirmSignup
        credentials={{ email: email.trim(), code }}
        email={email.trim()}
        onCancel={() => {
          setStep('email');
          setCode('');
        }}
      />
    );
  }

  if (step === 'code') {
    return (
      <AuthPanel
        icon={<MailCheck />}
        title={t('emailLogin.code.title')}
        lead={
          <Trans
            t={t}
            i18nKey="emailLogin.code.lead"
            values={{ email: email.trim() }}
            components={{ strong: <strong /> }}
          />
        }
        links={links}
        footer={
          <>
            <p>
              {t('emailLogin.code.noMail')}{' '}
              {wait > 0 ? (
                <span>{t('emailLogin.code.resendIn', { seconds: wait })}</span>
              ) : (
                <button
                  className="auth-text-button"
                  disabled={busy}
                  type="button"
                  onClick={async () => {
                    if (await requestCode()) {
                      message.info(t('emailLogin.code.resent'));
                    }
                  }}
                >
                  {t('emailLogin.code.resend')}
                </button>
              )}
            </p>
            <p>
              <button
                className="auth-text-button auth-back"
                type="button"
                onClick={() => {
                  setStep('email');
                  setCode('');
                  setError(null);
                }}
              >
                <ArrowLeft aria-hidden />
                {t('emailLogin.code.otherEmail')}
              </button>
            </p>
          </>
        }
      >
        <form
          className="auth-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (code.length === 6) {
              submitCode(code);
            }
          }}
        >
          <CodeInput
            disabled={busy}
            invalid={Boolean(error)}
            value={code}
            onChange={changeCode}
          />
          {error && <AuthError>{error}</AuthError>}
          <Button
            disabled={code.length !== 6}
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

  return (
    <AuthPanel
      title={t(
        mode === 'signup' ? 'emailLogin.signup.title' : 'emailLogin.title'
      )}
      lead={t(mode === 'signup' ? 'emailLogin.signup.lead' : 'emailLogin.lead')}
      links={links}
      footer={
        <p>
          {t('emailLogin.terms')}{' '}
          <Link to="/terms-&-privacy-policy">
            {t('signup.form.terms.terms')}
          </Link>
          .
        </p>
      }
    >
      <form
        className="auth-form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (isEmail(email)) {
            requestCode();
          } else {
            setError(t('emailLogin.errors.invalidEmail'));
          }
        }}
      >
        <label className="auth-field">
          <span className="auth-label">{t('emailLogin.email.label')}</span>
          <Input
            autoComplete="email"
            autoFocus
            invalid={Boolean(error)}
            placeholder={t('emailLogin.email.placeholder')}
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setError(null);
            }}
          />
        </label>
        {error && <AuthError>{error}</AuthError>}
        <Button
          loading={busy}
          rightIcon={<ArrowRight width={18} height={18} aria-hidden />}
          size="lg"
          type="submit"
          css={{ width: '100%', minHeight: '3rem' }}
        >
          {t('emailLogin.email.submit')}
        </Button>
      </form>
    </AuthPanel>
  );
}
