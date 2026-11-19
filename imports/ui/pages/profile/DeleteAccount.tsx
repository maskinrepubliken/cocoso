import { Meteor } from 'meteor/meteor';
import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useSetAtom } from 'jotai';

import { Input, Modal, Text } from '/imports/ui/core';
import FormField from '/imports/ui/forms/FormField';
import { message } from '/imports/ui/generic/message';
import { call } from '/imports/api/_utils/shared';
import { currentUserAtom, roleAtom } from '/imports/state';
import { clearViewAsState } from '/imports/utils/viewAs';

interface DeleteAccountProps {
  // What has to be written to confirm
  username: string;
}

// Deleting one's account, last in the profile form: a small link, kept
// out of the way, and a dialog that only goes through once the username
// is written out.
export default function DeleteAccount({ username }: DeleteAccountProps) {
  const setCurrentUser = useSetAtom(currentUserAtom);
  const setRole = useSetAtom(roleAtom);
  const [open, setOpen] = useState(false);
  const [written, setWritten] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();
  const [t] = useTranslation('accounts');

  const confirmed = written.trim().toLowerCase() === username.toLowerCase();

  const close = () => {
    setOpen(false);
    setWritten('');
  };

  // Deleted, logged out and home, in that order, with a note that it's done
  const deleteAccount = async () => {
    if (!confirmed) {
      return;
    }
    setIsDeleting(true);
    try {
      await call('deleteAccount');
    } catch (error: any) {
      message.error(error?.reason || error?.error);
      setIsDeleting(false);
      return;
    }
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

  return (
    <>
      <button
        type="button"
        className="profile-delete-link"
        onClick={() => setOpen(true)}
      >
        {t('delete.action')}
      </button>

      <Modal
        id="edit-profile-delete-account-confirm"
        open={open}
        title={t('delete.title')}
        confirmText={t('delete.label')}
        confirmButtonProps={{
          colorScheme: 'red',
          isLoading: isDeleting,
          isDisabled: isDeleting || !confirmed,
          disabled: isDeleting || !confirmed,
        }}
        onConfirm={deleteAccount}
        onClose={close}
      >
        <Text>{t('delete.body')}</Text>
        <FormField label={t('delete.write', { username })} mt="4">
          <Input
            autoCapitalize="off"
            autoComplete="off"
            value={written}
            onChange={(event) => setWritten(event.target.value)}
          />
        </FormField>
      </Modal>
    </>
  );
}
