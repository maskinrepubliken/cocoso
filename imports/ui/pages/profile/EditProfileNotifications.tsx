import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';

import { siteAtom } from '/imports/state';
import {
  Box,
  Button,
  Checkbox,
  Flex,
  Heading,
  Loader,
  Text,
} from '/imports/ui/core';
import { message } from '/imports/ui/generic/message';
import Boxling from '/imports/ui/pages/admin/Boxling';
import { call } from '/imports/api/_utils/shared';
import {
  type PushState,
  getPushState,
  turnPushOff,
  turnPushOn,
} from '/imports/ui/utils/webPush';

interface Prefs {
  newsletter: boolean;
  eventEmail: boolean;
  eventPush: boolean;
}

interface Settings {
  prefs: Prefs;
  devices: number;
  follows: { activityId: string; title: string }[];
}

const Column = ({ children }: { children: React.ReactNode }) => (
  <Box css={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
    {children}
  </Box>
);

// What the person hears from the site and how: push in this browser,
// updates about events they follow or are signed up for, and the
// newsletter. Saved on the user (notificationPrefs) and in
// pushSubscriptions; see imports/api/notifications.
export default function EditProfileNotifications() {
  const site = useAtomValue(siteAtom);
  const [t] = useTranslation('accounts');
  const [settings, setSettings] = useState<Settings | null>(null);
  const [pushState, setPushState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      setSettings((await call('getMyNotificationSettings')) as Settings);
    } catch (error: any) {
      message.error(error?.reason || error?.error);
    }
  };

  useEffect(() => {
    load();
    getPushState()
      .then(async (state) => {
        // Already on here: make sure it is this person's, not whoever
        // was logged in on this browser before
        if (state === 'on') {
          await turnPushOn();
        }
        setPushState(state);
      })
      .catch(() => setPushState('unsupported'));
  }, []);

  const setPref = async (key: keyof Prefs, value: boolean) => {
    if (!settings) {
      return;
    }
    setSettings({ ...settings, prefs: { ...settings.prefs, [key]: value } });
    try {
      await call('setNotificationPrefs', { [key]: value });
      message.success(t('notifications.saved'));
    } catch (error: any) {
      message.error(error?.reason || error?.error);
      load();
    }
  };

  const setPush = async (on: boolean) => {
    setBusy(true);
    try {
      setPushState(await (on ? turnPushOn() : turnPushOff()));
      await load();
    } catch (error: any) {
      message.error(error?.reason || error?.message || error?.error);
    } finally {
      setBusy(false);
    }
  };

  const testPush = async () => {
    setBusy(true);
    try {
      await call('sendTestPush');
      message.success(t('notifications.push.testSent'));
    } catch (error: any) {
      message.error(error?.reason || error?.error);
    } finally {
      setBusy(false);
    }
  };

  const unfollow = async (activityId: string) => {
    try {
      await call('unfollowActivity', activityId);
      await load();
    } catch (error: any) {
      message.error(error?.reason || error?.error);
    }
  };

  if (!settings || !pushState) {
    return <Loader />;
  }

  const { prefs, devices, follows } = settings;
  const canPush = pushState === 'on' || pushState === 'off';

  return (
    <Box css={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <Boxling>
        <Heading size="md" css={{ marginBottom: '0.75rem' }}>
          {t('notifications.push.title')}
        </Heading>
        <Column>
          <Text>{t('notifications.push.intro')}</Text>
          <Text fontWeight="bold">
            {canPush
              ? t(`notifications.push.${pushState}`)
              : t(
                  `notifications.push.${
                    pushState === 'needs-install' ? 'needsInstall' : pushState
                  }`
                )}
          </Text>
          {devices > 0 && (
            <Text fontSize="sm">
              {t('notifications.push.devices', { count: devices })}
            </Text>
          )}
        </Column>
        {canPush && (
          <Flex gap="2" mt="4" wrap="wrap">
            <Button
              disabled={busy}
              variant={pushState === 'on' ? 'outline' : undefined}
              onClick={() => setPush(pushState !== 'on')}
            >
              {pushState === 'on'
                ? t('notifications.push.turnOff')
                : t('notifications.push.turnOn')}
            </Button>
            {pushState === 'on' && (
              <Button disabled={busy} variant="ghost" onClick={testPush}>
                {t('notifications.push.test')}
              </Button>
            )}
          </Flex>
        )}
      </Boxling>

      <Boxling>
        <Heading size="md" css={{ marginBottom: '0.75rem' }}>
          {t('notifications.events.title')}
        </Heading>
        <Column>
          <Text>{t('notifications.events.intro')}</Text>
          <Checkbox
            checked={prefs.eventEmail}
            id="notify-event-email"
            onChange={({ target: { checked } }) =>
              setPref('eventEmail', checked)
            }
          >
            {t('notifications.events.email')}
          </Checkbox>
          <Checkbox
            checked={prefs.eventPush}
            id="notify-event-push"
            onChange={({ target: { checked } }) =>
              setPref('eventPush', checked)
            }
          >
            {t('notifications.events.push')}
          </Checkbox>
        </Column>

        <Heading size="sm" css={{ margin: '1.25rem 0 0.5rem' }}>
          {t('notifications.events.following')}
        </Heading>
        {follows.length === 0 ? (
          <Text fontSize="sm">{t('notifications.events.none')}</Text>
        ) : (
          <Column>
            {follows.map((follow) => (
              <Flex
                key={follow.activityId}
                align="center"
                justify="space-between"
                gap="2"
              >
                <Link to={`/activities/${follow.activityId}`}>
                  {follow.title}
                </Link>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => unfollow(follow.activityId)}
                >
                  {t('notifications.events.unfollow')}
                </Button>
              </Flex>
            ))}
          </Column>
        )}
      </Boxling>

      <Boxling>
        <Heading size="md" css={{ marginBottom: '0.75rem' }}>
          {t('notifications.newsletter.title')}
        </Heading>
        <Column>
          <Text>
            {t('notifications.newsletter.intro', {
              site: site?.settings?.name || '',
            })}
          </Text>
          <Checkbox
            checked={prefs.newsletter}
            id="notify-newsletter"
            onChange={({ target: { checked } }) =>
              setPref('newsletter', checked)
            }
          >
            {t('notifications.newsletter.label')}
          </Checkbox>
        </Column>
      </Boxling>
    </Box>
  );
}
