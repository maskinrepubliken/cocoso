import { Meteor } from 'meteor/meteor';
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAtom, useAtomValue } from 'jotai';

import {
  Box,
  Center,
  Heading,
  Image,
  Link as CLink,
  Modal,
  Text,
} from '/imports/ui/core';
import { message } from '/imports/ui/generic/message';
import { call } from '../../../api/_utils/shared';
import { siteAtom, currentUserAtom, roleAtom } from '/imports/state';

import { loginWithPassword } from './functions';
import { Login } from './index';
import { clearEncryptionKey } from '/imports/utils/setupEncryption';

export default function LoginPage() {
  const site = useAtomValue(siteAtom);
  const currentUser = useAtomValue(currentUserAtom);
  const [role, setRole] = useAtom(roleAtom);
  const [t] = useTranslation('accounts');
  const [submitted, setSubmitted] = useState(false);
  const [joinModal, setJoinModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) {
      return;
    }
    const membership = currentUser?.memberships?.[0];
    setRole(membership?.role || null);
    if (['participant', 'contributor', 'admin'].includes(membership?.role)) {
      navigate('/admin/my-profile/general');
    } else {
      setJoinModal(true);
    }
  }, [currentUser]);

  const handleSubmit = async (values: any) => {
    if (values?.username?.length < 4 || values?.password?.length < 8) {
      return;
    }
    setSubmitted(true);
    try {
      await loginWithPassword(values.username, values.password);
    } catch (error) {
      message.error(error.reason);
    } finally {
      setSubmitted(false);
    }
  };

  const cancelJoin = () => {
    clearEncryptionKey();
    Meteor.logout();
    setJoinModal(false);
    setSubmitted(false);
    message.info(t('logout.messages.success'));
  };

  const confirmJoin = async () => {
    try {
      await call('setSelfAsParticipant');
      message.success(t('profile.message.participant'));
    } catch (error) {
      message.error(error.reason || error.error);
    }
  };

  return (
    <Box pb="8">
      <Modal
        contentProps={{ h: 'auto' }}
        hideHeader
        hideFooter
        id="login-page"
        open
        size="2xl"
        onClose={() => navigate('/')}
      >
        <Center mb="8">
          <Box w="xs">
            {site?.logo && (
              <Center p="4">
                <Image
                  alt={`${site?.settings?.name} logo`}
                  src={site.logo}
                  w="240px"
                />
              </Center>
            )}

            <Heading mb="4" size="md" textAlign="center">
              {t('login.labels.title')}
            </Heading>

            <Center mb="6">
              <Text>
                {t('login.labels.subtitle')}{' '}
                <Link to="/register">
                  <CLink as="span" color="theme.500">
                    <b>{t('actions.signup')}</b>
                  </CLink>
                </Link>
              </Text>
            </Center>

            <Box mb="4" py="2">
              <Login isSubmitted={submitted} onSubmit={handleSubmit} />
            </Box>
            <Center>
              <Text textAlign="center">
                {t('actions.forgot')}
                <br />
                <Link to="/forgot-password">
                  <CLink
                    as="span"
                    color="theme.500"
                    css={{ marginTop: '0.5rem' }}
                  >
                    <b>{t('actions.reset')}</b>
                  </CLink>
                </Link>
              </Text>
            </Center>
          </Box>
        </Center>
      </Modal>

      <Modal
        open={joinModal}
        id="login-page-join"
        title={t('profile.joinHost', {
          host: site?.settings?.name,
        })}
        onConfirm={() => confirmJoin()}
        onClose={() => cancelJoin()}
        confirmText={t('profile.join')}
      >
        <Center>
          <Image
            alt={`${site?.settings?.name} logo`}
            src={site?.logo}
            m="4"
            width="4xs"
          />
        </Center>
        <Text fontSize="lg">{t('profile.joinAsParticipantQuestion')}</Text>
      </Modal>
    </Box>
  );
}
