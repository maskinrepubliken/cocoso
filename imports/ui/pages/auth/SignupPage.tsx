import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';

import {
  Box,
  Center,
  Heading,
  Image,
  Link as CLink,
  Modal,
  Text,
} from '/imports/ui/core';
import { siteAtom, currentUserAtom } from '/imports/state';

import { Signup } from './index';
import { createAccount } from './functions';

export default function SignupPage() {
  const currentUser = useAtomValue(currentUserAtom);
  const site = useAtomValue(siteAtom);
  const [t] = useTranslation('accounts');
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) {
      return;
    }
    navigate(`/@${currentUser.username}`);
  }, [currentUser]);

  return (
    <Box pb="8">
      <Modal
        hideHeader
        hideFooter
        id="signup-page"
        open
        size="2xl"
        onClose={() => navigate('/')}
      >
        <Center>
          <Box w="sm">
            <Center>
              <Box>
                {site?.logo && (
                  <Center p="4">
                    <Image
                      alt={`${site?.settings?.name} logo`}
                      src={site.logo}
                      w="240px"
                    />
                  </Center>
                )}
                <Heading
                  size="md"
                  css={{ marginBottom: '1em', textAlign: 'center' }}
                >
                  {t('signup.labels.title')}
                </Heading>
              </Box>
            </Center>

            <Center py="4">
              <Text>
                {t('signup.labels.subtitle')}{' '}
                <Link to="/login">
                  <CLink as="span" color="blue.500">
                    <b>{t('actions.login')}</b>
                  </CLink>
                </Link>
              </Text>
            </Center>

            <Box
              bg="gray.50"
              mb="4"
              p="6"
              css={{
                border: '1px solid',
                borderColor: 'var(--cocoso-colors-gray-300)',
              }}
            >
              <Signup onSubmit={(values) => createAccount(values)} />
            </Box>
          </Box>
        </Center>
      </Modal>
    </Box>
  );
}
