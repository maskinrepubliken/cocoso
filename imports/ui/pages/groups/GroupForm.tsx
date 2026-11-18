import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAtom, useAtomValue } from 'jotai';
import GlobeIcon from 'lucide-react/dist/esm/icons/globe';
import LockIcon from 'lucide-react/dist/esm/icons/lock';

import { NumberInput } from '/imports/ui/core';
import GenericEntryForm from '/imports/ui/forms/GenericEntryForm';
import ImageUploader from '/imports/ui/forms/ImageUploader';
import FormField from '/imports/ui/forms/FormField';
import LocationSelect from '/imports/ui/forms/LocationSelect';
import ContactFields, { emptyContact } from '/imports/ui/forms/ContactFields';
import {
  DraftNotice,
  draftBase,
  useDraftKey,
  useKeepDraft,
  useLoadedDraft,
} from '/imports/ui/forms/useFormDraft';
import { Contact, isReachable } from '/imports/api/_utils/contact';
import { message } from '/imports/ui/generic/message';
import { currentUserAtom } from '/imports/state';
import { loaderAtom } from '/imports/ui/utils/loaderHandler';
import { getImageUrl } from '/imports/ui/utils/imageHelper';
import ChoiceChips from '/imports/ui/pages/activities/form/ChoiceChips';
import FormCard from '/imports/ui/pages/activities/form/FormCard';

import groupFormFields from './groupFormFields';

interface GroupFormValues {
  title: string;
  readingMaterial: string;
  description: string;
}

interface GroupData extends GroupFormValues {
  isPrivate?: boolean;
  capacity?: number;
  contact?: Contact | null;
  imageUrl?: string;
  locationId?: string | null;
  isMunicipalityOnly?: boolean;
}

interface GroupFormProps {
  group?: GroupData;
  // The group being edited, for its own draft
  groupId?: string;
  // Resolves to true once saved, which throws the draft away
  onFinalize: (group: GroupData) => Promise<boolean | void> | void;
}

export const emptyFormValues: GroupFormValues = {
  title: '',
  readingMaterial: '',
  description: '',
};

// What a draft keeps (see useFormDraft): the typed texts, and everything
// chosen in the cards. Pictures not yet uploaded are not.
const DRAFT_FIELDS = [
  'isPrivate',
  'locationId',
  'isMunicipalityOnly',
  'contact',
  'capacity',
] as const;
const TEXT_FIELDS = ['title', 'readingMaterial', 'description'] as const;

// The group form, laid out like the event, place and request forms: the
// name, what the group is and its picture in the wide column, the details
// as cards beside them. It keeps a draft of what is written in this browser
// until the group is saved; throwing the draft away starts the form over.
export default function GroupForm(props: GroupFormProps) {
  const { key, formKey, discard } = useDraftKey(
    `group:${props.groupId || 'new'}`
  );
  return (
    <GroupEntryForm
      key={formKey}
      {...props}
      draftKey={key}
      onDiscard={discard}
    />
  );
}

function GroupEntryForm({
  group,
  onFinalize,
  draftKey,
  onDiscard,
}: GroupFormProps & { draftKey: string; onDiscard: () => void }) {
  const currentUser = useAtomValue(currentUserAtom);
  const [t] = useTranslation('groups');
  const [tc] = useTranslation('common');
  const [pristine] = useState<any>(() => ({
    isPrivate: Boolean(group?.isPrivate),
    locationId: group?.locationId || null,
    isMunicipalityOnly: Boolean(group?.isMunicipalityOnly),
    // A new group starts from its author's own public contact details
    contact: (group?.contact ||
      (currentUser as any)?.publicContact ||
      emptyContact) as Contact,
    capacity: group?.capacity ?? 40,
  }));
  // Editing: the group as saved, so a draft from before it was saved again
  // is dropped rather than undoing that
  const [base] = useState(() =>
    group ? draftBase(pristine, group, DRAFT_FIELDS, TEXT_FIELDS) : undefined
  );
  const draft = useLoadedDraft(draftKey, base);
  const defaultValues = {
    ...(group || emptyFormValues),
    ...(draft?.data.values || {}),
  };
  const [state, setState] = useState<any>(() => ({
    ...pristine,
    ...(draft?.data.state || {}),
    formValues: defaultValues,
  }));
  const { onValuesChange, markSaved } = useKeepDraft({
    key: draftKey,
    draft,
    state,
    pristineState: pristine,
    pristineValues: group || emptyFormValues,
    stateFields: DRAFT_FIELDS,
    textFields: TEXT_FIELDS,
    base,
  });
  const [loaders, setLoaders] = useAtom(loaderAtom);

  const set = (values: Record<string, any>) =>
    setState((prevState: any) => ({ ...prevState, ...values }));

  // A private group cannot be made open again
  const isLockedPrivate = Boolean(group?.isPrivate);

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
      message.formError(tc('contact.errors.required'));
      return;
    }
    set({ formValues });
    setLoaders((prevState) => ({
      ...prevState,
      isCreating: true,
    }));
  };

  const parseGroup = async (imageUrl: string) => {
    const newGroup: GroupData = {
      ...state.formValues,
      isPrivate: state.isPrivate,
      capacity: Number(state.capacity) || 0,
      contact: state.contact,
      imageUrl,
      locationId: state.locationId,
      isMunicipalityOnly: state.isMunicipalityOnly,
    };
    if ((await onFinalize(newGroup)) === true) {
      markSaved();
    }
  };

  const handleUploadedImages = (images: string[]) => {
    setLoaders((prevState) => ({
      ...prevState,
      isSendingForm: true,
    }));
    parseGroup(images?.length && (getImageUrl(images[0], 'full') || images[0]));
  };

  return (
    <>
      <DraftNotice draft={draft} onDiscard={onDiscard} />
      <GenericEntryForm
        childrenIndex={3}
        defaultValues={defaultValues}
        formFields={groupFormFields(t)}
        onSubmit={handleSubmit}
        onValuesChange={onValuesChange}
      >
        <FormField
          area="main"
          helper={t('groupForm.image.helper')}
          label={t('groupForm.image.label')}
          mb="12"
          required
        >
          <ImageUploader
            isMultiple={false}
            ping={loaders?.isUploadingImages}
            preExistingImages={group?.imageUrl ? [group.imageUrl] : []}
            onUploadedImages={handleUploadedImages}
          />
        </FormField>

        {/* The details as cards in the right column, as in the event,
          place and request forms */}
        <FormCard title={t('groupForm.visibility.title')}>
          <ChoiceChips
            label={t('groupForm.visibility.title')}
            value={state.isPrivate ? 'private' : 'open'}
            choices={[
              {
                value: 'open',
                label: t('groupForm.visibility.open'),
                icon: <GlobeIcon aria-hidden />,
                description: t('groupForm.visibility.openHelp'),
                disabled: isLockedPrivate,
              },
              {
                value: 'private',
                label: t('groupForm.visibility.private'),
                icon: <LockIcon aria-hidden />,
                description: isLockedPrivate
                  ? t('groupForm.visibility.locked')
                  : t('groupForm.visibility.privateHelp'),
              },
            ]}
            onChange={(value) => set({ isPrivate: value === 'private' })}
          />
        </FormCard>

        <FormCard title={t('groupForm.where')}>
          <p className="form-preview-note">
            {tc('locations.form.helperGroup')}
          </p>
          <LocationSelect
            allowMunicipalityOnly
            isMunicipalityOnly={state.isMunicipalityOnly}
            value={state.locationId}
            onChange={(choice) => set(choice)}
          />
        </FormCard>

        <FormCard title={tc('contact.title')}>
          <p className="form-preview-note">{t('groupForm.contactHelp')}</p>
          <ContactFields
            value={state.contact}
            onChange={(contact) => set({ contact })}
          />
        </FormCard>

        <FormCard title={t('groupForm.meetings.title')}>
          <p className="form-preview-note">
            {t('groupForm.meetings.capacityHelp')}
          </p>
          <NumberInput
            aria-label={t('groupForm.meetings.capacity')}
            min={1}
            value={state.capacity}
            onChange={(event) => set({ capacity: event.target.value })}
          />
        </FormCard>
      </GenericEntryForm>
    </>
  );
}
