import React, { useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { Box, Button, Flex, Input, Text } from '/imports/ui/core';
import FormField from '/imports/ui/forms/FormField';
import { message } from '/imports/ui/generic/message';
import { call } from '/imports/api/_utils/shared';

import { loginWithEmail } from './functions';

const isEmail = (value: string) =>
  z.string().email().safeParse(value.trim()).success;

// The whole login: an address, then the code that was mailed to it. Same
// form for new and returning people — the server makes the account on the
// first successful code.
export default function EmailLogin() {
  const [t, i18n] = useTranslation('accounts');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const errorText = (err: any) =>
    err?.error === 'login-code-invalid'
      ? t('emailLogin.errors.invalidCode')
      : err?.error === 'invalid-email'
        ? t('emailLogin.errors.invalidEmail')
        : err?.error === 'too-many-requests'
          ? t('emailLogin.errors.tooMany')
          : t('emailLogin.errors.sendFailed');

  const requestCode = async () => {
    setBusy(true);
    setError(null);
    try {
      await call('requestLoginCode', email.trim(), i18n.language);
      setStep('code');
    } catch (err: any) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async (value = code) => {
    setBusy(true);
    setError(null);
    try {
      await loginWithEmail({ email: email.trim(), code: value });
      message.success(t('login.messages.success'));
    } catch (err: any) {
      setError(errorText(err));
      setBusy(false);
    }
  };

  const resend = async () => {
    setCode('');
    await requestCode();
    message.info(t('emailLogin.code.resent'));
  };

  if (step === 'code') {
    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submitCode();
        }}
      >
        <Text textAlign="center" css={{ marginBottom: '1rem' }}>
          {t('emailLogin.code.sentTo')} <b>{email.trim()}</b>
        </Text>
        <FormField errorMessage={error} label={t('emailLogin.code.label')}>
          <Input
            autoComplete="one-time-code"
            autoFocus
            inputMode="numeric"
            maxLength={6}
            pattern="[0-9]*"
            value={code}
            style={{
              fontSize: '1.5rem',
              letterSpacing: '0.5em',
              textAlign: 'center',
            }}
            onChange={(event) => {
              const digits = event.target.value.replace(/\D/g, '').slice(0, 6);
              setCode(digits);
              // A pasted or autofilled code logs in without another click
              if (digits.length === 6 && !busy) {
                submitCode(digits);
              }
            }}
          />
        </FormField>
        <Text
          fontSize="sm"
          css={{ color: 'var(--cocoso-mylla-soft)', marginBottom: '1rem' }}
        >
          {t('emailLogin.code.helper')}
        </Text>
        <Flex direction="column" gap="2" w="100%">
          <Button
            disabled={code.length !== 6}
            loading={busy}
            type="submit"
            css={{ width: '100%' }}
          >
            {t('actions.login')}
          </Button>
          <Flex justify="space-between" w="100%">
            <Button
              variant="ghost"
              onClick={() => {
                setStep('email');
                setCode('');
                setError(null);
              }}
            >
              {t('emailLogin.code.otherEmail')}
            </Button>
            <Button disabled={busy} variant="ghost" onClick={resend}>
              {t('emailLogin.code.resend')}
            </Button>
          </Flex>
        </Flex>
      </form>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (isEmail(email)) {
          requestCode();
        }
      }}
    >
      <Text
        textAlign="center"
        css={{ color: 'var(--cocoso-mylla-soft)', marginBottom: '1rem' }}
      >
        {t('emailLogin.lead')}
      </Text>
      <FormField errorMessage={error} label={t('emailLogin.email.label')}>
        <Input
          autoComplete="email"
          autoFocus
          placeholder={t('emailLogin.email.placeholder')}
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </FormField>
      <Box pt="2">
        <Button
          disabled={!isEmail(email)}
          loading={busy}
          type="submit"
          css={{ width: '100%' }}
        >
          {t('emailLogin.email.submit')}
        </Button>
      </Box>
      <Text
        fontSize="sm"
        textAlign="center"
        css={{ color: 'var(--cocoso-mylla-soft)', marginTop: '1rem' }}
      >
        {t('emailLogin.terms')}{' '}
        <Link className="auth-panel-link" to="/terms-&-privacy-policy">
          {t('signup.form.terms.terms')}
        </Link>
      </Text>
    </form>
  );
}
