import { Meteor } from 'meteor/meteor';
import { useSubscribe, useTracker } from 'meteor/react-meteor-data';
import React, { Suspense, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import { I18nextProvider } from 'react-i18next';
import { useAtom, useSetAtom } from 'jotai';
import { useHydrateAtoms } from 'jotai/utils';
import { Toaster } from 'react-hot-toast';
import dayjs from 'dayjs';
import 'dayjs/locale/en-gb';
import 'dayjs/locale/sv';
import 'dayjs/locale/tr';
import updateLocale from 'dayjs/plugin/updateLocale';

import useMediaQuery from '/imports/api/_utils/useMediaQuery';
import Memberships from '/imports/api/memberships/membership';
import i18n, { getChosenLang, setDayjsLocale } from '/imports/startup/i18n';
import {
  siteAtom,
  currentUserAtom,
  pageTitlesAtom,
  roleAtom,
  isDesktopAtom,
  isMobileAtom,
  locationsAtom,
  renderedAtom,
  seasonAtom,
} from '/imports/state';
import { applyGlobalStyles } from '/imports/ui/utils/globalStylesManager';
import { resolveSeason } from '/imports/api/_utils/season';
import { restoreKeyFromSession } from '/imports/utils/setupEncryption';
import { restoreViewAsState } from '/imports/utils/viewAs';
import { call } from '/imports/api/_utils/shared';
import { Box, Loader } from '/imports/ui/core';

import HelmetHybrid from './HelmetHybrid';
import DummyWrapper from './DummyWrapper';
import Header from './Header';
import ViewAsBanner from './ViewAsBanner';
import { Footer } from './Footers';

dayjs.extend(updateLocale);

export interface WrapperHybridProps {
  siteDoc: any;
  pageTitles: any[];
  locations?: any[];
  // The seasonal variant the server rendered with; the client resolves the
  // same from its own clock (or ?season=) once hydrated.
  season?: any;
  // Set only by serverRenderer.js — a per-request i18next clone
  // (i18n.cloneInstance) already resolved to the visitor's actual
  // language, so SSR output matches what the client will hydrate with.
  // Never set client-side; falls back to the shared singleton below.
  i18nInstance?: any;
}

export default function WrapperHybrid({
  siteDoc,
  pageTitles,
  locations,
  season: seasonProp,
  i18nInstance,
}: WrapperHybridProps) {
  useHydrateAtoms([
    [locationsAtom, locations || []],
    [seasonAtom, resolveSeason(seasonProp)],
  ]);
  const [season, setSeason] = useAtom(seasonAtom);
  const [site, setCurrentHost] = useAtom(siteAtom);
  const [pTitles, setPageTitles] = useAtom(pageTitlesAtom);
  const setCurrentUser = useSetAtom(currentUserAtom);
  const setRole = useSetAtom(roleAtom);
  const [rendered, setRendered] = useAtom(renderedAtom);

  const isDesktopValue = useMediaQuery('(min-width: 960px)');
  const isMobileValue = useMediaQuery('(max-width: 480px)');
  const setIsDesktop = useSetAtom(isDesktopAtom);
  const setIsMobile = useSetAtom(isMobileAtom);
  const location = useLocation();

  useSubscribe('currentUser');
  useSubscribe('myMemberships');
  const currentUser = useTracker(() => {
    if (Meteor.isClient) {
      const user = Meteor.users.findOne(Meteor.userId());
      if (!user) {
        return null;
      }
      // memberships no longer live on the user doc; reattach from the
      // client-side Memberships minimongo collection (see myMemberships pub)
      const memberships = Memberships.find({ userId: user._id }).fetch();
      return { ...user, memberships };
    }
    return null;
  }, []);

  const setValues = async () => {
    setCurrentHost(await call('getSite'));
    setPageTitles(await call('getPageTitles'));
  };

  const changeLang = () => {
    if (!i18n) return;
    const userLang = currentUser?.lang;
    const hostLang = site?.settings?.lang;
    const lang = userLang || getChosenLang() || hostLang || i18n.language;

    if (lang !== i18n.language) {
      i18n.changeLanguage(lang);
    }
  };

  useEffect(() => {
    setValues();
    restoreKeyFromSession();
    // The browser decides the season from its own clock, with ?season=
    // as a preview override.
    const override = new URLSearchParams(window.location.search).get('season');
    setSeason(resolveSeason(override));
    restoreViewAsState();
    setTimeout(() => {
      setRendered(true);
    }, 1000);
  }, []);

  useEffect(() => {
    setIsDesktop(isDesktopValue);
    setIsMobile(isMobileValue);
  }, [isDesktopValue, isMobileValue]);

  useEffect(() => {
    if (!site) return;
    applyGlobalStyles(site.theme, season);
    // Only apply host language if no user preference has been detected/stored yet.
    // User language is applied in the currentUser effect with higher priority.
    if (!currentUser && !getChosenLang()) {
      const hostLang = site?.settings?.lang;
      if (hostLang && hostLang !== i18n.language) {
        i18n.changeLanguage(hostLang);
      }
    }
  }, [site, season]);

  useEffect(() => {
    if (!i18n || !i18n.language) {
      return;
    }
    let culture = 'en-GB';
    if (i18n.language !== 'en') {
      culture = i18n.language;
    }
    dayjs.updateLocale(culture, {
      weekStart: 1,
    });
    setDayjsLocale(i18n.language);
  }, [i18n?.language]);

  useEffect(() => {
    if (!currentUser) return;
    setCurrentUser(currentUser);
    setRole(currentUser?.memberships?.[0]?.role || null);
    changeLang();
  }, [currentUser]);

  const pathname = location?.pathname;
  const pathnameSplitted = pathname.split('/');
  const adminPage = pathnameSplitted[1] === 'admin';

  useEffect(() => {
    if (pathnameSplitted[1][0] === '@' && !pathnameSplitted[3]) {
      return;
    }
    window.scrollTo(0, 0);
  }, [pathnameSplitted[2]]);

  return (
    <>
      <HelmetHybrid siteDoc={site || siteDoc} />

      <I18nextProvider i18n={i18nInstance || i18n}>
        <Suspense fallback={<Loader />}>
          <DummyWrapper
            animate={rendered && !isDesktopValue}
            data-season={season}
            theme={site?.theme || siteDoc?.theme}
          >
            <ViewAsBanner />
            {!adminPage && (
              <Header
                site={site || siteDoc}
                pageTitles={pTitles || pageTitles}
              />
            )}

            <Box id="main-content-container">
              <Outlet />
            </Box>

            {!adminPage && <Footer site={site || siteDoc} />}
          </DummyWrapper>
        </Suspense>

        {rendered && (
          <Toaster
            containerStyle={{ minWidth: '120px', zIndex: 999999 }}
            toastOptions={{
              style: {
                background: 'var(--cocoso-papper)',
                borderRadius: 'var(--cocoso-radius-kort)',
                boxShadow: 'var(--cocoso-skugga-meny)',
                color: 'var(--cocoso-mylla)',
                fontFamily: 'var(--cocoso-font-ui)',
                fontWeight: 600,
                padding: '10px 14px',
              },
              success: { iconTheme: { primary: 'var(--cocoso-colors-theme-500)', secondary: '#fff' } },
              error: { iconTheme: { primary: 'var(--cocoso-lingon)', secondary: '#fff' } },
            }}
          />
        )}
      </I18nextProvider>
    </>
  );
}
