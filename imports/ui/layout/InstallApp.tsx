import { Meteor } from 'meteor/meteor';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';
import BellRingIcon from 'lucide-react/dist/esm/icons/bell-ring';
import CheckIcon from 'lucide-react/dist/esm/icons/check';
import EllipsisVerticalIcon from 'lucide-react/dist/esm/icons/ellipsis-vertical';
import ShareIcon from 'lucide-react/dist/esm/icons/share';
import SmartphoneIcon from 'lucide-react/dist/esm/icons/smartphone';
import SquarePlusIcon from 'lucide-react/dist/esm/icons/square-plus';

import { currentUserAtom } from '/imports/state';
import { Button, Modal } from '/imports/ui/core';
import ThreeDIcon from '/imports/ui/generic/ThreeDIcon';
import {
  type PushState,
  getPushState,
  isIos,
  isStandalone,
  turnPushOn,
} from '/imports/ui/utils/webPush';

// Chrome, Edge and Samsung Internet on Android offer their own install
// dialog through this event, once, early in the page's life: keep it
// from the start so the button can open it later.
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let installPrompt: InstallPromptEvent | null = null;
const promptListeners = new Set<() => void>();

if (Meteor.isClient) {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    installPrompt = event as InstallPromptEvent;
    promptListeners.forEach((listener) => listener());
  });
  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    promptListeners.forEach((listener) => listener());
  });
}

const isAndroid = () => /Android/i.test(navigator.userAgent);

// Safari is the browser on an iPhone that surely has "Add to Home Screen";
// the others gained it in iOS 16.4 but hide it in different places.
const isIosSafari = () =>
  isIos() && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA\//.test(navigator.userAgent);

type Platform = 'ios' | 'android' | 'other';

// "Lägg till på hemskärmen" in the footer, on phones and tablets: a guide
// in two steps, putting the site on the home screen as an app and then
// turning on push notifications (which an iPhone allows only from such an
// app). Opened from the home screen it reads "Slå på notiser" and goes
// away once they are on. Rendered after mount only: it depends on the
// browser.
export default function InstallApp() {
  const [tc] = useTranslation('common');
  const currentUser = useAtomValue(currentUserAtom);
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [standalone, setStandalone] = useState(false);
  const [canPrompt, setCanPrompt] = useState(false);
  const [pushState, setPushState] = useState<PushState | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setPlatform(isIos() ? 'ios' : isAndroid() ? 'android' : 'other');
    setStandalone(isStandalone());
    const onPrompt = () => setCanPrompt(Boolean(installPrompt));
    onPrompt();
    promptListeners.add(onPrompt);
    getPushState()
      .then(setPushState)
      .catch(() => setPushState('unsupported'));
    return () => {
      promptListeners.delete(onPrompt);
    };
  }, []);

  const isPhone = platform === 'ios' || platform === 'android';
  // Nothing to help with: a desktop browser that offers no install, or
  // the app already on the home screen with notifications on (or none)
  if (
    !platform ||
    (!isPhone && !canPrompt) ||
    (standalone && (pushState === 'on' || pushState === 'unsupported'))
  ) {
    return null;
  }

  const t = (key: string) => tc(`installApp.${key}`);

  const install = async () => {
    if (!installPrompt) {
      return;
    }
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    installPrompt = null;
    setCanPrompt(false);
    if (outcome === 'accepted') {
      setStandalone(true);
    }
  };

  const enablePush = async () => {
    setBusy(true);
    try {
      setPushState(await turnPushOn());
    } catch {
      setPushState(await getPushState().catch(() => 'unsupported' as const));
    } finally {
      setBusy(false);
    }
  };

  const installSteps = () => {
    if (canPrompt) {
      return (
        <>
          <p>{t('install.prompt')}</p>
          <Button onClick={install}>{t('install.button')}</Button>
        </>
      );
    }
    if (platform === 'ios') {
      return (
        <>
          <ol className="install-app-list">
            <li>
              <ShareIcon aria-hidden width={18} height={18} />
              <span>{t('install.ios.share')}</span>
            </li>
            <li>
              <SquarePlusIcon aria-hidden width={18} height={18} />
              <span>{t('install.ios.add')}</span>
            </li>
            <li>
              <CheckIcon aria-hidden width={18} height={18} />
              <span>{t('install.ios.confirm')}</span>
            </li>
            <li>
              <SmartphoneIcon aria-hidden width={18} height={18} />
              <span>{t('install.ios.open')}</span>
            </li>
          </ol>
          {!isIosSafari() && (
            <p className="install-app-note">{t('install.ios.otherBrowser')}</p>
          )}
        </>
      );
    }
    return (
      <ol className="install-app-list">
        <li>
          <EllipsisVerticalIcon aria-hidden width={18} height={18} />
          <span>{t('install.android.menu')}</span>
        </li>
        <li>
          <SquarePlusIcon aria-hidden width={18} height={18} />
          <span>{t('install.android.add')}</span>
        </li>
        <li>
          <SmartphoneIcon aria-hidden width={18} height={18} />
          <span>{t('install.android.open')}</span>
        </li>
      </ol>
    );
  };

  const pushStep = () => {
    if (pushState === 'on') {
      return <p className="install-app-done">{t('push.on')}</p>;
    }
    if (pushState === 'needs-install') {
      return <p>{t('push.needsInstall')}</p>;
    }
    if (pushState === 'denied') {
      return <p>{t('push.denied')}</p>;
    }
    if (pushState === 'unsupported') {
      return <p>{t('push.unsupported')}</p>;
    }
    if (!currentUser) {
      return (
        <>
          <p>{t('push.login')}</p>
          <Link
            className="install-app-login"
            to="/login"
            onClick={() => setOpen(false)}
          >
            {tc('menu.guest.login')}
          </Link>
        </>
      );
    }
    return (
      <>
        <p>{t('push.intro')}</p>
        <Button disabled={busy} onClick={enablePush}>
          {t('push.button')}
        </Button>
      </>
    );
  };

  return (
    <>
      <button
        className="site-footer-pill install-app-pill"
        type="button"
        onClick={() => setOpen(true)}
      >
        {standalone ? (
          <BellRingIcon width={16} height={16} />
        ) : (
          <SmartphoneIcon width={16} height={16} />
        )}
        {standalone ? t('pill.push') : t('pill.install')}
      </button>

      <Modal
        hideFooter
        id="install-app"
        open={open}
        title={t('title')}
        onClose={() => setOpen(false)}
      >
        <div className="install-app">
          <p className="install-app-intro">
            <ThreeDIcon name="mobile" size={56} />
            <span>{t('intro')}</span>
          </p>

          <section
            className={`install-app-step${standalone ? ' is-done' : ''}`}
          >
            <h3>
              <span className="install-app-number">
                {standalone ? <CheckIcon width={14} height={14} /> : 1}
              </span>
              {t('install.title')}
            </h3>
            {standalone ? (
              <p className="install-app-done">{t('install.done')}</p>
            ) : (
              installSteps()
            )}
          </section>

          <section
            className={`install-app-step${
              pushState === 'on' ? ' is-done' : ''
            }`}
          >
            <h3>
              <span className="install-app-number">
                {pushState === 'on' ? <CheckIcon width={14} height={14} /> : 2}
              </span>
              {t('push.title')}
            </h3>
            {pushStep()}
          </section>
        </div>
      </Modal>
    </>
  );
}
