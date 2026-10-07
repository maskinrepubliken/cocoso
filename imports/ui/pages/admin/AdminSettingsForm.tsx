import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAtomValue } from 'jotai';
import { useTranslation } from 'react-i18next';

import { Box, Button, Flex, Heading, Input } from '/imports/ui/core';
import FormField from '/imports/ui/forms/FormField';
import ChangeLanguage from '/imports/ui/layout/ChangeLanguageMenu';
import { siteAtom } from '/imports/state';
import { updateSiteSettings } from '/imports/actions';

import Boxling from './Boxling';

interface SiteSettingsFormValues {
  name?: string;
  shortName?: string;
  tagline?: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;
  lang?: string;
  menu?: unknown[];
}

export default function AdminSettingsForm() {
  const site = useAtomValue(siteAtom);
  const [localSettings, setLocalSettings] = useState(site?.settings);
  const [t] = useTranslation('site');
  const [ta] = useTranslation('admin');
  const [tc] = useTranslation('common');
  const { handleSubmit, register, formState } = useForm<SiteSettingsFormValues>(
    {
      defaultValues: localSettings,
    }
  );
  const { isDirty, isSubmitting } = formState;

  useEffect(() => {
    if (!site) {
      return;
    }
    setLocalSettings(site.settings);
  }, [site]);

  return (
    <Box py="6">
      <Heading as="h3" size="sm" mb="4">
        {ta('info.info')}
      </Heading>

      <Boxling>
        <form
          onSubmit={handleSubmit((data) =>
            updateSiteSettings({ values: data })
          )}
        >
          <Flex direction="column">
            <FormField label={t('new.name.label')}>
              <Input {...register('name')} />
            </FormField>
            <FormField
              label={t('new.shortName.label')}
              helper={t('new.shortName.helper')}
            >
              <Input {...register('shortName')} />
            </FormField>
            <FormField
              label={t('new.tagline.label')}
              helper={t('new.tagline.helper')}
            >
              <Input {...register('tagline')} />
            </FormField>
            <FormField label={t('new.email.label')}>
              <Input type="email" {...register('email')} />
            </FormField>
            <FormField label={t('new.address.label')}>
              <Input {...register('address')} />
            </FormField>
            <FormField label={t('new.city.label')}>
              <Input {...register('city')} />
            </FormField>
            <FormField label={t('new.country.label')}>
              <Input {...register('country')} />
            </FormField>
            <FormField label={tc('langs.label')}>
              <ChangeLanguage hideHelper select register={register} />
            </FormField>
            <Flex justify="flex-end" py="4">
              <Button
                disabled={!isDirty || isSubmitting}
                loading={isSubmitting}
                type="submit"
              >
                {tc('actions.submit')}
              </Button>
            </Flex>
          </Flex>
        </form>
      </Boxling>
    </Box>
  );
}
