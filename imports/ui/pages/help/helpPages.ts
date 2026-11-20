// The pages of the help section: what the service is, its terms and its
// accessibility statement under /about, and the guidebook for organizers
// and administrators under /guide. The text of each page is in the `help`
// translation files (public/i18n/<lang>/help.yml) under `pages.<key>`.
import { sitePath } from '/imports/api/_utils/paths';

export interface HelpPageRef {
  key: string;
  // The last part of the URL; '' is the group's own address
  slug: string;
}

export interface HelpGroup {
  key: 'about' | 'guide';
  base: string;
  pages: HelpPageRef[];
}

export const HELP_GROUPS: HelpGroup[] = [
  {
    key: 'about',
    base: sitePath('about'),
    pages: [
      { key: 'about', slug: '' },
      { key: 'terms', slug: 'terms' },
      { key: 'accessibility', slug: 'accessibility' },
    ],
  },
  {
    key: 'guide',
    base: sitePath('guide'),
    pages: [
      { key: 'guideStart', slug: '' },
      { key: 'guideAccount', slug: 'account' },
      { key: 'guideEvents', slug: 'events' },
      { key: 'guideManage', slug: 'manage-events' },
      { key: 'guidePlaces', slug: 'places' },
      { key: 'guideProfile', slug: 'your-page' },
      { key: 'guideAdmin', slug: 'administrators' },
    ],
  },
];

export const helpPath = (group: HelpGroup, page: HelpPageRef) =>
  page.slug ? `${group.base}/${page.slug}` : group.base;

// The terms, linked from where an account is made
export const termsPath = helpPath(HELP_GROUPS[0], HELP_GROUPS[0].pages[1]);

export function findHelpPage(groupKey: string, slug = '') {
  const group = HELP_GROUPS.find((g) => g.key === groupKey);
  const page = group?.pages.find((p) => p.slug === slug);
  return group && page ? { group, page } : null;
}
