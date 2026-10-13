import { useNavigate } from 'react-router';

import { useLocationPrefix } from '/imports/ui/utils/useLocation';

// Where a card in a listing leads. Group meetings open their group, works
// live under their author.
export const getEntryPath = (item: any, kind: string) => {
  if (kind === 'works') {
    return `/@${item.authorUsername}/works/${item._id}`;
  }
  if (kind === 'activities' && item.isGroupMeeting && item.groupId) {
    return `/groups/${item.groupId}`;
  }
  return `/${kind}/${item._id}`;
};

// A request's page lives under its author, which has no place prefix.
export const entryPathWithin = (prefix: string, item: any, kind: string) =>
  kind === 'works'
    ? getEntryPath(item, kind)
    : `${prefix}${getEntryPath(item, kind)}`;

// Clicking a card goes straight to its page, within the current place.
export default function useOpenEntry(kind: string) {
  const navigate = useNavigate();
  const prefix = useLocationPrefix();
  return (item: any) => navigate(entryPathWithin(prefix, item, kind));
}
