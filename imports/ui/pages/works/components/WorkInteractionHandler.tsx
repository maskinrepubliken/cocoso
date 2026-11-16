import { useAtomValue } from 'jotai';
import React from 'react';

import { currentUserAtom } from '/imports/state';
import { EntryActions } from '/imports/ui/entry/EntryHero';

import { workAtom } from '../WorkItemHandler';
import WorkAdminFunctions from './WorkAdminFunctions';
import ContactInfo from '../../profile/ContactInfo';

export default function WorkInteractionHandler() {
  const currentUser = useAtomValue(currentUserAtom);
  const work = useAtomValue(workAtom) as any;

  if (!work) {
    return null;
  }

  if (!currentUser || currentUser._id !== work.authorId) {
    return (
      <EntryActions>
        <ContactInfo username={work.authorUsername} />
      </EntryActions>
    );
  } else {
    // The author's choices are in the header's gear; their dialogs are here
    return (
      <>
        <WorkAdminFunctions />
        <EntryActions>
          <ContactInfo
            username={work.authorUsername}
            value={work.contactInfo}
          />
        </EntryActions>
      </>
    );
  }
}
