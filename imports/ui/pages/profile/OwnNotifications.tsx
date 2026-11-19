import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';

import { Button, Flex } from '/imports/ui/core';
import { message } from '/imports/ui/generic/message';
import { call } from '/imports/api/_utils/shared';
import {
  type PushState,
  getPushState,
  turnPushOff,
  turnPushOn,
} from '/imports/ui/utils/webPush';

interface Settings {
  devices: number;
  follows: { activityId: string; title: string }[];
}

// The part of the profile form's settings that is one's own to handle,
// and happens at once rather than on Save: push in this browser, and the
// events one follows. See imports/api/notifications.
export default function OwnNotifications() {
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
    return null;
  }

  const { devices, follows } = settings;
  const canPush = pushState === 'on' || pushState === 'off';

  return (
    <>
      <p className="form-preview-note">
        {t(
          `notifications.push.${
            pushState === 'needs-install' ? 'needsInstall' : pushState
          }`
        )}
        {devices > 0 && (
          <> {t('notifications.push.devices', { count: devices })}</>
        )}
      </p>
      {canPush && (
        <Flex gap="2" wrap="wrap">
          <Button
            disabled={busy}
            size="sm"
            variant="outline"
            onClick={() => setPush(pushState !== 'on')}
          >
            {pushState === 'on'
              ? t('notifications.push.turnOff')
              : t('notifications.push.turnOn')}
          </Button>
          {pushState === 'on' && (
            <Button
              disabled={busy}
              size="sm"
              variant="ghost"
              onClick={testPush}
            >
              {t('notifications.push.test')}
            </Button>
          )}
        </Flex>
      )}

      {follows.length > 0 && (
        <>
          <h4 className="profile-settings-heading">
            {t('notifications.events.following')}
          </h4>
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
        </>
      )}
    </>
  );
}
