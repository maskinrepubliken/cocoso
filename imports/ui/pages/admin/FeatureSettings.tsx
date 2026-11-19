import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import AlertIcon from 'lucide-react/dist/esm/icons/triangle-alert';

import { styled } from '/stitches.config';
import { Button, Heading, Input, Loader, Modal } from '/imports/ui/core';
import { call } from '/imports/api/_utils/shared';
import { message } from '/imports/ui/generic/message';

// Switching whole sections of the site on and off (api/_utils/features.ts).
// Each change takes effect for everyone at once, so it is asked for twice:
// a button that only opens a dialog, and in the dialog the section's name
// typed out before the change can be made.

interface FeatureStatus {
  name: 'groups' | 'works' | 'businesses' | 'documents' | 'discussions';
  enabled: boolean;
  isDefault: boolean;
  defaultEnabled: boolean;
  count: number;
  lastChange?: { enabled: boolean; at: Date; byUsername?: string };
}

const Warning = styled('div', {
  backgroundColor: 'var(--cocoso-colors-red-50)',
  border: '1px solid var(--cocoso-colors-red-200)',
  borderRadius: '12px',
  color: 'var(--cocoso-colors-red-900)',
  display: 'flex',
  gap: '0.75rem',
  margin: '1rem 0 1.5rem',
  padding: '1rem 1.25rem',
  '& svg': {
    color: 'var(--cocoso-colors-red-700)',
    flexShrink: 0,
    height: '1.25rem',
    marginTop: '0.1rem',
    width: '1.25rem',
  },
  '& strong': { display: 'block', marginBottom: '0.25rem' },
  '& p': { margin: 0, lineHeight: 1.5 },
});

const Card = styled('section', {
  backgroundColor: 'var(--cocoso-papper)',
  borderRadius: '16px',
  boxShadow: 'var(--cocoso-skugga)',
  marginBottom: '1rem',
  padding: '1.25rem 1.5rem',
});

const Head = styled('div', {
  alignItems: 'center',
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.75rem',
  justifyContent: 'space-between',
  marginBottom: '0.5rem',
  '& h3': { fontSize: '1.15rem', margin: 0 },
});

const State = styled('span', {
  borderRadius: '999px',
  fontSize: '0.8rem',
  fontWeight: 700,
  marginLeft: '0.6rem',
  padding: '0.15rem 0.6rem',
  variants: {
    on: {
      true: {
        backgroundColor: 'var(--cocoso-colors-theme-100)',
        color: 'var(--cocoso-colors-theme-800)',
      },
      false: {
        backgroundColor: 'var(--cocoso-colors-gray-100)',
        color: 'var(--cocoso-colors-gray-700)',
      },
    },
  },
});

const Line = styled('p', {
  color: 'var(--cocoso-mylla)',
  lineHeight: 1.5,
  margin: '0 0 0.4rem',
  variants: {
    quiet: { true: { color: 'var(--cocoso-mylla-soft)', fontSize: '0.9rem' } },
  },
});

const Effect = styled('p', {
  borderRadius: '10px',
  lineHeight: 1.5,
  margin: '0 0 1rem',
  padding: '0.75rem 1rem',
  variants: {
    off: {
      true: {
        backgroundColor: 'var(--cocoso-colors-red-50)',
        color: 'var(--cocoso-colors-red-900)',
      },
      false: {
        backgroundColor: 'var(--cocoso-colors-theme-50)',
        color: 'var(--cocoso-colors-theme-900)',
      },
    },
  },
});

export default function FeatureSettings() {
  const [t] = useTranslation('admin');
  const [tc] = useTranslation('common');
  const [features, setFeatures] = useState<FeatureStatus[] | null>(null);
  const [asking, setAsking] = useState<FeatureStatus | null>(null);
  const [typed, setTyped] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setFeatures(await call('getFeaturesForAdmin'));
    } catch (error: any) {
      message.error(error.reason || error.error);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const label = (feature: FeatureStatus) =>
    t(`features.items.${feature.name}.label`);

  const close = () => {
    setAsking(null);
    setTyped('');
  };

  // The name as shown, typed by the admin; case and spaces do not matter
  const isTyped =
    asking &&
    typed.trim().toLocaleLowerCase('sv') ===
      label(asking).toLocaleLowerCase('sv');

  const confirm = async () => {
    if (!asking) return;
    if (!isTyped) {
      message.error(t('features.confirm.mismatch'));
      return;
    }
    const next = !asking.enabled;
    setSaving(true);
    try {
      await call('setFeature', asking.name, next, asking.name);
      message.success(
        t('features.confirm.done', {
          name: label(asking),
          state: (next ? t('features.on') : t('features.off')).toLowerCase(),
        })
      );
      // The routes are built once, when the page loads: reload so this
      // admin sees the site as it now is
      window.setTimeout(() => window.location.reload(), 1200);
    } catch (error: any) {
      message.error(error.reason || error.error);
      setSaving(false);
    }
  };

  if (!features) {
    return <Loader />;
  }

  return (
    <div>
      <Heading as="h3" size="md">
        {t('features.title')}
      </Heading>

      <Warning role="note">
        <AlertIcon aria-hidden />
        <div>
          <strong>{t('features.warning.title')}</strong>
          <p>{t('features.warning.body')}</p>
        </div>
      </Warning>

      {features.map((feature) => (
        <Card key={feature.name} aria-labelledby={`feature-${feature.name}`}>
          <Head>
            <h3 id={`feature-${feature.name}`}>
              {label(feature)}
              <State on={feature.enabled}>
                {feature.enabled ? t('features.on') : t('features.off')}
              </State>
            </h3>
            <Button
              colorScheme={feature.enabled ? 'red' : undefined}
              size="sm"
              variant="outline"
              onClick={() => setAsking(feature)}
            >
              {feature.enabled
                ? t('features.switchOff')
                : t('features.switchOn')}
            </Button>
          </Head>
          <Line>{t(`features.items.${feature.name}.about`)}</Line>
          <Line quiet>
            {t(`features.items.${feature.name}.count`, {
              count: feature.count,
            })}
            {' · '}
            {feature.lastChange
              ? t('features.setBy', {
                  name: feature.lastChange.byUsername || '?',
                  when: dayjs(feature.lastChange.at).format('D MMM YYYY HH:mm'),
                })
              : t('features.default')}
          </Line>
          {['groups', 'works', 'businesses'].includes(feature.name) && (
            <Line quiet>{t('features.menuNote')}</Line>
          )}
        </Card>
      ))}

      <Modal
        cancelText={tc('actions.cancel')}
        confirmButtonProps={{
          colorScheme: asking?.enabled ? 'red' : undefined,
          disabled: !isTyped || saving,
          loading: saving,
        }}
        confirmText={
          asking &&
          t(
            asking.enabled
              ? 'features.confirm.yesOff'
              : 'features.confirm.yesOn',
            {
              name: label(asking),
            }
          )
        }
        id="feature-switch"
        open={Boolean(asking)}
        title={
          asking &&
          t(
            asking.enabled
              ? 'features.confirm.titleOff'
              : 'features.confirm.titleOn',
            { name: label(asking) }
          )
        }
        onClose={close}
        onCancel={close}
        onConfirm={confirm}
      >
        {asking && (
          <>
            <Effect off={asking.enabled}>
              {t(
                `features.items.${asking.name}.${
                  asking.enabled ? 'offEffect' : 'onEffect'
                }`
              )}
            </Effect>
            <Line quiet>
              {t(`features.items.${asking.name}.count`, {
                count: asking.count,
              })}
            </Line>
            <label htmlFor="feature-switch-name">
              <Line>{t('features.confirm.type', { name: label(asking) })}</Line>
            </label>
            <Input
              autoComplete="off"
              id="feature-switch-name"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && isTyped) confirm();
              }}
            />
          </>
        )}
      </Modal>
    </div>
  );
}
