import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';

import { Button, Loader } from '/imports/ui/core';
import ThreeDIcon from '/imports/ui/generic/ThreeDIcon';
import { message } from '/imports/ui/generic/message';
import { call } from '/imports/api/_utils/shared';

interface Target {
  kind: 'newsletter' | 'activity';
  email: string;
  title?: string;
}

// /unsubscribe/<token>: the link at the bottom of a newsletter or an event
// update. Says what it stops and waits for a click, so mail scanners that
// open links can't unsubscribe anyone. No login needed; the token is signed
// (imports/api/notifications/unsubscribeLinks.ts).
export default function Unsubscribe() {
  const { token = '' } = useParams();
  const [t] = useTranslation('common');
  const [target, setTarget] = useState<Target | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'done' | 'invalid'>(
    'loading'
  );

  useEffect(() => {
    call('describeUnsubscribe', token)
      .then((found) => {
        setTarget(found as Target);
        setState('ready');
      })
      .catch(() => setState('invalid'));
  }, [token]);

  const confirm = async () => {
    try {
      await call('unsubscribe', token);
      setState('done');
    } catch (error: any) {
      message.error(error?.reason || error?.error);
    }
  };

  if (state === 'loading') {
    return <Loader />;
  }

  let text = t('unsubscribe.invalid');
  if (state === 'done') {
    text = t('unsubscribe.done');
  } else if (state === 'ready' && target) {
    text =
      target.kind === 'activity'
        ? t('unsubscribe.activity', {
            title: target.title,
            email: target.email,
          })
        : t('unsubscribe.newsletter', { email: target.email });
  }

  return (
    <div className="auth-page">
      <div className="auth-column">
        <section className="auth-panel" aria-labelledby="unsubscribe-title">
          <ThreeDIcon
            className="welcome-icon"
            name={state === 'done' ? 'star' : 'mail'}
            size={72}
          />
          <h1 className="auth-title" id="unsubscribe-title">
            {t('unsubscribe.title')}
          </h1>
          <p className="auth-lead">{text}</p>
          {state === 'ready' && (
            <Button onClick={confirm}>{t('unsubscribe.confirm')}</Button>
          )}
          <p className="auth-lead" style={{ marginTop: '1.5rem' }}>
            {t('unsubscribe.settings')}
          </p>
          <Link to="/">{t('unsubscribe.home')}</Link>
        </section>
      </div>
    </div>
  );
}
