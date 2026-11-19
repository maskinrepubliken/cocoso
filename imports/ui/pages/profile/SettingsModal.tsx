import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
import { useAtomValue } from 'jotai';

import { call } from '/imports/api/_utils/shared';
import { allLangs, rememberLang } from '/imports/startup/i18n';
import { currentUserAtom, roleAtom, siteAtom } from '/imports/state';
import {
  Button,
  Checkbox,
  Flex,
  Loader,
  Modal,
  Select,
} from '/imports/ui/core';
import { message } from '/imports/ui/generic/message';
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
  username: string;
  name: string;
  lang: string | null;
  prefs: Prefs;
}

interface Follow {
  activityId: string;
  title: string;
}

// In the address: ?settings=me for one's own, ?settings=<username> for an
// admin helping someone
export const SETTINGS_PARAM = 'settings';
export const OWN_SETTINGS = 'me';

// One of the site's languages: "sv-SE" is sv
const siteLang = (lang?: string) =>
  allLangs.find((l) => l.value === (lang || '').slice(0, 2))?.value || 'sv';

// "Den här enheten": push is turned on for each phone or computer by
// itself, so this part is about the one in use and nothing else. It
// happens at once, not on Save.
function ThisDevice() {
  const [t] = useTranslation('accounts');
  const [pushState, setPushState] = useState<PushState | null>(null);
  const [devices, setDevices] = useState(0);
  const [busy, setBusy] = useState(false);

  const countDevices = () =>
    call<{ devices: number }>('getMyNotificationSettings')
      .then((mine) => setDevices(mine.devices))
      .catch(() => null);

  useEffect(() => {
    countDevices();
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
      await countDevices();
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

  const canPush = pushState === 'on' || pushState === 'off';

  return (
    <section className="settings-section is-device">
      <h3>{t('settings.device.title')}</h3>
      <p className="settings-note">{t('settings.device.intro')}</p>
      {pushState && (
        <p className="settings-device-state" data-state={pushState}>
          {t(
            `notifications.push.${
              pushState === 'needs-install' ? 'needsInstall' : pushState
            }`
          )}
        </p>
      )}
      {canPush && (
        <Flex gap="2" wrap="wrap">
          <Button
            disabled={busy}
            size="sm"
            variant={pushState === 'on' ? 'outline' : undefined}
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
      {devices > 0 && (
        <p className="settings-note">
          {t('notifications.push.devices', { count: devices })}
        </p>
      )}
    </section>
  );
}

// The events one follows, each to stop following at once
function Following() {
  const [t] = useTranslation('accounts');
  const [follows, setFollows] = useState<Follow[] | null>(null);

  const load = () =>
    call<{ follows: Follow[] }>('getMyNotificationSettings')
      .then((mine) => setFollows(mine.follows))
      .catch(() => setFollows([]));

  useEffect(() => {
    load();
  }, []);

  const unfollow = async (activityId: string) => {
    try {
      await call('unfollowActivity', activityId);
      await load();
    } catch (error: any) {
      message.error(error?.reason || error?.error);
    }
  };

  if (!follows) {
    return null;
  }
  if (follows.length === 0) {
    return <p className="settings-note">{t('settings.events.none')}</p>;
  }
  return (
    <ul className="settings-follows">
      {follows.map((follow) => (
        <li key={follow.activityId}>
          <Link to={`/activities/${follow.activityId}`}>{follow.title}</Link>
          <Button
            size="xs"
            variant="ghost"
            onClick={() => unfollow(follow.activityId)}
          >
            {t('settings.events.unfollow')}
          </Button>
        </li>
      ))}
    </ul>
  );
}

// The settings, in a dialog of their own: the language, what is sent
// about events followed, the newsletter and, for oneself, push on this
// device. Opened from the account menu under one's picture in the header,
// and from the gear on a profile page (there also by admins, for the
// person whose page it is).
export default function SettingsModal() {
  const currentUser = useAtomValue(currentUserAtom);
  const role = useAtomValue(roleAtom);
  const site = useAtomValue(siteAtom);
  const [searchParams, setSearchParams] = useSearchParams();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [lang, setLang] = useState('sv');
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [saving, setSaving] = useState(false);
  const [t] = useTranslation('accounts');

  const param = searchParams.get(SETTINGS_PARAM);
  const username =
    param === OWN_SETTINGS || !param ? currentUser?.username : param;
  const isSelf = Boolean(username && currentUser?.username === username);
  const open = Boolean(
    param && currentUser && username && (isSelf || role === 'admin')
  );

  const close = () =>
    setSearchParams(
      (params) => {
        const next = new URLSearchParams(params);
        next.delete(SETTINGS_PARAM);
        return next;
      },
      { replace: true }
    );

  // As saved, fetched each time the dialog opens
  useEffect(() => {
    if (!open || !username) {
      setSettings(null);
      return;
    }
    call<Settings>('getProfileSettings', username)
      .then((found) => {
        setSettings(found);
        // Without a language of their own they read the site in the one
        // it is shown in
        setLang(found.lang || siteLang(i18n.language));
        setPrefs(found.prefs);
      })
      .catch((error: any) => {
        message.error(error?.reason || error?.error);
        close();
      });
  }, [open, username]);

  if (!open) {
    return null;
  }

  const save = async () => {
    if (!settings || !prefs) {
      return;
    }
    // Only what was changed: a newsletter choice is consent with a date
    const changed = Object.fromEntries(
      Object.entries(prefs).filter(
        ([key, value]) => value !== settings.prefs[key as keyof Prefs]
      )
    );
    const newLang =
      lang !== (settings.lang || siteLang(i18n.language)) ? lang : undefined;
    setSaving(true);
    try {
      if (newLang || Object.keys(changed).length > 0) {
        await call('setProfileSettings', settings.username, {
          ...(newLang ? { lang: newLang } : {}),
          prefs: changed,
        });
      }
      if (newLang && isSelf) {
        rememberLang(newLang);
        i18n.changeLanguage(newLang);
      }
      message.success(t('settings.saved'));
      close();
    } catch (error: any) {
      message.error(error?.reason || error?.error);
    } finally {
      setSaving(false);
    }
  };

  // "Mina inställningar", or for an admin "Limmareds fotbollsklubbs
  // inställningar" (a name ending in s takes no other)
  const name = settings?.name || username || '';
  const title = isSelf
    ? t('settings.titleMine')
    : t(`settings.${/[sxz]$/i.test(name) ? 'titleOfS' : 'titleOf'}`, { name });
  // "du" for oneself; about someone else it is said without
  const who = isSelf ? 'mine' : 'theirs';

  const check = (key: keyof Prefs, label: string) => (
    <Checkbox
      checked={Boolean(prefs?.[key])}
      id={`settings-${key}`}
      onChange={(event) =>
        setPrefs((now) => now && { ...now, [key]: event.target.checked })
      }
    >
      {label}
    </Checkbox>
  );

  return (
    <Modal
      id="profile-settings"
      open
      size="lg"
      title={title}
      confirmText={t('settings.save')}
      confirmButtonProps={{ isLoading: saving, isDisabled: !settings }}
      onConfirm={save}
      onClose={close}
    >
      {!settings || !prefs ? (
        <Loader />
      ) : (
        <div className="settings-sections">
          <section className="settings-section">
            <h3>{t('settings.language.title')}</h3>
            <Select
              aria-label={t('settings.language.title')}
              value={lang}
              onChange={(event) => setLang(event.target.value)}
            >
              {allLangs.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <p className="settings-note">
              {t(`settings.language.helper.${who}`)}
            </p>
          </section>

          <section className="settings-section">
            <h3>{t(`settings.events.title.${who}`)}</h3>
            <p className="settings-note">{t(`settings.events.intro.${who}`)}</p>
            <div className="settings-checks">
              {check('eventEmail', t('settings.events.email'))}
              {check('eventPush', t('settings.events.push'))}
            </div>
            <p className="settings-note">
              {t(`settings.events.pushHelper.${who}`)}
            </p>
            {isSelf && <Following />}
          </section>

          <section className="settings-section">
            <h3>{t('settings.newsletter.title')}</h3>
            <div className="settings-checks">
              {check('newsletter', t('settings.newsletter.label'))}
            </div>
            <p className="settings-note">
              {t('settings.newsletter.helper', {
                site: site?.settings?.name || '',
              })}
            </p>
          </section>

          {isSelf && <ThisDevice />}
        </div>
      )}
    </Modal>
  );
}
