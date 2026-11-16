import { useAtomValue } from 'jotai';
import React from 'react';

import { EntryActions } from '/imports/ui/entry/EntryHero';
import { currentUserAtom, roleAtom } from '/imports/state';

import PageAdminFunctions from './PageAdminFunctions';

export default function PageInteractionHandler() {
  const currentUser = useAtomValue(currentUserAtom);
  const role = useAtomValue(roleAtom);

  if (!currentUser || role !== 'admin') {
    return null;
  }
  return (
    <EntryActions>
      <PageAdminFunctions />
    </EntryActions>
  );
}
