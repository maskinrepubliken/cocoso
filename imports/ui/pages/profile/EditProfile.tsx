import { Meteor } from 'meteor/meteor';
import React, { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';

import {
  Alert,
  Box,
  Button,
  Center,
  Divider,
  Heading,
  Modal,
  Tabs,
  Text,
} from '/imports/ui/core';
import { message } from '/imports/ui/generic/message';
import { call } from '/imports/api/_utils/shared';
import { currentHostAtom, currentUserAtom, roleAtom } from '/imports/state';

export const subSpanStyle: React.CSSProperties = {
  fontSize: '0.875rem',
  fontWeight: 300,
  textTransform: 'lowercase',
};

export default function EditProfile() {
  const currentUser = useAtomValue(currentUserAtom);
  const currentHost = useAtomValue(currentHostAtom);
  const role = useAtomValue(roleAtom);
  const [isDeleteModalOn, setIsDeleteModalOn] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const [t] = useTranslation('accounts');
  const [tc] = useTranslation('common');

  useEffect(() => {
    if (!currentUser) {
      if (isDeleting) {
        message.success(tc('message.success.remove'));
        navigate('/');
      } else {
        navigate('/login');
      }
    }
  }, [currentUser]);

  const deleteAccount = async () => {
    setIsDeleting(true);

    try {
      await call('deleteAccount');
      Meteor.logout();
      localStorage.clear();
      sessionStorage.clear();
      setIsDeleted(true);
      setTimeout(() => {
        window.location.href = '/?deleted=' + Date.now();
      }, 6000);
    } catch (error: any) {
      message.error(error?.error || error?.reason);
      setIsDeleting(false);
    }
  };

  const tabs = [
    {
      title: tc('menu.member.general'),
      path: 'general',
    },
    {
      title: t('profile.menu.language'),
      path: 'language',
    },
    {
      title: t('profile.menu.privacy'),
      path: 'privacy',
    },
  ];

  const isMember = ['admin', 'contributor', 'participant'].includes(role);

  const pathname = location?.pathname;
  const pathnameLastPart = pathname.split('/').pop();
  const tabIndex =
    tabs && tabs.findIndex((tab) => tab.path === pathnameLastPart);

  useEffect(() => {
    if (
      isMember &&
      tabs &&
      !tabs.find((tab) => tab.path === pathnameLastPart)
    ) {
      navigate(tabs[0].path);
    }
  }, [isMember, tabs, pathnameLastPart]);

  if (!isMember) {
    return (
      <Center p="8">
        <Alert type="error">{t('profile.message.deny')}</Alert>
      </Center>
    );
  }

  return (
    <>
      <Box mb="8" css={{ minHeight: '100vh' }}>
        <Box w="100%">
          <Heading size="md">{currentHost?.settings?.name}</Heading>

          <Tabs index={tabIndex} tabs={tabs} />

          <Box mt="8">
            <Outlet />
          </Box>
        </Box>

        <Divider my="4" />

        <Box bg="red.100" mt="24">
          <Center p="4">
            <Button
              colorScheme="red"
              size="sm"
              onClick={() => setIsDeleteModalOn(true)}
            >
              {t('delete.action')}
            </Button>
          </Center>
        </Box>

        <Modal
          id="edit-profile-delete-account-confirm"
          open={isDeleteModalOn}
          title={t('delete.title')}
          confirmText={t('delete.label')}
          confirmButtonProps={{
            colorScheme: 'red',
            isLoading: isDeleting,
            isDisabled: isDeleting,
          }}
          onConfirm={deleteAccount}
          onClose={() => setIsDeleteModalOn(false)}
        >
          <Text>{t('delete.body')}</Text>
        </Modal>

        <Modal
          title={t('delete.successTitle')}
          hideFooter
          id="delete-success-modal"
          open={isDeleted}
        >
          <Box pb="4">
            <Text fontWeight="bold" size="lg">
              {t('delete.successBody')}
            </Text>
          </Box>

          <Text size="lg">{t('delete.successRedirect')}</Text>
        </Modal>
      </Box>
    </>
  );
}
