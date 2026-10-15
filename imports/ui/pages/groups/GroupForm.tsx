import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAtom, useAtomValue } from 'jotai';

import GenericEntryForm from '/imports/ui/forms/GenericEntryForm';
import ImageUploader from '/imports/ui/forms/ImageUploader';
import FormField from '/imports/ui/forms/FormField';
import LocationSelect from '/imports/ui/forms/LocationSelect';
import ContactFields, { emptyContact } from '/imports/ui/forms/ContactFields';
import { Contact, isReachable } from '/imports/api/_utils/contact';
import { message } from '/imports/ui/generic/message';
import { currentUserAtom } from '/imports/state';
import { loaderAtom } from '/imports/ui/utils/loaderHandler';
import { getImageUrl } from '/imports/ui/utils/imageHelper';

import groupFormFields from './groupFormFields';

interface GroupFormValues {
  isPrivate: boolean;
  title: string;
  readingMaterial: string;
  description: string;
  capacity: number;
}

interface GroupData extends GroupFormValues {
  contact?: Contact | null;
  imageUrl?: string;
  locationId?: string | null;
  isMunicipalityOnly?: boolean;
}

interface GroupFormProps {
  group?: GroupData;
  onFinalize: (group: GroupData) => void;
}

export const emptyFormValues: GroupFormValues = {
  isPrivate: false,
  title: '',
  readingMaterial: '',
  description: '',
  capacity: 40,
};

export default function GroupForm({ group, onFinalize }: GroupFormProps) {
  const currentUser = useAtomValue(currentUserAtom);
  const [state, setState] = useState({
    formValues: group || emptyFormValues,
    locationId: group?.locationId || null,
    isMunicipalityOnly: Boolean(group?.isMunicipalityOnly),
    // A new group starts from its author's own public contact details.
    contact: (group?.contact ||
      (currentUser as any)?.publicContact ||
      emptyContact) as Contact,
  });
  const [loaders, setLoaders] = useAtom(loaderAtom);
  const [t] = useTranslation('groups');
  const [tc] = useTranslation('common');

  useEffect(() => {
    if (!loaders || !loaders.isCreating) {
      return;
    }
    setLoaders((prevState) => ({
      ...prevState,
      isUploadingImages: true,
    }));
  }, [loaders?.isCreating]);

  const handleSubmit = (formValues: GroupFormValues) => {
    // Every group can be reached by email or phone.
    if (!isReachable(state.contact)) {
      message.error(tc('contact.errors.required'));
      return;
    }
    setState((prevState) => ({
      ...prevState,
      formValues: {
        ...formValues,
        capacity: Number(formValues.capacity),
      },
    }));
    setLoaders((prevState) => ({
      ...prevState,
      isCreating: true,
    }));
  };

  const parseGroup = (imageUrl: string) => {
    const newGroup: GroupData = {
      ...state.formValues,
      contact: state.contact,
      imageUrl,
      locationId: state.locationId,
      isMunicipalityOnly: state.isMunicipalityOnly,
    };

    onFinalize(newGroup);
  };

  const handleUploadedImages = (images: string[]) => {
    setLoaders((prevState) => ({
      ...prevState,
      isSendingForm: true,
    }));

    parseGroup(images?.length && (getImageUrl(images[0], 'full') || images[0]));
  };

  return (
    <GenericEntryForm
      childrenIndex={3}
      defaultValues={group || emptyFormValues}
      formFields={groupFormFields(t)}
      onSubmit={handleSubmit}
    >
      <FormField
        helper={t('form.image.helper')}
        label={t('form.image.label')}
        mt="4"
        mb="12"
        required
      >
        <ImageUploader
          isMultiple={false}
          ping={loaders?.isUploadingImages}
          preExistingImages={group ? [group.imageUrl] : []}
          onUploadedImages={handleUploadedImages}
        />
      </FormField>

      <FormField
        helper={t('form.contact.helper')}
        label={tc('contact.title')}
        mb="12"
        required
      >
        <ContactFields
          value={state.contact}
          onChange={(contact) =>
            setState((prevState) => ({ ...prevState, contact }))
          }
        />
      </FormField>

      <FormField
        helper={tc('locations.form.helperGroup')}
        label={tc('locations.form.label')}
        mb="12"
      >
        <LocationSelect
          allowMunicipalityOnly
          isMunicipalityOnly={state.isMunicipalityOnly}
          value={state.locationId}
          onChange={(choice) =>
            setState((prevState) => ({ ...prevState, ...choice }))
          }
        />
      </FormField>
    </GenericEntryForm>
  );
}
