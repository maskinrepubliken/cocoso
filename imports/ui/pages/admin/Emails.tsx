import React, { useMemo, useEffect } from 'react';
import { useLoaderData, useRevalidator, useSearchParams } from 'react-router';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';

import { Button, Flex, Input, Tabs, Text } from '/imports/ui/core';
import { message } from '/imports/ui/generic/message';
import { currentUserAtom, roleAtom } from '/imports/state';
import FormField from '/imports/ui/forms/FormField';
import Quill from '/imports/ui/forms/Quill';
import { call } from '/imports/api/_utils/shared';

import Boxling from './Boxling';

function EmailForm({
  defaultValues,
  onSubmit,
}: {
  defaultValues: any;
  onSubmit: (values: any) => void;
}) {
  const { control, handleSubmit, register, formState } = useForm({
    defaultValues,
  });
  const [t] = useTranslation('admin');
  const [tc] = useTranslation('common');

  const { isDirty, isSubmitting } = formState;

  return (
    <Boxling my="8">
      <form onSubmit={handleSubmit((data) => onSubmit(data))}>
        <Flex direction="column">
          <FormField label={t('emails.form.subject.label')} required>
            <Input
              {...register('subject')}
              placeholder={t('emails.form.subject.holder')}
            />
          </FormField>

          <FormField label={t('emails.form.appeal.label')} required>
            <Flex align="center" w="280px">
              <Input
                {...register('appeal')}
                placeholder={t('emails.form.appeal.holder')}
              />
              <Text>{t('emails.form.appeal.addon')}</Text>
            </Flex>
          </FormField>

          <FormField label={t('emails.form.body.label')} required>
            <Controller
              control={control}
              name="body"
              render={({ field }) => <Quill {...field} />}
            />
          </FormField>

          <Flex justify="flex-end" py="2" w="100%">
            <Button disabled={!isDirty} loading={isSubmitting} type="submit">
              {tc('actions.submit')}
            </Button>
          </Flex>
        </Flex>
      </form>
    </Boxling>
  );
}

const EMAIL_TABS = [
  { key: 'verified', index: 1 },
  { key: 'admin', index: 2 },
];

export default function Emails() {
  const currentUser = useAtomValue(currentUserAtom);
  const role = useAtomValue(roleAtom);
  const { emails } = useLoaderData();
  const { revalidate, state } = useRevalidator();
  const [t] = useTranslation('admin');
  const [tc] = useTranslation('common');
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (currentUser && role === 'admin' && !emails && state === 'idle') {
      revalidate();
    }
  }, [currentUser, role, emails, state]);

  // site.emails: [0] the old welcome email (no longer sent — new accounts
  // get the /welcome screen), [1] verified as organizer, [2] made admin
  const parsedEmails = useMemo(
    () =>
      EMAIL_TABS.filter((tab) => emails?.[tab.index]).map((tab) => ({
        key: tab.key,
        title: t(`emails.${tab.key}.title`),
        onClick: () =>
          setSearchParams((params) => ({ ...params, show: tab.key })),
      })),
    [emails]
  );

  if (!currentUser || role !== 'admin' || !emails) {
    return null;
  }

  const handleSubmit = async (values: any, emailIndex: number) => {
    try {
      await call('updateEmail', values, emailIndex);
      message.success(tc('message.success.update'));
    } catch (error: any) {
      message.error(error.reason || error.error);
    }
  };

  const show = searchParams.get('show');
  const tabIndex = Math.max(
    0,
    EMAIL_TABS.findIndex((tab) => tab.key === show)
  );
  const { key, index: emailIndex } = EMAIL_TABS[tabIndex];
  const selectedEmail = emails[emailIndex];

  return (
    <>
      <Tabs tabs={parsedEmails} index={tabIndex} />

      <EmailForm
        key={key}
        onSubmit={(values) => handleSubmit(values, emailIndex)}
        defaultValues={selectedEmail}
      />
    </>
  );
}
