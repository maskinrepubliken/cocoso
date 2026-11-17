import { Controller, useForm } from 'react-hook-form';
import React, { useEffect, useState } from 'react';
import MapPinIcon from 'lucide-react/dist/esm/icons/map-pin';
import PencilLineIcon from 'lucide-react/dist/esm/icons/pencil-line';
import { useTranslation } from 'react-i18next';

import { Button, Flex, Heading, Input, Text } from '/imports/ui/core';
import { isReachable } from '/imports/api/_utils/contact';
import {
  Address,
  hasAddress,
  isCompleteAddress,
} from '/imports/api/_utils/address';
import AddressFields from '/imports/ui/forms/AddressFields';
import LocationSelect from '/imports/ui/forms/LocationSelect';
import { message } from '/imports/ui/generic/message';
import { call } from '/imports/api/_utils/shared';
import ChoiceChips from '/imports/ui/pages/activities/form/ChoiceChips';
import PlacePicker, {
  type PlaceOption,
} from '/imports/ui/pages/activities/form/PlacePicker';

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
  // Where an organizer usually is, which new events start from: one of the
  // places, or an address and place (ort) of their own.
  homePlaceId?: string | null;
  address?: Partial<Address> | null;
  locationId?: string | null;
}

interface ProfileFormProps {
  defaultValues: Partial<ProfileFormValues>;
  // Organizers must give an email or a phone (see _utils/contact.ts).
  contactRequired?: boolean;
  onSubmit: (data: Partial<ProfileFormValues>) => void;
}

function ProfileForm({
  contactRequired = false,
  defaultValues,
  onSubmit,
}: ProfileFormProps) {
  const { control, formState, handleSubmit, register, setValue } = useForm({
    defaultValues,
  });
  const { isDirty, isSubmitting } = formState;
  // At one of the places, or at an address of their own
  const [where, setWhere] = useState<'place' | 'own'>(
    defaultValues.homePlaceId ? 'place' : 'own'
  );
  const [places, setPlaces] = useState<PlaceOption[]>([]);
  useEffect(() => {
    if (!contactRequired) {
      return;
    }
    call<PlaceOption[]>('getResourcesDry')
      .then((all) => setPlaces((all || []).filter((p) => !p.isUnlisted)))
      .catch(() => setPlaces([]));
  }, [contactRequired]);

  const [t] = useTranslation('members');
  const [tc] = useTranslation('common');

  return (
    <div>
      <form
        onSubmit={handleSubmit((data) => {
          if (contactRequired && !isReachable(data.publicContact)) {
            message.error(tc('contact.errors.required'));
            return;
          }
          if (where === 'place') {
            // A place stands for the address
            onSubmit({ ...data, address: null, locationId: null });
            return;
          }
          if (hasAddress(data.address) && !isCompleteAddress(data.address)) {
            message.error(tc('address.errors.required'));
            return;
          }
          onSubmit({ ...data, homePlaceId: null });
        })}
      >
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
          {contactRequired && (
            <Text size="sm" css={{ fontWeight: 600 }}>
              {t('profile.form.publicContact.required')}
            </Text>
          )}

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

          {/* Organizers: where they usually are. The event form starts
              from this address and place. */}
          {contactRequired && (
            <>
              <Heading size="sm" css={{ marginTop: '1rem' }}>
                {t('profile.form.address.title')}
              </Heading>
              <Text size="sm" css={{ color: 'var(--cocoso-mylla-soft)' }}>
                {t('profile.form.address.helper')}
              </Text>
              <ChoiceChips
                label={t('profile.form.address.title')}
                value={where}
                choices={[
                  {
                    value: 'place',
                    label: t('profile.form.address.place'),
                    icon: <MapPinIcon aria-hidden />,
                    content: (
                      <Controller
                        control={control}
                        name="homePlaceId"
                        render={({ field }) => (
                          <PlacePicker
                            places={places}
                            selectedId={field.value}
                            onPick={(place) => field.onChange(place._id)}
                          />
                        )}
                      />
                    ),
                  },
                  {
                    value: 'own',
                    label: t('profile.form.address.own'),
                    icon: <PencilLineIcon aria-hidden />,
                    content: (
                      <>
                        <Controller
                          control={control}
                          name="address"
                          render={({ field }) => (
                            <AddressFields
                              value={field.value}
                              onChange={field.onChange}
                            />
                          )}
                        />
                        <FormField label={t('profile.form.address.location')}>
                          <Controller
                            control={control}
                            name="locationId"
                            render={({ field }) => (
                              <LocationSelect
                                value={field.value}
                                onChange={(choice) =>
                                  field.onChange(choice.locationId)
                                }
                              />
                            )}
                          />
                        </FormField>
                      </>
                    ),
                  },
                ]}
                onChange={(choice) => {
                  setWhere(choice);
                  // the choice alone is a change worth saving
                  setValue(
                    'homePlaceId',
                    choice === 'own' ? null : defaultValues.homePlaceId || null,
                    { shouldDirty: true }
                  );
                }}
              />
            </>
          )}

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
