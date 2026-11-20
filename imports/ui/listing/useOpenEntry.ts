import { useNavigate } from 'react-router';

import { sitePath } from '/imports/api/_utils/paths';

// Where a card in a listing leads. Group meetings open their group, works
// live under their author.
export const getEntryPath = (item: any, kind: string) => {
  if (kind === 'works') {
    return sitePath(`@${item.authorUsername}/works`, item._id);
  }
  if (kind === 'activities' && item.isGroupMeeting && item.groupId) {
    return sitePath('groups', item.groupId);
  }
  return sitePath(kind, item._id);
};

// Clicking a card goes straight to its page.
export default function useOpenEntry(kind: string) {
  const navigate = useNavigate();
  return (item: any) => navigate(getEntryPath(item, kind));
}
