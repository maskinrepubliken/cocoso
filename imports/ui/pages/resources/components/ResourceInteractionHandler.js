import { Link } from 'react-router';
import React from 'react';
import { Trans } from 'react-i18next';
import { useAtomValue } from 'jotai';

import { Box, Button } from '/imports/ui/core';
import {
  canCreateContentAtom,
  siteAtom,
  currentUserAtom,
  isDesktopAtom,
  roleAtom,
} from '/imports/state';
import { ChatButton } from '/imports/ui/chattery/ChatHandler';
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
  const currentUser = useAtomValue(currentUserAtom);
  const resource = useAtomValue(resourceAtom);
  const role = useAtomValue(roleAtom);

  if (!resource) {
    return null;
  }

  if (role !== 'admin' && !canCreateContent) {
    return null;
  }

  return (
    <EntryActions>
      {role === 'admin' && <ResourceAdminFunctions />}
      {isFeatureEnabled('bookings') && resource.isBookable ? (
        <ReserveButton resource={resource} />
      ) : null}
      <ChatButton
        context="resources"
        currentUser={currentUser}
        item={resource}
        withInput
      />
    </EntryActions>
  );
}
