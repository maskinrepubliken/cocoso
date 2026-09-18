import { call } from './api/_utils/shared';

export async function getHomeLoader({ Host, params, request }) {
  const host = Host?.host;
  const menu = Host?.settings?.menu;
  const homeRouteName = menu && menu[0]?.name;

  switch (homeRouteName) {
    case 'activities':
      return await getActivities({ host, request });
    case 'calendar':
      return await getCalendarEntries({ host });
    case 'groups':
      return await getGroups({ host });
    case 'info':
      return await getPages({ host });
    case 'resources':
      return await getResources({ host });
    case 'works':
      return await getWorks({ host });
    case 'users':
      return await getPeople({ host });
    default:
      return await getComposablePage({ params, Host });
  }
}

export async function getActivities({ request, host }) {
  const url = new URL(request?.url);
  const showPast = url?.searchParams?.get('showPast') === 'true' || false;

  const activities = await call('getAllPublicActivities', showPast, host);

  return {
    activities,
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

export async function getCalendarEntries({ host }) {
  const activities = await call('getAllActivities', host);
  const resources = await call('getResources', host);

  return {
    activities,
    resources,
  };
}

export async function getGroups({ host }) {
  const groups = await call('getGroupsWithMeetings', host);

  return {
    groups,
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

export async function getPages({ host }) {
  const pages = await call('getPages', host);

  return {
    pages,
  };
}

export async function getPeople({ host }) {
  const keywords = await call('getKeywords');
  const users = await call('getHostMembers', host);

  return {
    keywords,
    users,
  };
}

export async function getResources({ host }) {
  const resources = await call('getResources', host);

  return {
    resources,
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

export async function getUser({ host, params }) {
  if (!params) {
    return null;
  }

  const { usernameSlug } = params;
  const username = usernameSlug?.replace('@', '');
  const user = await call('getUserInfo', username, host);

  return {
    user,
  };
}

export async function getWorks({ host }) {
  const works = await call('getAllWorks', host);

  return {
    works,
  };
}

export async function getWork({ params }) {
  if (!params) {
    return null;
  }

  const { usernameSlug, workId } = params;
  const username = usernameSlug?.replace('@', '');
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
    const members = await call('getHostMembersForAdmin');
    return { members };
  } catch {
    return { members: null };
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

export async function getActivitiesByUser({ params, host }) {
  if (!params) {
    return null;
  }

  const { usernameSlug } = params;
  const username = usernameSlug?.replace('@', '');
  const activities = await call('getActivitiesByUser', username, host);

  return {
    activities,
  };
}

export async function getGroupsByUser({ params, host }) {
  if (!params) {
    return null;
  }

  const { usernameSlug } = params;
  const username = usernameSlug?.replace('@', '');
  const groups = await call('getGroupsByUser', username, host);

  return {
    groups,
  };
}

export async function getWorksByUser({ params, host }) {
  if (!params) {
    return null;
  }

  const { usernameSlug } = params;
  const username = usernameSlug?.replace('@', '');
  const works = await call('getWorksByUser', username, host);

  return {
    works,
  };
}

export async function getNewsletters({ host }) {
  const newsletters = await call('getNewsletters', host);
  return {
    newsletters,
  };
}

export async function getNewsletterById({ params, host }) {
  if (!params) {
    return null;
  }
  const { newsletterId } = params;
  const newsletter = await call('getNewsletterById', newsletterId, host);

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
