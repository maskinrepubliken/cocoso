import type { TFunction } from 'i18next';

// The one line that says what a section is for, the same on the start
// page's buttons and under a listing's heading: the description the admin
// wrote on the menu entry when there is one, else the site's own text.
export default function sectionDescription(
  item: { name: string; description?: string } | undefined,
  tc: TFunction
): string {
  if (!item) {
    return '';
  }
  if (item.description) {
    return item.description;
  }
  const own = tc(`home.sections.${item.name}`, { defaultValue: '' });
  return own || '';
}
