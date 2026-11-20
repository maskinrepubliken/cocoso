import React from 'react';
import { useTranslation } from 'react-i18next';
import ExternalLinkIcon from 'lucide-react/dist/esm/icons/external-link';

import { styled } from '/stitches.config';

import { Muted, WIDE } from './Section';
import { Occurrence, countPeople, isPastOccurrence } from './occurrences';

const Row = styled('div', {
  alignItems: 'center',
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.625rem',
  marginTop: '1.25rem',
});

export const Action = styled('a', {
  alignItems: 'center',
  borderRadius: '999px',
  cursor: 'pointer',
  display: 'inline-flex',
  fontFamily: 'var(--cocoso-font-ui)',
  fontSize: '0.95rem',
  fontWeight: 700,
  gap: '0.5rem',
  lineHeight: 1.2,
  minHeight: '44px',
  padding: '0.5rem 1.25rem',
  textDecoration: 'none',
  transition: 'background-color 0.15s',
  '& svg': { height: '1.1rem', width: '1.1rem' },
  variants: {
    kind: {
      primary: {
        backgroundColor: 'var(--cocoso-colors-theme-500)',
        boxShadow: 'var(--cocoso-skugga)',
        color: 'white',
        '&:hover': { backgroundColor: 'var(--cocoso-colors-theme-600)' },
      },
      quiet: {
        backgroundColor: 'var(--cocoso-papper)',
        boxShadow: 'var(--cocoso-skugga)',
        color: 'var(--cocoso-colors-theme-800)',
        '&:hover': { backgroundColor: 'var(--cocoso-colors-theme-50)' },
      },
    },
  },
});

// On wide screens sign-up is in view beside the event, in its own card
const onPhone = { [WIDE]: { display: 'none' } };

interface HeroActionsProps {
  activity: {
    _id: string;
    title?: string;
    capacity?: number;
    cancelledAt?: Date;
    isRegistrationDisabled?: boolean;
    isRegistrationEnabled?: boolean;
    mirror?: { kind?: string; sourceUrl?: string };
  };
  occurrence: Occurrence;
}

// On a phone, right under when the event is: the way to sign up (to the
// form further down, or to where a mirrored event is signed up for). The
// same rules as RegistrationSection, which has the form.
export default function HeroActions({
  activity,
  occurrence,
}: HeroActionsProps) {
  const [tc] = useTranslation('common');

  if (activity.cancelledAt || isPastOccurrence(occurrence)) {
    return null;
  }

  const registrationClosed =
    Boolean(activity.isRegistrationDisabled) ||
    activity.isRegistrationEnabled === false;
  const sourceUrl = registrationClosed ? activity.mirror?.sourceUrl : null;
  const sourceHost = sourceUrl
    ? new URL(sourceUrl).hostname.replace(/^www\./, '')
    : '';
  const capacity = activity.capacity || 0;
  const left = capacity
    ? Math.max(capacity - countPeople(occurrence.attendees), 0)
    : null;
  const canSignUp = !registrationClosed && left !== 0;

  const toForm = (event: React.MouseEvent) => {
    const form = document.getElementById('anmalan');
    if (!form) return;
    event.preventDefault();
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    form.querySelector('input')?.focus({ preventScroll: true });
  };

  return (
    <>
      <Row css={onPhone}>
        {sourceUrl ? (
          <Action
            href={sourceUrl}
            css={onPhone}
            kind="primary"
            rel="noopener noreferrer"
            target="_blank"
          >
            {tc(
              activity.mirror?.kind === 'bio-se'
                ? 'event.cta.ticketsAt'
                : 'event.cta.signUpAt',
              { source: sourceHost }
            )}
            <ExternalLinkIcon aria-hidden />
          </Action>
        ) : (
          canSignUp && (
            <Action
              css={onPhone}
              href="#anmalan"
              kind="primary"
              onClick={toForm}
            >
              {tc('event.cta.signUp')}
            </Action>
          )
        )}
      </Row>
      {canSignUp && !sourceUrl && left !== null && (
        <Muted css={{ marginTop: '0.5rem', ...onPhone }}>
          {tc('event.attendees.left', { count: left, capacity })}
        </Muted>
      )}
    </>
  );
}
