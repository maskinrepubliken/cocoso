import { call } from './api/_utils/shared';

// Items filed under the location first, municipality-wide ones after.
function localFirst(items, locationId) {
  if (!locationId || !Array.isArray(items)) {
    return items;
  }
  return [
    ...items.filter((item) => item.locationId === locationId),
    ...items.filter((item) => item.locationId !== locationId),
  ];
}

export async function getHomeLoader({ Host, params, request }) {
  const menu = Host?.settings?.menu;
  const homeRouteName = menu && menu[0]?.name;

  switch (homeRouteName) {
    case 'activities':
      return await getActivities({ request });
    case 'calendar':
      return await getCalendarEntries();
    case 'groups':
      return await getGroups();
    case 'info':
      return await getPages();
    case 'resources':
      return await getResources();
    case 'works':
      return await getWorks();
    case 'users':
      return await getPeople();
    default:
      return await getComposablePage({ params, Host });
  }
}

export async function getActivities({ request, locationId }) {
  const url = new URL(request?.url);
  const showPast = url?.searchParams?.get('showPast') === 'true' || false;

  const activities = await call(
    'getAllPublicActivities',
    showPast,
    locationId || undefined
  );

  return {
    activities: localFirst(activities, locationId),
    showPast,
  };
}

export async function getActivity({ params }) {
  if (!params) {
    return null;
  }

  const { activityId } = params;

  const activity = await call('getActivityById', activityId);

  return {
    activity,
  };
}

export async function getCalendarEntries({ locationId } = {}) {
  const activities = await call('getAllActivities', locationId || undefined);
  const resources = await call('getResources', locationId || undefined);

  return {
    activities,
    resources,
  };
}

export async function getGroups({ locationId } = {}) {
  const groups = await call('getGroupsWithMeetings', locationId || undefined);

  return {
    groups: localFirst(groups, locationId),
  };
}

export async function getGroup({ params }) {
  if (!params) {
    return null;
  }
  const { groupId } = params;
  const group = await call('getGroupWithMeetings', groupId);
  const documents = await call('getDocumentsByAttachments', groupId);

  return {
    documents,
    group,
  };
}

export async function getPages() {
  const pages = await call('getPages');

  return {
    pages,
  };
}

export async function getPeople() {
  const keywords = await call('getKeywords');
  const users = await call('getSiteMembers');

  return {
    keywords,
    users,
  };
}

export async function getResources({ locationId } = {}) {
  const resources = await call('getResources', locationId || undefined);

  return {
    resources: localFirst(resources, locationId),
  };
}

export async function getResource({ params }) {
  if (!params) {
    return null;
  }

  const { resourceId } = params;
  const resource = await call('getResourceById', resourceId);
  const documents = await call('getDocumentsByAttachments', resourceId);

  return {
    documents,
    resource,
  };
}

export async function getUser({ params }) {
  if (!params) {
    return null;
  }

  const { usernameSlug, slug } = params;
  const username = (usernameSlug || slug)?.replace('@', '');
  const user = await call('getUserInfo', username);

  return {
    user,
  };
}

export async function getWorks({ locationId } = {}) {
  const works = await call('getAllWorks', locationId || undefined);

  return {
    works: localFirst(works, locationId),
  };
}

// Data for a location's landing page: what happens there, its venues and
// groups, plus the optional composable page an admin attached to it.
export async function getLocationLanding({ location }) {
  if (!location) {
    return {};
  }
  const locationId = location._id;
  const [activities, resources, groups, composablePage] = await Promise.all([
    call('getAllPublicActivities', false, locationId),
    call('getResources', locationId),
    call('getGroupsWithMeetings', locationId),
    location.landingPageId
      ? call('getComposablePageById', location.landingPageId).catch(() => null)
      : Promise.resolve(null),
  ]);
  const own = (items) =>
    (items || []).filter((item) => item.locationId === locationId);

  return {
    activities: own(activities).slice(0, 6),
    resources: own(resources).slice(0, 8),
    groups: own(groups).slice(0, 6),
    composablePage,
  };
}

export async function getWork({ params }) {
  if (!params) {
    return null;
  }

  const { usernameSlug, slug, workId } = params;
  const username = (usernameSlug || slug)?.replace('@', '');
  const work = await call('getWorkById', workId, username);
  const documents = await call('getDocumentsByAttachments', workId);

  return {
    documents,
    username,
    work,
  };
}

export async function getComposablePage({ params, Host }) {
  let composablePageId = params?.composablePageId;

  if (!composablePageId) {
    composablePageId = Host?.settings?.menu[0]?.name;
  }

  const composablePage = await call('getComposablePageById', composablePageId);

  return {
    composablePage,
  };
}

export async function getHostMembersForAdmin() {
  try {
    const members = await call('getSiteMembersForAdmin');
    return { members };
  } catch {
    return { members: null };
  }
}

export async function getLocationsForAdmin() {
  try {
    const locations = await call('getLocationsForAdmin');
    return { locations };
  } catch {
    return { locations: null };
  }
}

export async function getEmails() {
  try {
    const emails = await call('getEmails');
    return { emails };
  } catch {
    return { emails: null };
  }
}

export async function getComposablePageTitles() {
  try {
    const composablePageTitles = await call('getComposablePageTitles');
    return { composablePageTitles };
  } catch {
    return { composablePageTitles: null };
  }
}

export async function getActivitiesByUser({ params }) {
  if (!params) {
    return null;
  }

  const { usernameSlug, slug } = params;
  const username = (usernameSlug || slug)?.replace('@', '');
  const activities = await call('getActivitiesByUser', username);

  return {
    activities,
  };
}

export async function getGroupsByUser({ params }) {
  if (!params) {
    return null;
  }

  const { usernameSlug, slug } = params;
  const username = (usernameSlug || slug)?.replace('@', '');
  const groups = await call('getGroupsByUser', username);

  return {
    groups,
  };
}

export async function getWorksByUser({ params }) {
  if (!params) {
    return null;
  }

  const { usernameSlug, slug } = params;
  const username = (usernameSlug || slug)?.replace('@', '');
  const works = await call('getWorksByUser', username);

  return {
    works,
  };
}

export async function getNewsletters() {
  const newsletters = await call('getNewsletters');
  return {
    newsletters,
  };
}

export async function getNewsletterById({ params }) {
  if (!params) {
    return null;
  }
  const { newsletterId } = params;
  const newsletter = await call('getNewsletterById', newsletterId);

  return {
    newsletter,
  };
}

// getReports — server method enforces admin-only access.
// Returns null on auth errors (DDP not yet authenticated on refresh); component revalidates once ready.
export async function getReports() {
  try {
    const reports = await call('getReports');
    return { reports };
  } catch {
    return { reports: null };
  }
}
