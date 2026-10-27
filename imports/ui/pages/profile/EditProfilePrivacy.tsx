import React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';

import { siteAtom, currentUserAtom, roleAtom } from '/imports/state';
import { Alert, Box, Checkbox, Heading, Divider, Text } from '/imports/ui/core';
import { message } from '/imports/ui/generic/message';
import Boxling from '/imports/ui/pages/admin/Boxling';
import { call } from '/imports/api/_utils/shared';

export default function EditProfilePrivacy() {
  const currentUser = useAtomValue(currentUserAtom);
  const site = useAtomValue(siteAtom);
  const role = useAtomValue(roleAtom);
  const [t] = useTranslation('accounts');
  const [tc] = useTranslation('common');

  const setProfilePublic = async (isPublic) => {
    try {
      await call('setProfilePublic', isPublic);
      message.success(
        tc('message.success.save', {
          domain: `${tc('domains.profile')}`,
        })
      );
    } catch (error) {
      message.error(error.reason);
    }
  };

  const setProfilePublicGlobally = async (isPublic) => {
    try {
      await call('setProfilePublicGlobally', isPublic);
      message.success(
        tc('message.success.save', {
          domain: `${tc('domains.profile')}`,
        })
      );
    } catch (error) {
      message.error(error.reason);
    }
  };

  const currentMembership = currentUser?.memberships?.[0];

  const isUserPublic = Boolean(currentMembership?.isPublic);
  const isUserPublicGlobally = currentUser?.isPublic;
  const communityName = site?.settings?.name;

  const { username } = currentUser;

  return (
    <>
      <Boxling>
        <Box mb="4">
          <Heading size="md" pb="2">
            {communityName}
          </Heading>
          <Checkbox
            checked={isUserPublicGlobally}
            id="is-user-public-globally"
            onChange={({ target: { checked } }) =>
              setProfilePublicGlobally(checked)
            }
          >
            {t('profile.makePublic.labelGlobal')}
          </Checkbox>
          <p>
            <Text fontSize="sm" my="2">
              {t('profile.makePublic.helperGlobal')}
            </Text>
          </p>
        </Box>

        <Divider my="4" />

        <Box pt="2">
          <Alert bg="white" type="info" css={{ marginBottom: '0.4rem' }}>
            <Text fontSize="sm">
              <Trans
                i18nKey="accounts:profile.message.role"
                defaults="You as <bold>{{ username }}</bold> are part of {{ host }} with the <bold>{{ role }}</bold> role"
                values={{
                  host: communityName,
                  role,
                  username,
                }}
                components={{ bold: <strong /> }}
              />
            </Text>
          </Alert>

          <Box py="4">
            <Checkbox
              checked={isUserPublic}
              disabled={!isUserPublicGlobally}
              id="is-user-public-locally"
              onChange={({ target: { checked } }) => setProfilePublic(checked)}
            >
              {t('profile.makePublic.label')}
            </Checkbox>
            <p>
              <Text fontSize="sm" my="2">
                {t('profile.makePublic.helper')}
              </Text>
            </p>
          </Box>
        </Box>
      </Boxling>
    </>
  );
}
