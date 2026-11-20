import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Box, Input, Modal, Text } from '/imports/ui/core';
import { call } from '/imports/api/_utils/shared';
import { message } from '/imports/ui/generic/message';

export interface AliasMember {
  id: string;
  username: string;
  name?: string;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Box as="label" mb="4" css={{ display: 'block' }}>
      <Text fontSize="sm" fontWeight="bold">
        {label}
      </Text>
      <Box mt="1">{children}</Box>
    </Box>
  );
}

// An alias is an organizer profile without a login (createAlias in
// imports/api/users/user.alias.js). Only a name and a way to reach the
// organizer are asked here; the picture and the rest are filled in on the
// profile, which opens once the alias is made.
export function CreateAliasModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (alias: { _id: string; username: string }) => void;
}) {
  const [t] = useTranslation('members');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);

  const create = async () => {
    if (busy) {
      return;
    }
    if (!name.trim()) {
      message.error(t('alias.create.nameMissing'));
      return;
    }
    if (!email.trim() && !phone.trim()) {
      message.error(t('alias.create.contactMissing'));
      return;
    }
    setBusy(true);
    try {
      const alias = await call<{ _id: string; username: string }>(
        'createAlias',
        {
          name,
          publicContact: { email, phone },
        }
      );
      message.success(t('alias.create.created', { name: name.trim() }));
      // An empty form the next time
      setName('');
      setEmail('');
      setPhone('');
      onCreated(alias);
    } catch (error: any) {
      message.error(
        error?.error === 'invalid-email'
          ? t('alias.create.emailInvalid')
          : error?.reason || error?.error
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      cancelText={t('alias.cancel')}
      confirmButtonProps={{ loading: busy }}
      confirmText={t('alias.create.submit')}
      id="create-alias"
      open={open}
      title={t('alias.create.title')}
      onCancel={onClose}
      onClose={onClose}
      onConfirm={create}
    >
      <Box mb="4">
        <Text>{t('alias.create.intro')}</Text>
      </Box>
      <Field label={t('alias.create.name')}>
        <Input
          maxLength={80}
          placeholder={t('alias.create.namePlaceholder')}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </Field>
      <Box mb="2">
        <Text fontSize="sm">{t('alias.create.contactHelper')}</Text>
      </Box>
      <Field label={t('profile.form.publicContact.email')}>
        <Input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </Field>
      <Field label={t('profile.form.publicContact.phone')}>
        <Input
          type="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
        />
      </Field>
    </Modal>
  );
}

// Hands an alias over to the organizer themself: with an email address it
// becomes an ordinary account, and its owner is invited by email
// (convertAliasToAccount).
export function ConvertAliasModal({
  alias,
  onClose,
  onConverted,
}: {
  alias: AliasMember | null;
  onClose: () => void;
  onConverted: () => void;
}) {
  const [t, i18n] = useTranslation('members');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const name = alias?.name || alias?.username || '';

  const convert = async () => {
    if (!alias || busy) {
      return;
    }
    if (!email.trim()) {
      message.error(t('alias.convert.emailMissing'));
      return;
    }
    setBusy(true);
    try {
      await call('convertAliasToAccount', alias.id, email, i18n.language);
      message.success(
        t('alias.convert.converted', { name, email: email.trim() })
      );
      setEmail('');
      onConverted();
    } catch (error: any) {
      const known = ['invalid-email', 'email-in-use', 'email-failed'];
      message.error(
        known.includes(error?.error)
          ? t(`alias.convert.errors.${error.error}`)
          : error?.reason || error?.error
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      cancelText={t('alias.cancel')}
      confirmButtonProps={{ loading: busy }}
      confirmText={t('alias.convert.submit')}
      id="convert-alias"
      open={Boolean(alias)}
      title={t('alias.convert.title', { name })}
      onCancel={onClose}
      onClose={onClose}
      onConfirm={convert}
    >
      <Box mb="4">
        <Text>{t('alias.convert.intro')}</Text>
      </Box>
      <Field label={t('alias.convert.email')}>
        <Input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </Field>
      <Text fontSize="sm">{t('alias.convert.after')}</Text>
    </Modal>
  );
}

// Asked before an alias is removed. One that still organizes something is
// refused by the server (deleteAlias), and the answer says what.
export function DeleteAliasModal({
  alias,
  onClose,
  onDeleted,
}: {
  alias: AliasMember | null;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [t] = useTranslation('members');
  const [busy, setBusy] = useState(false);
  const name = alias?.name || alias?.username || '';

  const remove = async () => {
    if (!alias || busy) {
      return;
    }
    setBusy(true);
    try {
      await call('deleteAlias', alias.id);
      message.success(t('alias.delete.deleted', { name }));
      onDeleted();
    } catch (error: any) {
      message.error(
        error?.error === 'alias-in-use'
          ? t('alias.delete.inUse', {
              name,
              events: error.details?.events || 0,
              mirrors: error.details?.mirrors || 0,
            })
          : error?.reason || error?.error
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      cancelText={t('alias.cancel')}
      confirmButtonProps={{ loading: busy, colorScheme: 'red' }}
      confirmText={t('alias.delete.submit')}
      id="delete-alias"
      open={Boolean(alias)}
      title={t('alias.delete.title', { name })}
      onCancel={onClose}
      onClose={onClose}
      onConfirm={remove}
    >
      <Text>{t('alias.delete.text')}</Text>
    </Modal>
  );
}
