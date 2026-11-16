import { Link } from 'react-router';
import React from 'react';
import { Trans } from 'react-i18next';
import { useAtomValue } from 'jotai';

import { Box, Button } from '/imports/ui/core';
import {
  canCreateContentAtom,
  siteAtom,
  isDesktopAtom,
  roleAtom,
} from '/imports/state';
import { isFeatureEnabled } from '/imports/api/_utils/features';
import { EntryActions } from '/imports/ui/entry/EntryHero';

import ResourceAdminFunctions from './ResourceAdminFunctions';
import { resourceAtom } from '../ResourceItemHandler';

function ReserveButton({ resource }) {
  const site = useAtomValue(siteAtom);
  const isDesktop = useAtomValue(isDesktopAtom);

  const link = `/calendar?resourceId=${resource._id}&new=true`;

  return (
    <Box>
      <Link to={link}>
        <Button size={isDesktop ? 'lg' : 'md'}>
          <Trans i18nKey="common:labels.book">Reserve</Trans>
        </Button>
      </Link>
    </Box>
  );
}

export default function ResourceInteractionHandler() {
  const canCreateContent = useAtomValue(canCreateContentAtom);
  const resource = useAtomValue(resourceAtom);
  const role = useAtomValue(roleAtom);

  if (!resource) {
    return null;
  }

  const isAdmin = role === 'admin';
  // The discussion and the admin's choices are in the header; all a place
  // has left for the card is the book button, while bookings are on.
  const canBook =
    canCreateContent && isFeatureEnabled('bookings') && resource.isBookable;

  return (
    <>
      {isAdmin && <ResourceAdminFunctions />}
      {canBook && (
        <EntryActions>
          <ReserveButton resource={resource} />
        </EntryActions>
      )}
    </>
  );
}
