import { Controller, useForm } from 'react-hook-form';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { Button, Flex, Heading, Input, Text } from '/imports/ui/core';

import FormField from '../../forms/FormField';
import Quill from '../../forms/Quill';

interface ProfileFormValues {
  firstName: string;
  lastName: string;
  bio: string;
  contactInfo: string;
  publicContact: {
    email?: string;
    phone?: string;
    website?: string;
  } | null;
}

interface ProfileFormProps {
  defaultValues: Partial<ProfileFormValues>;
  onSubmit: (data: Partial<ProfileFormValues>) => void;
}

function ProfileForm({ defaultValues, onSubmit }: ProfileFormProps) {
  const { control, formState, handleSubmit, register } = useForm({
    defaultValues,
  });
  const { isDirty, isSubmitting } = formState;

  const [t] = useTranslation('members');
  const [tc] = useTranslation('common');

  return (
    <div>
      <form onSubmit={handleSubmit((data) => onSubmit(data))}>
        <Flex direction="column" gap="6">
          <FormField label={t('profile.form.firstname.label')}>
            <Input {...register('firstName')} placeholder="" />
          </FormField>

          <FormField label={t('profile.form.lastname.label')}>
            <Input {...register('lastName')} placeholder="" />
          </FormField>

          <FormField label={t('profile.form.bio.label')}>
            <Controller
              control={control}
              name="bio"
              render={({ field }) => <Quill {...field} />}
            />
          </FormField>

          <FormField label={t('profile.form.contact.label')}>
            <Controller
              control={control}
              name="contactInfo"
              render={({ field }) => <Quill {...field} />}
            />
          </FormField>

          <Heading size="sm" css={{ marginTop: '1rem' }}>
            {t('profile.form.publicContact.title')}
          </Heading>
          <Text size="sm" css={{ color: 'var(--cocoso-mylla-soft)' }}>
            {t('profile.form.publicContact.helper')}
          </Text>

          <FormField label={t('profile.form.publicContact.email')}>
            <Input
              {...register('publicContact.email')}
              placeholder="namn@exempel.se"
              type="email"
            />
          </FormField>

          <FormField label={t('profile.form.publicContact.phone')}>
            <Input
              {...register('publicContact.phone')}
              placeholder="070-123 45 67"
              type="tel"
            />
          </FormField>

          <FormField label={t('profile.form.publicContact.website')}>
            <Input
              {...register('publicContact.website')}
              placeholder="https://"
              type="url"
            />
          </FormField>

          <Flex justify="flex-end" py="4" w="100%">
            <Button disabled={!isDirty} loading={isSubmitting} type="submit">
              {tc('actions.submit')}
            </Button>
          </Flex>
        </Flex>
      </form>
    </div>
  );
}

export default ProfileForm;
