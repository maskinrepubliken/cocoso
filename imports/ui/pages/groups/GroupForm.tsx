import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAtom, useAtomValue } from 'jotai';
import GlobeIcon from 'lucide-react/dist/esm/icons/globe';
import LockIcon from 'lucide-react/dist/esm/icons/lock';

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
import { call } from '/imports/api/_utils/shared';
import ChoiceChips from '/imports/ui/pages/activities/form/ChoiceChips';
import FormCard from '/imports/ui/pages/activities/form/FormCard';
import {
  ContactPreview,
  OWN_CONTACT,
} from '/imports/ui/pages/activities/form/OrganizerFields';
import { PersonAvatar } from '/imports/ui/pages/activities/form/PersonCard';
import PencilLineIcon from 'lucide-react/dist/esm/icons/pencil-line';

// An owner, as getGroupOwnerContacts gives them
interface OwnerContact {
  _id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  avatar?: string | null;
  publicContact?: Contact | null;
}

import groupFormFields from './groupFormFields';

interface GroupFormValues {
  title: string;
  readingMaterial: string;
  description: string;
}

interface GroupData extends GroupFormValues {
  isPrivate?: boolean;
  contact?: Contact | null;
  // The owner whose profile's contact details the group shows
  contactUserId?: string | null;
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
  'contactChoice',
  'contact',
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
  groupId,
  onFinalize,
  draftKey,
  onDiscard,
}: GroupFormProps & { draftKey: string; onDiscard: () => void }) {
  const currentUser = useAtomValue(currentUserAtom);
  const [t] = useTranslation('groups');
  const [tc] = useTranslation('common');
  // The event form's words for the same choice
  const [ta] = useTranslation('activities');
  const [pristine] = useState<any>(() => ({
    isPrivate: Boolean(group?.isPrivate),
    locationId: group?.locationId || null,
    isMunicipalityOnly: Boolean(group?.isMunicipalityOnly),
    // Whose contact details the group shows, as in the event form: an
    // owner's (their user id; a new group's creator to begin with) or the
    // group's own
    contactChoice:
      group?.contactUserId ||
      (group ? OWN_CONTACT : (currentUser as any)?._id || OWN_CONTACT),
    // Its own details; a group shown through an owner has none
    contact: ((!group?.contactUserId && group?.contact) ||
      emptyContact) as Contact,
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

  // The owners who may be its contact, with their profiles' details
  const [owners, setOwners] = useState<OwnerContact[]>([]);
  useEffect(() => {
    call('getGroupOwnerContacts', groupId || null)
      .then((found) => setOwners((found as OwnerContact[]) || []))
      .catch(() => setOwners([]));
  }, [groupId]);
  // An owner no longer an owner falls back to the group's own details
  const isOwnContact =
    state.contactChoice === OWN_CONTACT ||
    (owners.length > 0 &&
      !owners.some((owner) => owner._id === state.contactChoice));
  const contactOwner = owners.find((o) => o._id === state.contactChoice);

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
    // Every group can be reached by email or phone: its own details, or the
    // chosen owner's profile
    const reachable = isOwnContact
      ? isReachable(state.contact)
      : isReachable(contactOwner?.publicContact);
    if (!reachable) {
      message.formError(
        isOwnContact
          ? tc('contact.errors.required')
          : t('groupForm.ownerContactMissing')
      );
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
      contact: isOwnContact ? state.contact : null,
      contactUserId: isOwnContact ? null : state.contactChoice,
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

        {/* As in the event form: one of the owners, shown with their
          profile's details, or details of the group's own */}
        <FormCard title={tc('contact.title')}>
          <p className="form-preview-note">{t('groupForm.contactHelp')}</p>
          <ChoiceChips
            label={tc('contact.title')}
            value={isOwnContact ? OWN_CONTACT : state.contactChoice}
            choices={[
              ...owners.map((owner) => ({
                value: owner._id,
                label:
                  owner._id === currentUser?._id
                    ? ta('form.contact.standard')
                    : owner.firstName || owner.username,
                icon: <PersonAvatar person={owner} size={26} />,
                content: (
                  <ContactPreview
                    contact={owner.publicContact}
                    empty={ta('form.contact.none')}
                    person={owner}
                  />
                ),
              })),
              {
                value: OWN_CONTACT,
                label: ta('form.contact.own'),
                icon: <PencilLineIcon aria-hidden />,
                content: (
                  <ContactFields
                    value={state.contact}
                    onChange={(contact) => set({ contact })}
                  />
                ),
              },
            ]}
            onChange={(contactChoice) => set({ contactChoice })}
          />
        </FormCard>
      </GenericEntryForm>
    </>
  );
}
