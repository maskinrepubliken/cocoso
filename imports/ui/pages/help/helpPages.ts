// The pages of the help section: what the service is, its terms and its
// accessibility statement under /om, and the guidebook for organizers
// and administrators under /guide. The text of each page is in the `help`
// translation files (public/i18n/<lang>/help.yml) under `pages.<key>`.
import { sitePath } from '/imports/api/_utils/paths';

export interface HelpPageRef {
  key: string;
  // The last part of the URL; '' is the group's own address
  slug: string;
  // Put away for now: no address, no link, but its text stays in help.yml.
  // Remove the mark to bring the page back.
  hidden?: boolean;
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
      { key: 'about', slug: '', hidden: true },
      { key: 'terms', slug: 'villkor' },
      { key: 'accessibility', slug: 'tillganglighet' },
    ],
  },
  {
    key: 'guide',
    base: sitePath('guide'),
    pages: [
      { key: 'guideStart', slug: '', hidden: true },
      { key: 'guideAccount', slug: 'konto', hidden: true },
      { key: 'guideEvents', slug: 'evenemang', hidden: true },
      { key: 'guideManage', slug: 'hantera-evenemang', hidden: true },
      { key: 'guidePlaces', slug: 'platser', hidden: true },
      { key: 'guideProfile', slug: 'din-sida', hidden: true },
      { key: 'guideAdmin', slug: 'administratorer', hidden: true },
    ],
  },
];

// Only the terms and the accessibility statement are shown for now; Om
// tjänsten and the guidebook are put away (`hidden` above).
export const SHOWN_HELP_GROUPS: HelpGroup[] = HELP_GROUPS.map((group) => ({
  ...group,
  pages: group.pages.filter((page) => !page.hidden),
})).filter((group) => group.pages.length > 0);

export const isHelpPageShown = (key: string) =>
  SHOWN_HELP_GROUPS.some((group) => group.pages.some((p) => p.key === key));

export const helpPath = (group: HelpGroup, page: HelpPageRef) =>
  page.slug ? `${group.base}/${page.slug}` : group.base;

// The terms, linked from where an account is made
export const termsPath = helpPath(HELP_GROUPS[0], HELP_GROUPS[0].pages[1]);
export const accessibilityPath = helpPath(
  HELP_GROUPS[0],
  HELP_GROUPS[0].pages[2]
);

export function findHelpPage(groupKey: string, slug = '') {
  const group = SHOWN_HELP_GROUPS.find((g) => g.key === groupKey);
  const page = group?.pages.find((p) => p.slug === slug);
  return group && page ? { group, page } : null;
}
