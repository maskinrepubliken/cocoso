import { useAtomValue } from 'jotai';
import React from 'react';

import { currentUserAtom } from '/imports/state';

import { workAtom } from '../WorkItemHandler';
import WorkAdminFunctions from './WorkAdminFunctions';

// A request's page has no card of its own: one reaches the author through
// the link to their profile. The author's choices are in the header's
// gear, and their dialogs are here.
export default function WorkInteractionHandler() {
  const currentUser = useAtomValue(currentUserAtom);
  const work = useAtomValue(workAtom) as any;

  if (!work || !currentUser || currentUser._id !== work.authorId) {
    return null;
  }
  return <WorkAdminFunctions />;
}
