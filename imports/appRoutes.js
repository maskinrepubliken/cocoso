import { Meteor } from 'meteor/meteor';
import React from 'react';
import i18n from 'i18next';
import { redirect, useNavigation } from 'react-router';

import { isFeatureEnabled } from '/imports/api/_utils/features';
import { parseTitle } from '/imports/api/_utils/shared';
import { segment, sitePath } from '/imports/api/_utils/paths';
import { termsPath } from '/imports/ui/pages/help/helpPages';
import loadable from '@loadable/component';

import WrapperHybrid from '/imports/ui/layout/WrapperHybrid';
import HomeHandler from '/imports/HomeHandler';
import { Loader } from '/imports/ui/core';
import NoticeCard from '/imports/ui/generic/NoticeCard';

// Keep main public listing and entry pages eager for SSR compatibility
import ActivityListHandler from '/imports/ui/pages/activities/ActivityListHandler';
import GroupListHandler from '/imports/ui/pages/groups/GroupListHandler';
import ResourceListHandler from '/imports/ui/pages/resources/ResourceListHandler';
import WorkListHandler from '/imports/ui/pages/works/WorkListHandler';
import UserListHandler from '/imports/ui/pages/profile/UserListHandler';
import SearchPage from '/imports/ui/pages/search/SearchPage';

// Entry/detail pages - keep eager for SSR
import ActivityItemHandler from '/imports/ui/pages/activities/ActivityItemHandler';
import GroupItemHandler from '/imports/ui/pages/groups/GroupItemHandler';
import ResourceItemHandler from '/imports/ui/pages/resources/ResourceItemHandler';
import BusinessListHandler from '/imports/ui/pages/businesses/BusinessListHandler';
import WorkItemHandler from '/imports/ui/pages/works/WorkItemHandler';
import PageItemHandler from '/imports/ui/pages/pages/PageItemHandler';
import SlugHandler, {
  SlugChild,
} from '/imports/ui/pages/locations/SlugHandler';
import LocationLanding from '/imports/ui/pages/locations/LocationLanding';
import ComposablePageHandler from '/imports/ui/pages/composablepages/ComposablePageHandler';
import CalendarHandler from '/imports/ui/pages/calendar/CalendarHandler';

// Route loaders re-run on every URL change by default, including search-param-only
// changes like `?new=true` / `?edit=true` used to toggle the New/Edit modals. Most of
// these loaders don't read the URL at all, so that's a wasted refetch on every modal
// open/close. `revalidateOn` skips revalidation when only the search params change,
// unless one of the given `relevantParams` (params the loader actually reads) changed.
// Routes of a switched-off feature are left out, so their URLs are a 404.
const ifFeature = (feature, routes) =>
  isFeatureEnabled(feature) ? routes : [];

function revalidateOn(relevantParams = []) {
  return function shouldRevalidate({
    currentUrl,
    nextUrl,
    defaultShouldRevalidate,
  }) {
    // Different page, or an explicit revalidate() (same URL): the default.
    if (
      currentUrl.pathname !== nextUrl.pathname ||
      currentUrl.href === nextUrl.href
    ) {
      return defaultShouldRevalidate;
    }

    return relevantParams.some(
      (key) =>
        currentUrl.searchParams.get(key) !== nextUrl.searchParams.get(key)
    );
  };
}

const LoginPage = loadable(() => import('/imports/ui/pages/auth/LoginPage'));
const SignupPage = loadable(() => import('/imports/ui/pages/auth/SignupPage'));
const WelcomePage = loadable(() =>
  import('/imports/ui/pages/auth/WelcomePage')
);
import HelpPage from '/imports/ui/pages/help/HelpPage';
const NotFoundPage = loadable(() => import('/imports/ui/pages/NotFoundPage'));

const AdminContainer = loadable(() =>
  import('/imports/ui/pages/admin/AdminContainer')
);
const AdminHome = loadable(() => import('/imports/ui/pages/admin/AdminHome'));
const AdminSettings = loadable(() =>
  import('/imports/ui/pages/admin/AdminSettings')
);
const AdminSettingsLogo = loadable(() =>
  import('/imports/ui/pages/admin/AdminSettingsLogo')
);
const AdminSettingsForm = loadable(() =>
  import('/imports/ui/pages/admin/AdminSettingsForm')
);
const AdminSettingsFooter = loadable(() =>
  import('/imports/ui/pages/admin/AdminSettingsFooter')
);
const FeatureSettings = loadable(() =>
  import('/imports/ui/pages/admin/FeatureSettings')
);
const MenuSettings = loadable(() =>
  import('/imports/ui/pages/admin/MenuSettings')
);
const MenuSettingsOrder = loadable(() =>
  import('/imports/ui/pages/admin/MenuSettingsOrder')
);
const MenuSettingsOptions = loadable(() =>
  import('/imports/ui/pages/admin/MenuSettingsOptions')
);
const AdminDesign = loadable(() => import('/imports/ui/pages/admin/design'));
const ThemeHandler = loadable(() =>
  import('/imports/ui/pages/admin/design/ThemeHandler')
);
const MenuDesign = loadable(() =>
  import('/imports/ui/pages/admin/design/MenuDesign')
);
const Members = loadable(() => import('/imports/ui/pages/admin/Members'));
const Locations = loadable(() => import('/imports/ui/pages/admin/Locations'));
const AdminMirrors = loadable(() =>
  import('/imports/ui/pages/admin/AdminMirrors')
);
const Emails = loadable(() => import('/imports/ui/pages/admin/Emails'));
const EmailNewsletter = loadable(() =>
  import('/imports/ui/pages/admin/EmailNewsletter')
);
const ComposablePages = loadable(() =>
  import('/imports/ui/pages/composablepages')
);
const ComposablePageForm = loadable(() =>
  import('/imports/ui/pages/composablepages/ComposablePageForm')
);
const ActivitiesAdmin = loadable(() =>
  import('./ui/pages/admin/listing/ActivitiesAdmin')
);
const CalendarAdmin = loadable(() =>
  import('./ui/pages/admin/listing/CalendarAdmin')
);
const GroupsAdmin = loadable(() =>
  import('./ui/pages/admin/listing/GroupsAdmin')
);
const PagesAdmin = loadable(() =>
  import('./ui/pages/admin/listing/PagesAdmin')
);
const PeopleAdmin = loadable(() =>
  import('./ui/pages/admin/listing/PeopleAdmin')
);
const ResourcesAdmin = loadable(() =>
  import('./ui/pages/admin/listing/ResourcesAdmin')
);
const WorksAdmin = loadable(() =>
  import('./ui/pages/admin/listing/WorksAdmin')
);
const Reports = loadable(() => import('/imports/ui/pages/admin/Reports'));

const MyProfileRedirect = loadable(() =>
  import('/imports/ui/pages/profile/MyProfileRedirect')
);
const Unsubscribe = loadable(() =>
  import('/imports/ui/pages/profile/Unsubscribe')
);
const MemberActivities = loadable(() =>
  import('/imports/ui/pages/activities/MemberActivities')
);
const MemberGroups = loadable(() =>
  import('/imports/ui/pages/groups/MemberGroups')
);
const MemberWorks = loadable(() =>
  import('/imports/ui/pages/works/MemberWorks')
);
const PreviousNewsletters = loadable(() =>
  import('/imports/ui/pages/admin/EmailNewsletter/PreviousNewsletters')
);
const Newsletter = loadable(() =>
  import('/imports/ui/pages/admin/EmailNewsletter/Newsletter')
);

import {
  getHomeLoader,
  getActivities,
  getActivity,
  getCalendarEntries,
  getComposablePage,
  getGroup,
  getGroups,
  getPages,
  getPeople,
  getResources,
  getResource,
  getBusinesses,
  getPlaceOfLegacyBusiness,
  getUser,
  getWorks,
  getWork,
  getLocationLanding,
  getHostMembersForAdmin,
  getLocationsForAdmin,
  getMirrorsForAdmin,
  getEmails,
  getComposablePageTitles,
  getActivitiesByUser,
  getGroupsByUser,
  getWorksByUser,
  getNewsletters,
  getNewsletterById,
  getReports,
} from './loaders';

class RouteErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: null };
  }

  static getDerivedStateFromError(error) {
    if (error) {
      return { hasError: true, message: error?.message || String(error) };
    }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Route loading error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <NoticeCard
          tone="error"
          title={i18n.t('common:labels.pageError.title')}
          code={
            this.state.message && (
              <span style={{ fontFamily: 'monospace', letterSpacing: 0 }}>
                {this.state.message}
              </span>
            )
          }
          actions={
            <>
              <button
                type="button"
                onClick={() =>
                  this.setState({ hasError: false, message: null })
                }
                className="new-entry-helper-button"
              >
                {i18n.t('common:labels.pageError.retry')}
              </button>
              <a className="new-entry-helper-button is-quiet" href="/">
                {i18n.t('common:labels.notfound.gohome')}
              </a>
            </>
          }
        >
          {i18n.t('common:labels.pageError.info')}
        </NoticeCard>
      );
    }

    return this.props.children;
  }
}

function LoadingHandler(props) {
  const navigation = useNavigation();
  const isLoading = navigation.state === 'loading';

  return (
    <>
      {isLoading && <Loader />}
      {props.children}
    </>
  );
}

// The help pages' text is a translation namespace of its own, so it is not
// sent with every other page. The server has it from the start
// (imports/startup/i18n.js); the browser fetches it on the way in.
const loadHelpTexts = async () => {
  if (Meteor.isClient) {
    await i18n.loadNamespaces('help');
  }
  return null;
};

const createRouteElement = (Component, props) => {
  return (
    <RouteErrorBoundary>
      <LoadingHandler>
        <Component {...props} />
      </LoadingHandler>
    </RouteErrorBoundary>
  );
};

const getAdminRoutes = (props) => [
  {
    path: 'home',
    element: createRouteElement(AdminHome, props),
  },
  {
    // The old profile settings: now the profile form on one's own page
    path: 'my-profile/*',
    element: createRouteElement(MyProfileRedirect, props),
  },
  {
    path: 'settings',
    children: [
      {
        path: 'organization',
        element: createRouteElement(AdminSettings, props),
        children: [
          {
            path: 'logo',
            element: createRouteElement(AdminSettingsLogo, props),
          },
          {
            path: 'info',
            element: createRouteElement(AdminSettingsForm, props),
          },
          {
            path: 'footer',
            element: createRouteElement(AdminSettingsFooter, props),
          },
        ],
      },
      {
        path: 'features',
        element: createRouteElement(FeatureSettings, props),
      },
      {
        path: 'design',
        element: createRouteElement(AdminDesign, props),
        children: [
          {
            path: 'theme',
            element: createRouteElement(ThemeHandler, props),
          },
          {
            path: 'navigation',
            element: createRouteElement(MenuDesign, props),
          },
        ],
      },
      {
        path: 'menu',
        element: createRouteElement(MenuSettings, props),
        children: [
          {
            path: 'order',
            element: createRouteElement(MenuSettingsOrder, props),
          },
          {
            path: 'options',
            element: createRouteElement(MenuSettingsOptions, props),
          },
        ],
      },
    ],
  },
  {
    path: 'composable-pages',
    children: [
      {
        index: true,
        element: createRouteElement(ComposablePages, props),
        loader: async () => await getComposablePageTitles(),
      },
      {
        path: ':composablePageId',
        element: createRouteElement(ComposablePageForm, props),
        loader: async ({ params }) => await getComposablePage({ params }),
      },
    ],
  },
  {
    path: 'listing',
    children: [
      {
        path: 'activities/*',
        element: createRouteElement(ActivitiesAdmin, props),
      },
      {
        path: 'calendar/*',
        element: createRouteElement(CalendarAdmin, props),
      },
      ...ifFeature('groups', [
        {
          path: 'groups/*',
          element: createRouteElement(GroupsAdmin, props),
        },
      ]),
      {
        path: 'info/*',
        element: createRouteElement(PagesAdmin, props),
      },
      {
        path: 'people/*',
        element: createRouteElement(PeopleAdmin, props),
      },
      {
        path: 'resources/*',
        element: createRouteElement(ResourcesAdmin, props),
      },
      ...ifFeature('works', [
        {
          path: 'works/*',
          element: createRouteElement(WorksAdmin, props),
        },
      ]),
    ],
  },
  {
    path: 'locations',
    element: createRouteElement(Locations, props),
    loader: async () => await getLocationsForAdmin(),
  },
  {
    path: 'mirrors',
    element: createRouteElement(AdminMirrors, props),
    loader: async () => await getMirrorsForAdmin(),
  },
  {
    path: 'users',
    element: createRouteElement(Members, props),
    loader: async () => await getHostMembersForAdmin(),
  },
  {
    path: 'emails',
    element: createRouteElement(Emails, props),
    loader: async () => await getEmails(),
  },
  {
    path: 'email-newsletter',
    element: createRouteElement(EmailNewsletter, props),
  },
  {
    path: 'reports',
    element: createRouteElement(Reports, props),
    loader: async () => await getReports(),
  },
];

const isUserSlug = (slug) => typeof slug === 'string' && slug.startsWith('@');

export default function appRoutes(props) {
  const siteDoc = props?.siteDoc;
  const locations = props?.locations || [];
  const findLocation = (slug) =>
    locations.find((location) => location.slug === slug) || null;

  // /:slug is a profile (/@name); anything else there does not exist.
  const slugLoader = async ({ params }) => {
    if (isUserSlug(params.slug)) {
      const data = await getUser({ params });
      return { kind: 'user', ...data };
    }
    return { kind: 'notFound' };
  };

  // Under a profile its own loaders run instead (or nothing, for URLs
  // profiles do not have).
  const forProfile = (userLoader) => async (args) =>
    userLoader && isUserSlug(args.params?.slug) ? await userLoader(args) : {};

  // The sections a profile has, under /@name. Leaf routes on purpose: an
  // index route would outrank an equally good match elsewhere, and
  // /guide/evenemang is a page of the guide, not somebody's events.
  const profileRoute = (section, Component, userLoader, more = {}) => ({
    path: section,
    element: createRouteElement(SlugChild, { ...props, user: Component }),
    loader: forProfile(userLoader),
    shouldRevalidate: revalidateOn(),
    ...more,
  });
  const profileRoutes = () => [
    profileRoute(segment('activities'), MemberActivities, ({ params }) =>
      getActivitiesByUser({ params })
    ),
    ...ifFeature('groups', [
      profileRoute(segment('groups'), MemberGroups, ({ params }) =>
        getGroupsByUser({ params })
      ),
    ]),
    ...ifFeature('works', [
      profileRoute(segment('works'), MemberWorks, ({ params }) =>
        getWorksByUser({ params })
      ),
      profileRoute(
        `${segment('works')}/:workId/*`,
        WorkItemHandler,
        ({ params }) => getWork({ params }),
        { shouldRevalidate: revalidateOn(['edit']) }
      ),
    ]),
  ];

  // The public listing and entry routes
  const publicRoutes = () => {
    const el = (Component) => createRouteElement(Component, props);

    return [
      {
        path: segment('activities'),
        children: [
          {
            index: true,
            element: el(ActivityListHandler),
            loader: ({ request }) => getActivities({ request }),
            shouldRevalidate: revalidateOn(['showPast']),
          },
          {
            path: ':activityId',
            element: el(ActivityItemHandler),
            loader: ({ params }) => getActivity({ params }),
            shouldRevalidate: revalidateOn(['edit']),
          },
        ],
      },
      ...ifFeature('groups', [
        {
          path: segment('groups'),
          children: [
            {
              index: true,
              element: el(GroupListHandler),
              loader: () => getGroups(),
              shouldRevalidate: revalidateOn(),
            },
            {
              path: ':groupId/*',
              element: el(GroupItemHandler),
              loader: ({ params }) => getGroup({ params }),
              shouldRevalidate: revalidateOn(['edit']),
            },
          ],
        },
      ]),
      {
        path: segment('calendar'),
        children: [
          {
            index: true,
            element: el(CalendarHandler),
            loader: () => getCalendarEntries(),
            shouldRevalidate: revalidateOn(['edit']),
          },
          {
            path: ':activityId/*',
            element: el(ActivityItemHandler),
            loader: ({ params }) => getActivity({ params }),
            shouldRevalidate: revalidateOn(['edit']),
          },
        ],
      },
      {
        // /info on its own opens the first page instead of a 404.
        path: segment('info'),
        element: el(NotFoundPage),
        loader: async () => {
          const { pages } = await getPages();
          const first = pages?.[0];
          if (!first) {
            return null;
          }
          return redirect(encodeURI(sitePath('info', parseTitle(first.title))));
        },
      },
      {
        path: `${segment('info')}/:pageTitle`,
        element: el(PageItemHandler),
        loader: () => getPages(),
        shouldRevalidate: revalidateOn(['edit']),
      },
      {
        path: segment('people'),
        element: el(UserListHandler),
        loader: () => getPeople(),
        shouldRevalidate: revalidateOn(),
      },
      {
        path: segment('resources'),
        children: [
          {
            index: true,
            element: el(ResourceListHandler),
            loader: () => getResources(),
            shouldRevalidate: revalidateOn(),
          },
          {
            path: ':resourceId/*',
            element: el(ResourceItemHandler),
            loader: async ({ params, request }) => {
              const data = await getResource({ params });
              // A place left out of the list has no page of its own: it
              // opens over the page of the place it is in. Editing and
              // deleting it still happen here.
              const part = data?.resource;
              const url = new URL(request.url);
              const managing = ['edit', 'delete'].some(
                (key) => url.searchParams.get(key) === 'true'
              );
              if (part?.isUnlisted && part.parentId && !managing) {
                return redirect(
                  `${sitePath('resources', part.parentId)}?part=${part._id}`
                );
              }
              return data;
            },
            shouldRevalidate: revalidateOn(['edit']),
          },
        ],
      },
      // Äta, handla & bo
      ...ifFeature('businesses', [
        {
          path: segment('businesses'),
          children: [
            {
              index: true,
              element: el(BusinessListHandler),
              // Every place, so the place picker can count them all.
              loader: () => getBusinesses(),
              shouldRevalidate: revalidateOn(),
            },
            {
              // An old link to an item: to the place it became
              path: ':businessId',
              loader: async ({ params }) => {
                const resourceId = await getPlaceOfLegacyBusiness({ params });
                return redirect(
                  resourceId
                    ? sitePath('resources', resourceId)
                    : sitePath('businesses')
                );
              },
            },
          ],
        },
      ]),
      ...ifFeature('works', [
        {
          path: segment('works'),
          children: [
            {
              index: true,
              element: el(WorkListHandler),
              loader: () => getWorks(),
              shouldRevalidate: revalidateOn(),
            },
            // A request's page lives under its author. A shared or guessed
            // address without the author goes there instead of a 404.
            {
              path: ':workId',
              element: el(NotFoundPage),
              loader: async ({ params }) => {
                const { works } = await getWorks({});
                const work = works?.find((w) => w._id === params.workId);
                if (!work?.authorUsername) {
                  return null;
                }
                return redirect(
                  sitePath(`@${work.authorUsername}/works`, work._id)
                );
              },
            },
          ],
        },
      ]),
      {
        // All the results for ?q=, from the header's search
        path: segment('search'),
        element: el(SearchPage),
      },
      {
        path: `${segment('cp')}/:composablePageId`,
        element: el(ComposablePageHandler),
        loader: ({ params }) => getComposablePage({ params, siteDoc }),
      },
    ];
  };

  return [
    {
      element: createRouteElement(WrapperHybrid, props),
      children: [
        {
          path: '',
          element: createRouteElement(HomeHandler, props),
          loader: async ({ params, request }) =>
            await getHomeLoader({ siteDoc, params, request }),
        },
        ...publicRoutes(),
        // A place's own page. Its listings are the site's, filtered with
        // ?ort=<slug>.
        {
          path: segment('locations'),
          children: [
            { index: true, loader: () => redirect('/') },
            {
              path: ':locationSlug',
              element: createRouteElement(LocationLanding, props),
              loader: async ({ params }) => {
                const location = findLocation(params.locationSlug);
                return location
                  ? { location, ...(await getLocationLanding({ location })) }
                  : {};
              },
              shouldRevalidate: revalidateOn(),
            },
          ],
        },
        {
          path: segment('login'),
          element: createRouteElement(LoginPage, props),
        },
        {
          path: segment('register'),
          element: createRouteElement(SignupPage, props),
        },
        {
          path: segment('welcome'),
          element: createRouteElement(WelcomePage, props),
        },
        // There are no passwords to reset any more; links to these pages in
        // old emails land on the login form.
        ...['forgot-password', 'reset-password/:token'].map((path) => ({
          path,
          element: createRouteElement(LoginPage, props),
        })),
        // The help section: /about with the terms and the accessibility
        // statement, /guide with the guidebook. Its text is in the `help`
        // translations, fetched before the page is shown.
        ...['about', 'guide'].map((group) => ({
          path: segment(group),
          loader: loadHelpTexts,
          shouldRevalidate: () => false,
          children: ['', ':helpSlug'].map((path) => ({
            ...(path ? { path } : { index: true }),
            element: createRouteElement(HelpPage, { ...props, group }),
          })),
        })),
        // The terms' address until 5.12; old emails and bookmarks point here.
        {
          path: 'terms-&-privacy-policy',
          loader: () => redirect(termsPath),
        },
        // From the link in a newsletter or an event update
        {
          path: `${segment('unsubscribe')}/:token`,
          element: createRouteElement(Unsubscribe, props),
        },
        {
          path: segment('newsletters'),
          element: createRouteElement(PreviousNewsletters, props),
          loader: async () => await getNewsletters(),
          children: [
            {
              path: ':newsletterId',
              element: createRouteElement(Newsletter, props),
              loader: async ({ params }) => await getNewsletterById({ params }),
            },
          ],
        },
        {
          path: 'admin',
          element: createRouteElement(AdminContainer, props),
          children: Meteor.isServer ? null : [...getAdminRoutes(props)],
        },
        // Profiles (/@name) come after everything with a fixed first segment:
        // of two routes that fit an address equally well the first one wins.
        {
          id: 'slug',
          path: ':slug',
          element: createRouteElement(SlugHandler, props),
          loader: async ({ params }) => await slugLoader({ params }),
          shouldRevalidate: revalidateOn(),
          children: [
            {
              index: true,
              element: createRouteElement(SlugChild, {
                ...props,
                emptyForUser: true,
              }),
            },
            ...profileRoutes(),
          ],
        },
        {
          path: 'not-found',
          element: createRouteElement(NotFoundPage, props),
        },
        {
          path: '404',
          element: createRouteElement(NotFoundPage, props),
        },
        {
          path: '*',
          element: createRouteElement(NotFoundPage, props),
        },
      ],
    },
  ];
}
