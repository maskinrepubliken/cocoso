import { Controller, useForm } from 'react-hook-form';
import React, { useEffect, useRef, useState } from 'react';
import MapPinIcon from 'lucide-react/dist/esm/icons/map-pin';
import PencilLineIcon from 'lucide-react/dist/esm/icons/pencil-line';
import { useTranslation } from 'react-i18next';

import { Box, Button, Flex, Input } from '/imports/ui/core';
import { isReachable } from '/imports/api/_utils/contact';
import {
  Address,
  hasAddress,
  isCompleteAddress,
} from '/imports/api/_utils/address';
import AddressFields from '/imports/ui/forms/AddressFields';
import FileDropper from '/imports/ui/forms/FileDropper';
import LocationSelect from '/imports/ui/forms/LocationSelect';
import { useEntryFormSheet } from '/imports/ui/forms/EntryFormSheet.context';
import { message } from '/imports/ui/generic/message';
import { getImageUrl } from '/imports/ui/utils/imageHelper';
import { call } from '/imports/api/_utils/shared';
import ChoiceChips from '/imports/ui/pages/activities/form/ChoiceChips';
import FormCard from '/imports/ui/pages/activities/form/FormCard';
import PlacePicker, {
  type PlaceOption,
} from '/imports/ui/pages/activities/form/PlacePicker';

import FormField from '../../forms/FormField';
import Quill from '../../forms/Quill';

export interface ProfileFormValues {
  // One name, a person's or a group's. Kept in firstName, with lastName
  // emptied, so that everything showing the two together shows this.
  name: string;
  bio: string;
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

// The profile as the form gets it (getProfileToEdit)
export interface EditableProfile
  extends Partial<Omit<ProfileFormValues, 'name'>> {
  _id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  avatar?: { src?: string } | null;
  isOrganizer?: boolean;
}

// What is saved beside the fields: the picture, only when changed
export interface ProfileExtras {
  // A new picture to upload, or null to take the picture away
  avatar?: File | null;
}

interface ProfileFormProps {
  profile: EditableProfile;
  onSubmit: (
    data: Partial<ProfileFormValues>,
    extras: ProfileExtras
  ) => Promise<void> | void;
}

// The profile form, laid out as the event and place forms are: who they
// are (name, picture, text) in the wide column, the details as cards
// beside it.
// Inside the entry sheet, Save is the sheet's.
function ProfileForm({ profile, onSubmit }: ProfileFormProps) {
  // Organizers must give an email or a phone (see _utils/contact.ts), and
  // say where they usually are
  const contactRequired = Boolean(profile.isOrganizer);
  // Whether the location (Ort) was picked by hand since the address last
  // changed; else it follows the address (AddressFields suggests it)
  const locationByHand = useRef(false);
  const { control, formState, handleSubmit, register, setValue } = useForm({
    defaultValues: {
      ...profile,
      name: [profile.firstName, profile.lastName].filter(Boolean).join(' '),
    } as Partial<ProfileFormValues>,
  });
  const sheet = useEntryFormSheet();
  // At one of the places, or at an address of their own
  const [where, setWhere] = useState<'place' | 'own'>(
    profile.homePlaceId ? 'place' : 'own'
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

  // The picture: as saved, a new one chosen (shown from the file until it
  // is uploaded on Save), or taken away
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarRemoved, setAvatarRemoved] = useState(false);
  const savedAvatar = avatarRemoved
    ? null
    : getImageUrl(profile.avatar?.src, 'medium');

  const pickAvatar = (files: File[]) => {
    const file = files?.[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      setAvatarFile(file);
      setAvatarPreview(reader.result as string);
    });
    reader.readAsDataURL(file);
  };

  const removeAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    setAvatarRemoved(true);
  };

  const [t] = useTranslation('members');
  const [ta] = useTranslation('accounts');
  const [tc] = useTranslation('common');

  const submit = (data: Partial<ProfileFormValues>) => {
    const extras: ProfileExtras = {
      ...(avatarFile
        ? { avatar: avatarFile }
        : avatarRemoved && profile.avatar?.src
        ? { avatar: null }
        : {}),
    };
    if (contactRequired && !isReachable(data.publicContact)) {
      message.formError(tc('contact.errors.required'));
      return undefined;
    }
    if (where === 'place') {
      // A place stands for the address
      return onSubmit({ ...data, address: null, locationId: null }, extras);
    }
    if (hasAddress(data.address) && !isCompleteAddress(data.address)) {
      message.formError(tc('address.errors.required'));
      return undefined;
    }
    return onSubmit({ ...data, homePlaceId: null }, extras);
  };

  return (
    <form id={sheet?.formId} onSubmit={handleSubmit(submit)}>
      <div className="entry-form-grid" data-columns="two">
        <div className="entry-form-main">
          {/* The name, set large like the title it becomes */}
          <div className="entry-form-lead">
            <FormField label={t('profile.form.name.label')}>
              <Input {...register('name')} autoComplete="off" />
            </FormField>
          </div>

          {/* The picture, right under the name it goes with */}
          <FormField label={ta('profile.image')}>
            <Flex align="center" gap="4">
              <Box h="120px" w="120px" css={{ flexShrink: 0 }}>
                <FileDropper
                  height="100%"
                  imageFit="cover"
                  imageUrl={avatarPreview || savedAvatar || undefined}
                  setUploadableImage={pickAvatar}
                />
              </Box>
              <div>
                <p className="form-preview-note">
                  {t('profile.form.avatar.helper')}
                </p>
                {(avatarPreview || savedAvatar) && (
                  <Button
                    colorScheme="red"
                    mt="2"
                    size="sm"
                    // not the form's submit button, which Enter in a
                    // field would press
                    type="button"
                    variant="ghost"
                    onClick={removeAvatar}
                  >
                    {ta('profile.form.avatar.remove')}
                  </Button>
                )}
              </div>
            </Flex>
          </FormField>

          <FormField label={t('profile.form.bio.label')}>
            <Controller
              control={control}
              name="bio"
              render={({ field }) => <Quill {...field} />}
            />
          </FormField>
        </div>

        <div className="entry-form-side">
          <FormCard title={t('profile.form.publicContact.title')}>
            <p className="form-preview-note">
              {t('profile.form.publicContact.helper')}
              {contactRequired && (
                <>
                  {' '}
                  <strong>{t('profile.form.publicContact.required')}</strong>
                </>
              )}
            </p>
            <FormField label={t('profile.form.publicContact.email')} my="2">
              <Input
                {...register('publicContact.email')}
                placeholder="namn@exempel.se"
                type="email"
              />
            </FormField>
            <FormField label={t('profile.form.publicContact.phone')} my="2">
              <Input
                {...register('publicContact.phone')}
                placeholder="070-123 45 67"
                type="tel"
              />
            </FormField>
            <FormField label={t('profile.form.publicContact.website')} my="2">
              <Input
                {...register('publicContact.website')}
                placeholder="https://"
                type="url"
              />
            </FormField>
          </FormCard>

          {/* Organizers: where they usually are. The event form starts
              from this address and place. */}
          {contactRequired && (
            <FormCard tall title={t('profile.form.address.title')}>
              <p className="form-preview-note">
                {t('profile.form.address.helper')}
              </p>
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
                              onChange={(address) => {
                                locationByHand.current = false;
                                field.onChange(address);
                              }}
                              onLocationSuggested={(locationId) =>
                                !locationByHand.current &&
                                setValue('locationId', locationId, {
                                  shouldDirty: true,
                                })
                              }
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
                                onChange={(choice) => {
                                  locationByHand.current = true;
                                  field.onChange(choice.locationId);
                                }}
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
                  setValue(
                    'homePlaceId',
                    choice === 'own' ? null : profile.homePlaceId || null
                  );
                }}
              />
            </FormCard>
          )}
        </div>
      </div>

      {!sheet && (
        <Flex justify="flex-end" mt="8" mb="12">
          <Button loading={formState.isSubmitting} type="submit">
            {tc('actions.submit')}
          </Button>
        </Flex>
      )}
    </form>
  );
}

export default ProfileForm;
