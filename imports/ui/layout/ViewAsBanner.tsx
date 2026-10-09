import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';
import EyeIcon from 'lucide-react/dist/esm/icons/eye';

import { Box, Button, Flex, Text } from '/imports/ui/core';
import { currentUserAtom, roleAtom, viewAsAtom } from '/imports/state';
import { stopViewAs } from '/imports/utils/viewAs';
import { message } from '/imports/ui/generic/message';

// A strip at the very top while an admin is viewing the site as another
// member, with the way back to their own account.
export default function ViewAsBanner() {
  const [t] = useTranslation('members');
  const viewAs = useAtomValue(viewAsAtom);
  const currentUser = useAtomValue(currentUserAtom);
  const role = useAtomValue(roleAtom);
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  if (!viewAs) {
    return null;
  }

  const username = currentUser?.username || viewAs;
  const roleLabel = role ? t(`roles.${role}`).toLowerCase() : '';

  const handleBack = async () => {
    setBusy(true);
    try {
      await stopViewAs();
      message.success(t('viewAs.backSuccess'));
      navigate('/admin/listing/people');
    } catch (error: any) {
      message.error(error.reason || error.message || error.error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box
      bg="red.100"
      px="4"
      py="2"
      css={{
        borderBottom: '2px solid var(--cocoso-colors-red-400)',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
      }}
    >
      <Flex align="center" justify="center" gap="4" wrap="wrap">
        <Flex align="center" gap="2">
          <EyeIcon width={18} height={18} />
          <Text fontWeight="bold">
            {t('viewAs.banner', { username, role: roleLabel })}
          </Text>
        </Flex>
        <Button size="sm" colorScheme="red" disabled={busy} onClick={handleBack}>
          {t('viewAs.back')}
        </Button>
      </Flex>
    </Box>
  );
}
