import { Meteor } from 'meteor/meteor';
import React from 'react';
import { onPageLoad } from 'meteor/server-render';
import { Autoupdate } from 'meteor/autoupdate';
import { Tracker } from 'meteor/tracker';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';

import appRoutes from '/imports/appRoutes';
import SetupHome from '/imports/ui/pages/setup';
import i18n from '/imports/startup/i18n';

// Meteor's `autoupdate` package tracks whether the server has a newer client
// bundle than the one this tab is running (e.g. after a deploy). Lazily
// loaded routes (loadable()/import()) fetch their chunk from the server keyed
// to the currently loaded bundle version, so once the server has moved on,
// those fetches start failing with "Cannot find module" until the page
// reloads. Rather than reacting to that crash, reload proactively the next
// time navigation goes idle after a new bundle is detected — i.e. right
// after the user finishes a route transition, not while they're mid-edit on
// the current page.
function reloadOnNextIdleAfterUpdate(router) {
  let staleClientDetected = false;
  let wasNavigating = false;

  Tracker.autorun(() => {
    if (Autoupdate.newClientAvailable()) {
      staleClientDetected = true;
    }
  });

  router.subscribe((state) => {
    const isNavigating = state.navigation.state !== 'idle';

    if (staleClientDetected && wasNavigating && !isNavigating) {
      window.location.reload();
    }

    wasNavigating = isNavigating;
  });
}

onPageLoad(async () => {
  const container = document.getElementById('root');

  // i18next's own init (which runs the LanguageDetector plugin, resolving
  // the same querystring/cookie signals serverRenderer.js used) needs to
  // finish before anything mounts — otherwise the client's first render
  // could pick a different language than the server sent, causing exactly
  // the flash-of-English-then-real-language this was meant to fix.
  if (!i18n.isInitialized) {
    await new Promise((resolve) => i18n.on('initialized', resolve));
  }

  const currentHost = await Meteor.callAsync('getSite');
  const pageTitles = await Meteor.callAsync('getPageTitles');
  const locations = await Meteor.callAsync('getLocations');

  if (!currentHost) {
    console.info('No site configured yet. Rendering the setup wizard.');
    const root = createRoot(container);
    root.render(<SetupHome />);
    return;
  }

  const props = {
    Host: currentHost,
    pageTitles,
    locations,
  };

  const router = createBrowserRouter(appRoutes(props));
  reloadOnNextIdleAfterUpdate(router);

  hydrateRoot(container, <RouterProvider router={router} />);
});
