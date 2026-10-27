import { Meteor } from 'meteor/meteor';
import React, { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAtomValue, useSetAtom } from 'jotai';

import {
  Loader,
  Box,
  Button,
  Center,
  Divider,
  Modal,
  Tabs,
  Text,
} from '/imports/ui/core';
import { message } from '/imports/ui/generic/message';
import { call } from '/imports/api/_utils/shared';
import { currentUserAtom, roleAtom } from '/imports/state';
import { clearViewAsState } from '/imports/utils/viewAs';

export const subSpanStyle: React.CSSProperties = {
  fontSize: '0.875rem',
  fontWeight: 300,
  textTransform: 'lowercase',
};

export default function EditProfile() {
  const currentUser = useAtomValue(currentUserAtom);
  const role = useAtomValue(roleAtom);
  const setCurrentUser = useSetAtom(currentUserAtom);
  const setRole = useSetAtom(roleAtom);
  const [isDeleteModalOn, setIsDeleteModalOn] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const [t] = useTranslation('accounts');
  const [tc] = useTranslation('common');

  useEffect(() => {
    // Logged out some other way: to the login page. After deleting the
    // account, deleteAccount below takes them home instead.
    if (!currentUser && !isDeleting) {
      navigate('/login');
    }
  }, [currentUser]);

  // Deleted, logged out and home, in that order, with a note that it's done
  const deleteAccount = async () => {
    setIsDeleting(true);
    try {
      await call('deleteAccount');
    } catch (error: any) {
      message.error(error?.reason || error?.error);
      setIsDeleting(false);
      return;
    }
    setIsDeleteModalOn(false);
    // Logged out on the server too; don't wait forever if the connection
    // drops as the account is removed
    await Promise.race([
      new Promise<void>((resolve) => Meteor.logout(() => resolve())),
      new Promise<void>((resolve) => setTimeout(resolve, 3000)),
    ]);
    // As useLogout does: the header keeps the user until told otherwise
    clearViewAsState();
    setCurrentUser(null);
    setRole(null);
    navigate('/', { replace: true });
    message.success(t('delete.done'));
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
      navigate(tabs[0].path, { replace: true });
    }
  }, [isMember, tabs, pathnameLastPart]);

  // Everyone logged in has a membership (the server sees to it on login);
  // without one yet, it is still on its way — or the person is being logged
  // out and sent elsewhere. No "not part of this organisation" error.
  if (!isMember) {
    return <Loader />;
  }

  return (
    <>
      <Box mb="8" css={{ minHeight: '100vh' }}>
        <Box w="100%">
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
      </Box>
    </>
  );
}
