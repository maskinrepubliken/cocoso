import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { Trans, useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';

import { Button } from '/imports/ui/core';
import ThreeDIcon from '/imports/ui/generic/ThreeDIcon';
import { currentUserAtom, siteAtom } from '/imports/state';

// /welcome: where a confirmed sign-up lands (LoginPage sends them). Says
// the account exists, which address it is on, and what a participant can
// do next — honestly: posting events needs an admin to make you organizer.
export default function WelcomePage() {
  const [t] = useTranslation('accounts');
  const site = useAtomValue(siteAtom);
  const currentUser = useAtomValue(currentUserAtom);
  const navigate = useNavigate();
  const siteName = site?.settings?.name || '';
  const email = currentUser?.emails?.[0]?.address || '';

  // Only for someone logged in; give the account a moment to arrive
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!currentUser) {
        navigate('/login', { replace: true });
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [currentUser]);

  const steps = [
    { icon: 'pencil', key: 'profile' },
    { icon: 'calendar', key: 'events' },
    { icon: 'megaphone', key: 'organizer' },
  ];

  return (
    <div className="auth-page">
      <div className="auth-column welcome-column">
        <section
          className="auth-panel welcome-panel"
          aria-labelledby="welcome-title"
        >
          <ThreeDIcon className="welcome-icon" name="star" size={88} />
          <p className="welcome-kicker">{t('welcome.kicker')}</p>
          <h1 className="auth-title welcome-title" id="welcome-title">
            {t('welcome.title', { site: siteName })}
          </h1>
          {email && (
            <p className="auth-lead">
              <Trans
                t={t}
                i18nKey="welcome.lead"
                values={{ email }}
                components={{ strong: <strong /> }}
              />
            </p>
          )}

          <ol className="welcome-steps">
            {steps.map((step) => (
              <li key={step.key} className="welcome-step">
                <ThreeDIcon name={step.icon} size={44} />
                <div>
                  <h2>{t(`welcome.steps.${step.key}.title`)}</h2>
                  <p>{t(`welcome.steps.${step.key}.text`)}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="welcome-actions">
            <Button
              rightIcon={<ArrowRight width={18} height={18} aria-hidden />}
              size="lg"
              css={{ width: '100%', minHeight: '3rem' }}
              onClick={() => navigate('/admin/my-profile/general')}
            >
              {t('welcome.toProfile')}
            </Button>
            <Link className="auth-panel-link" to="/">
              {t('welcome.toHome')}
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
