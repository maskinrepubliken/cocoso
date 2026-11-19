import React from 'react';
import { useSearchParams } from 'react-router';
import { useAtomValue } from 'jotai';
import { useTranslation } from 'react-i18next';
import PenIcon from 'lucide-react/dist/esm/icons/pen-line';

import { currentUserAtom } from '/imports/state';
import { Box, Button, Flex, Heading, Text } from '/imports/ui/core';
import { RoundPicture } from '/imports/ui/entry/EntryHero';
import { displayName } from '/imports/ui/listing/UsersHybrid';
import Boxling from '/imports/ui/pages/admin/Boxling';

import ProfileSheet from './ProfileSheet.loadable';

// One's profile in the settings: who one is shown as, and the way into
// the profile form (ProfileSheet), the same one the gear on one's own
// page opens.
export default function EditProfileGeneral() {
  const currentUser = useAtomValue(currentUserAtom);
  const [, setSearchParams] = useSearchParams();
  const [t] = useTranslation('accounts');
  const [tc] = useTranslation('common');

  if (!currentUser?.username) {
    return null;
  }

  const name = displayName(currentUser);

  return (
    <>
      <Boxling mb="8">
        <Flex align="center" gap="4" wrap="wrap">
          {/* smaller than on the page itself */}
          <Box css={{ '& > div': { width: '96px' } }}>
            <RoundPicture
              alt={name}
              seed={currentUser._id}
              src={currentUser.avatar?.src}
            />
          </Box>
          <Flex direction="column" gap="1" css={{ flex: '1 1 12rem' }}>
            <Heading size="md">{name}</Heading>
            <Text size="sm" css={{ color: 'var(--cocoso-mylla-soft)' }}>
              {t('profile.summary')}
            </Text>
          </Flex>
          <Button
            leftIcon={<PenIcon width={16} height={16} aria-hidden />}
            onClick={() => setSearchParams({ edit: 'true' })}
          >
            {tc('entryMenu.edit.profile')}
          </Button>
        </Flex>
      </Boxling>

      <ProfileSheet username={currentUser.username} />
    </>
  );
}
