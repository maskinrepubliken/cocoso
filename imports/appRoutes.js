import { Meteor } from 'meteor/meteor';
import React from 'react';
import { useNavigation } from 'react-router';
import loadable from '@loadable/component';

import WrapperHybrid from '/imports/ui/layout/WrapperHybrid';
import HomeHandler from '/imports/HomeHandler';
import { Loader } from '/imports/ui/core';

// Keep main public listing and entry pages eager for SSR compatibility
import ActivityListHandler from '/imports/ui/pages/activities/ActivityListHandler';
import GroupListHandler from '/imports/ui/pages/groups/GroupListHandler';
import ResourceListHandler from '/imports/ui/pages/resources/ResourceListHandler';
import WorkListHandler from '/imports/ui/pages/works/WorkListHandler';
import UserListHandler from '/imports/ui/pages/profile/UserListHandler';

// Entry/detail pages - keep eager for SSR
import ActivityItemHandler from '/imports/ui/pages/activities/ActivityItemHandler';
import GroupItemHandler from '/imports/ui/pages/groups/GroupItemHandler';
import ResourceItemHandler from '/imports/ui/pages/resources/ResourceItemHandler';
import WorkItemHandler from '/imports/ui/pages/works/WorkItemHandler';
import PageItemHandler from '/imports/ui/pages/pages/PageItemHandler';
import SlugHandler, { SlugChild } from '/imports/ui/pages/locations/SlugHandler';
import LocationLanding from '/imports/ui/pages/locations/LocationLanding';
import ComposablePageHandler from '/imports/ui/pages/composablepages/ComposablePageHandler';
import CalendarHandler from '/imports/ui/pages/calendar/CalendarHandler';

// Route loaders re-run on every URL change by default, including search-param-only
// changes like `?new=true` / `?edit=true` used to toggle the New/Edit modals. Most of
// these loaders don't read the URL at all, so that's a wasted refetch on every modal
// open/close. `revalidateOn` skips revalidation when only the search params change,
// unless one of the given `relevantParams` (params the loader actually reads) changed.
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

const ForgotPasswordPage = loadable(() =>
  import('/imports/ui/pages/auth/ForgotPasswordPage')
);
const ResetPasswordPage = loadable(() =>
  import('/imports/ui/pages/auth/ResetPasswordPage')
);
const Terms = loadable(() => import('/imports/ui/entry/Terms'));
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
const DirectMessagesInbox = loadable(() =>
  import('/imports/ui/pages/messages/DirectMessagesInbox')
);
const DirectMessageThread = loadable(() =>
  import('/imports/ui/pages/messages/DirectMessageThread')
);
const Reports = loadable(() => import('/imports/ui/pages/admin/Reports'));

const EditProfile = loadable(() =>
  import('/imports/ui/pages/profile/EditProfile')
);
const EditProfileGeneral = loadable(() =>
  import('/imports/ui/pages/profile/EditProfileGeneral')
);
const EditProfileLanguage = loadable(() =>
  import('/imports/ui/pages/profile/EditProfileLanguage')
);
const EditProfilePrivacy = loadable(() =>
  import('/imports/ui/pages/profile/EditProfilePrivacy')
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
  getUser,
  getWorks,
  getWork,
  getLocationLanding,
  getHostMembersForAdmin,
  getLocationsForAdmin,
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
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <h2>Something went wrong while loading this page.</h2>
          {this.state.message && (
            <p
              style={{
                color: '#666',
                fontFamily: 'monospace',
                fontSize: '0.85rem',
              }}
            >
              {this.state.message}
            </p>
          )}
          <button
            onClick={() => this.setState({ hasError: false, message: null })}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
          >
            Try Again
          </button>
        </div>
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
    path: 'messages',
    element: createRouteElement(DirectMessagesInbox, props),
    children: [
      {
        path: ':conversationId',
        element: createRouteElement(DirectMessageThread, props),
      },
    ],
  },
  {
    path: 'my-profile',
    element: createRouteElement(EditProfile, props),
    children: [
      {
        path: 'general',
        element: createRouteElement(EditProfileGeneral, props),
      },
      {
        path: 'language',
        element: createRouteElement(EditProfileLanguage, props),
      },
      {
        path: 'privacy',
        element: createRouteElement(EditProfilePrivacy, props),
      },
    ],
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
      {
        path: 'groups/*',
        element: createRouteElement(GroupsAdmin, props),
      },
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
      {
        path: 'works/*',
        element: createRouteElement(WorksAdmin, props),
      },
    ],
  },
  {
    path: 'locations',
    element: createRouteElement(Locations, props),
    loader: async () => await getLocationsForAdmin(),
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

  // /:slug is a profile (/@name) or a location (/limmared); the loader
  // decides, and every child route below it branches on that decision.
  const slugLoader = async ({ params }) => {
    if (isUserSlug(params.slug)) {
      const data = await getUser({ params });
      return { kind: 'user', ...data };
    }
    const location = findLocation(params.slug);
    if (!location) {
      return { kind: 'notFound' };
    }
    return { kind: 'location', location };
  };

  // Under a location every loader receives the location id; under a profile
  // the profile's own loaders run instead (or nothing, for URLs profiles do
  // not have).
  const forLocation = (loader, userLoader) => async (args) => {
    if (isUserSlug(args.params?.slug)) {
      return userLoader ? await userLoader(args) : {};
    }
    const location = findLocation(args.params?.slug);
    if (args.params?.slug && !location) {
      return {};
    }
    return await loader({ ...args, locationId: location?._id });
  };

  // The public listing and entry routes, mounted once at the root and once
  // under /:slug. Under the slug each element switches between the profile
  // component (if any) and the location component.
  const publicRoutes = ({ forSlug }) => {
    const el = (LocationComponent, UserComponent = null) =>
      forSlug
        ? createRouteElement(SlugChild, {
            ...props,
            location: LocationComponent,
            user: UserComponent,
          })
        : createRouteElement(LocationComponent, props);
    const ld = (loader, userLoader = null) =>
      forSlug ? forLocation(loader, userLoader) : loader;

    return [
      {
        path: 'activities',
        children: [
          {
            index: true,
            element: el(ActivityListHandler, MemberActivities),
            loader: ld(
              ({ request, locationId }) => getActivities({ request, locationId }),
              ({ params }) => getActivitiesByUser({ params })
            ),
            shouldRevalidate: revalidateOn(['showPast']),
          },
          {
            path: ':activityId',
            element: el(ActivityItemHandler),
            loader: ld(({ params }) => getActivity({ params })),
            shouldRevalidate: revalidateOn(['edit']),
          },
        ],
      },
      {
        path: 'groups',
        children: [
          {
            index: true,
            element: el(GroupListHandler, MemberGroups),
            loader: ld(
              ({ locationId }) => getGroups({ locationId }),
              ({ params }) => getGroupsByUser({ params })
            ),
            shouldRevalidate: revalidateOn(),
          },
          {
            path: ':groupId/*',
            element: el(GroupItemHandler),
            loader: ld(({ params }) => getGroup({ params })),
            shouldRevalidate: revalidateOn(['edit']),
          },
        ],
      },
      {
        path: 'calendar',
        children: [
          {
            index: true,
            element: el(CalendarHandler),
            loader: ld(({ locationId }) => getCalendarEntries({ locationId })),
            shouldRevalidate: revalidateOn(['edit']),
          },
          {
            path: ':activityId/*',
            element: el(ActivityItemHandler),
            loader: ld(({ params }) => getActivity({ params })),
            shouldRevalidate: revalidateOn(['edit']),
          },
        ],
      },
      {
        path: 'info/:pageTitle',
        element: el(PageItemHandler),
        loader: ld(() => getPages()),
        shouldRevalidate: revalidateOn(['edit']),
      },
      {
        path: 'people',
        element: el(UserListHandler),
        loader: ld(() => getPeople()),
        shouldRevalidate: revalidateOn(),
      },
      {
        path: 'resources',
        children: [
          {
            index: true,
            element: el(ResourceListHandler),
            loader: ld(({ locationId }) => getResources({ locationId })),
            shouldRevalidate: revalidateOn(),
          },
          {
            path: ':resourceId/*',
            element: el(ResourceItemHandler),
            loader: ld(({ params }) => getResource({ params })),
            shouldRevalidate: revalidateOn(['edit']),
          },
        ],
      },
      {
        path: 'works',
        children: [
          {
            index: true,
            element: el(WorkListHandler, MemberWorks),
            loader: ld(
              ({ locationId }) => getWorks({ locationId }),
              ({ params }) => getWorksByUser({ params })
            ),
            shouldRevalidate: revalidateOn(),
          },
        ],
      },
      {
        path: 'cp/:composablePageId',
        element: el(ComposablePageHandler),
        loader: ld(({ params }) => getComposablePage({ params, siteDoc })),
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
        ...publicRoutes({ props, forSlug: false }),
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
                location: LocationLanding,
                emptyForUser: true,
              }),
              loader: async ({ params }) => {
                const location = findLocation(params.slug);
                return location ? await getLocationLanding({ location }) : {};
              },
              shouldRevalidate: revalidateOn(),
            },
            ...publicRoutes({ props, forSlug: true }),
            {
              path: 'works/:workId/*',
              element: createRouteElement(SlugChild, {
                ...props,
                user: WorkItemHandler,
              }),
              loader: async ({ params }) =>
                params.slug.startsWith('@') ? await getWork({ params }) : {},
              shouldRevalidate: revalidateOn(['edit']),
            },
          ],
        },
        {
          path: 'login',
          element: createRouteElement(LoginPage, props),
        },
        {
          path: 'register',
          element: createRouteElement(SignupPage, props),
        },
        {
          path: 'forgot-password',
          element: createRouteElement(ForgotPasswordPage, props),
        },
        {
          path: 'reset-password/:token',
          element: createRouteElement(ResetPasswordPage, props),
        },
        {
          path: 'terms-&-privacy-policy',
          element: createRouteElement(Terms, props),
        },
        {
          path: 'newsletters',
          element: createRouteElement(PreviousNewsletters, props),
          loader: async () => await getNewsletters(),
          children: [
            {
              path: ':newsletterId',
              element: createRouteElement(Newsletter, props),
              loader: async ({ params }) =>
                await getNewsletterById({ params }),
            },
          ],
        },
        {
          path: 'admin',
          element: createRouteElement(AdminContainer, props),
          children: Meteor.isServer ? null : [...getAdminRoutes(props)],
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
