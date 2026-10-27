import React, { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';

import { currentUserAtom, roleAtom } from '/imports/state';
import { Box, Checkbox, Heading, Text } from '/imports/ui/core';
import { message } from '/imports/ui/generic/message';
import Boxling from '/imports/ui/pages/admin/Boxling';
import { call } from '/imports/api/_utils/shared';

// Privacy settings: whether others can see your profile, and what your role
// on the site lets you do. One site, so one switch — whether a profile shows
// is the membership's isPublic (getUserInfo, the organizer listing);
// setProfilePublicGlobally keeps the user's copy of it in step.
export default function EditProfilePrivacy() {
  const currentUser = useAtomValue(currentUserAtom);
  const role = useAtomValue(roleAtom) || 'participant';
  const [t] = useTranslation('accounts');
  const [tm] = useTranslation('members');
  const [saving, setSaving] = useState(false);

  const isPublic = Boolean(currentUser?.memberships?.[0]?.isPublic);

  const setPublic = async (value: boolean) => {
    setSaving(true);
    try {
      await call('setProfilePublicGlobally', value);
      message.success(t('privacy.saved'));
    } catch (error: any) {
      message.error(error?.reason || error?.error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box css={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <Boxling>
        <Heading size="md" css={{ marginBottom: '0.75rem' }}>
          {t('privacy.visibility.title')}
        </Heading>
        <Checkbox
          checked={isPublic}
          disabled={saving}
          id="is-profile-public"
          onChange={({ target: { checked } }) => setPublic(checked)}
        >
          {t('privacy.visibility.label')}
        </Checkbox>
        <Box pt="2">
          <Text fontSize="sm">
            {isPublic
              ? t('privacy.visibility.on')
              : t('privacy.visibility.off')}
          </Text>
        </Box>
      </Boxling>

      <Boxling>
        <Heading size="md" css={{ marginBottom: '0.75rem' }}>
          {t('privacy.role.title')}
        </Heading>
        <Text>
          <Trans
            t={t}
            i18nKey="privacy.role.current"
            values={{ role: tm(`roles.${role}`) }}
            components={{ strong: <strong /> }}
          />
        </Text>
        <Box pt="2">
          <Text fontSize="sm">{t(`privacy.role.means.${role}`)}</Text>
        </Box>
      </Boxling>
    </Box>
  );
}
