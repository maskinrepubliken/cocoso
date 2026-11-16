import React from 'react';
import { useAtomValue } from 'jotai';

import DeleteEntryHandler from '/imports/ui/entry/DeleteEntryHandler';

import { currentPageAtom } from '../PageItemHandler';

// The delete dialog an admin opens from the gear in the header
// (layout/EditButton.tsx); new and edit open in PageItemHandler.
export default function PageAdminFunctions() {
  const currentPage = useAtomValue(currentPageAtom);

  return <DeleteEntryHandler item={currentPage} context="info" />;
}
