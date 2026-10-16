import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAtom, useAtomValue } from 'jotai';

import { NumberInput } from '/imports/ui/core';
import { currentUserAtom, roleAtom } from '/imports/state';
import { loaderAtom } from '/imports/ui/utils/loaderHandler';
import { call } from '/imports/api/_utils/shared';
import GenericEntryForm from '/imports/ui/forms/GenericEntryForm';
import ImageUploader from '/imports/ui/forms/ImageUploader';
import FormField from '/imports/ui/forms/FormField';
import { emptyAddress } from '/imports/ui/forms/AddressFields';
import { emptyContact } from '/imports/ui/forms/ContactFields';
import {
  Address,
  hasAddress,
  isCompleteAddress,
} from '/imports/api/_utils/address';
import type { Contact } from '/imports/api/_utils/contact';
import DatesAndTimes, {
  emptyDateAndTime,
} from '/imports/ui/forms/DatesAndTimes';
import { message } from '/imports/ui/generic/message';
import type { SelectedResource, DateAndTime } from '/imports/ui/types';

import publicActivityFormFields from './publicActivityFormFields';
import OrganizerFields, {
  OWN_CONTACT,
  type OrganizerDefaults,
  type OrganizerOption,
  type OrganizerRef,
} from './form/OrganizerFields';
import WhereFields, { type WhereMode } from './form/WhereFields';
import FormCard from './form/FormCard';
import KindPicker from './form/KindPicker';
import ToggleSwitch from './form/ToggleSwitch';

const defaultCapacity = 40;
const maxAttendees = 1000;

interface ActivityFormValues {
  longDescription: string;
  place: string;
  subTitle: string;
  title: string;
}

interface ActivityData extends ActivityFormValues {
  _id?: string;
  address?: Partial<Address> | null;
  capacity?: number;
  datesAndTimes?: DateAndTime[];
  images?: string[];
  resource?: string;
  resourceId?: string;
  locationId?: string | null;
  isMunicipalityOnly?: boolean;
  isExclusiveActivity?: boolean;
  isRegistrationEnabled?: boolean;
  isRegistrationDisabled?: boolean;
  category?: { key?: string } | null;
  organizers?: OrganizerRef[];
  contact?: Contact | null;
  contactUserId?: string | null;
  authorId?: string;
}

const hasContact = (contact?: Contact | null) =>
  Boolean(contact && (contact.email || contact.phone || contact.website));

// The same address, ignoring case and spacing: an event at the organizer's
// address is shown as such when it is edited.
const sameAddress = (
  a?: Partial<Address> | null,
  b?: Partial<Address> | null
) => {
  const key = (x?: Partial<Address> | null) =>
    [x?.street, x?.postalCode, x?.city]
      .map((part) =>
        String(part || '')
          .replace(/\s+/g, '')
          .toLowerCase()
      )
      .join('|');
  return Boolean(a && b) && key(a) === key(b);
};

interface PublicActivityFormProps {
  activity?: ActivityData;
  onFinalize: (activity: any) => void;
}

export const emptyFormValues: ActivityFormValues = {
  longDescription: '',
  place: '',
  subTitle: '',
  title: '',
};

export default function PublicActivityForm({
  activity,
  onFinalize,
}: PublicActivityFormProps) {
  const currentUser = useAtomValue(currentUserAtom);
  const role = useAtomValue(roleAtom);
  const isAdmin = role === 'admin';
  const [state, setState] = useState<any>({
    capacity: activity ? activity.capacity : defaultCapacity,
    datesAndTimes: activity ? activity.datesAndTimes : [emptyDateAndTime],
    formValues: activity || emptyFormValues,
    selectedResource: activity?.resourceId
      ? { label: activity.resource, _id: activity.resourceId }
      : null,
    isExclusiveActivity: activity ? activity.isExclusiveActivity : true,
    isRegistrationEnabled: activity ? activity.isRegistrationEnabled : false,
    locationId: activity?.locationId || null,
    isMunicipalityOnly: Boolean(activity?.isMunicipalityOnly),
    categoryKey: activity?.category?.key || '',
    organizers: activity?.organizers || [],
    // The organizer: the person creating the event; an admin may name
    // someone else, also later.
    authorId: activity?.authorId || currentUser?._id || '',
    // Contact details from an organizer's profile, or the event's own
    contactChoice: hasContact(activity?.contact)
      ? OWN_CONTACT
      : activity?.contactUserId || '',
    contact: { ...emptyContact, ...(activity?.contact || {}) },
    // Decided once the organizer's profile is known (see below)
    whereMode: (activity?.resourceId ? 'place' : null) as WhereMode | null,
    placeName: activity?.place || '',
    // Only used when no place is chosen; a place brings its own address.
    address: activity?.address || emptyAddress,
    resources: [],
  });
  const [organizerOptions, setOrganizerOptions] = useState<OrganizerOption[]>(
    []
  );
  const [author, setAuthor] = useState<OrganizerDefaults | null>(null);
  const [contactPerson, setContactPerson] = useState<OrganizerDefaults | null>(
    null
  );
  const [loaders, setLoaders] = useAtom(loaderAtom);
  const [t] = useTranslation('activities');
  const [tc] = useTranslation('common');
  const [isSubmitButtonDisabled, setIsSubmitButtonDisabled] = useState(false);

  const getResources = async () => {
    try {
      const resources = await call('getResourcesDry');
      // Every place counts, bookable or not: an event happens somewhere.
      setState((prevState) => ({
        ...prevState,
        resources,
      }));
    } catch (error: any) {
      message.error(error.reason || error.error);
    }
  };

  useEffect(() => {
    getResources();
    call<OrganizerOption[]>('getOrganizerOptions', true)
      .then((options) => setOrganizerOptions(options || []))
      .catch(() => setOrganizerOptions([]));
  }, []);

  // The organizer's profile: contact, address and place the event starts
  // from. Fetched again when an admin names another organizer.
  useEffect(() => {
    if (!state.authorId) {
      return;
    }
    let cancelled = false;
    call<OrganizerDefaults>('getOrganizerDefaults', state.authorId)
      .then((defaults) => {
        if (!cancelled) {
          setAuthor(defaults);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAuthor(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [state.authorId]);

  // Where the event is, once the organizer's address is known: a new event
  // starts at it (or at a place when there is none); an event being edited
  // shows the organizer's address when it is the same one.
  useEffect(() => {
    if (state.whereMode || !author) {
      return;
    }
    let whereMode: WhereMode;
    if (activity?.address) {
      whereMode = sameAddress(activity.address, author.address)
        ? 'organizer'
        : 'own';
    } else if (activity) {
      whereMode = activity.place || activity.locationId ? 'own' : 'place';
    } else {
      whereMode = author.address ? 'organizer' : 'place';
    }
    setState((prevState: any) => ({
      ...prevState,
      whereMode,
      // An address of its own starts in the organizer's place
      locationId: prevState.locationId || author.locationId || null,
    }));
  }, [author, state.whereMode]);

  const whereMode: WhereMode = state.whereMode || 'place';

  // Whose contact details the event shows: the chosen organizer while they
  // are one of its organizers, otherwise the organizer.
  const contactChoice: string =
    state.contactChoice === OWN_CONTACT ||
    state.organizers.some((o: OrganizerRef) => o.userId === state.contactChoice)
      ? state.contactChoice
      : state.authorId;

  useEffect(() => {
    if (contactChoice === OWN_CONTACT || !contactChoice) {
      return;
    }
    if (contactChoice === state.authorId) {
      setContactPerson(author);
      return;
    }
    let cancelled = false;
    call<OrganizerDefaults>('getOrganizerDefaults', contactChoice)
      .then((defaults) => !cancelled && setContactPerson(defaults))
      .catch(() => !cancelled && setContactPerson(null));
    return () => {
      cancelled = true;
    };
  }, [contactChoice, author]);

  // Where a person edits the details the form starts from: one's own
  // profile, or as admin anyone's.
  const profileLinkFor = (
    person?: { _id?: string; username?: string } | null
  ) => {
    if (!person?._id) {
      return null;
    }
    if (person._id === currentUser?._id) {
      return '/admin/my-profile/general';
    }
    return isAdmin && person.username
      ? `/admin/users/${encodeURIComponent(person.username)}/profile`
      : null;
  };

  const isFormValid = () => {
    const { datesAndTimes } = state;
    const isConflictHard = datesAndTimes?.some((occurrence) => {
      return Boolean(occurrence.conflict) && occurrence.isConflictHard;
    });

    const regex = /^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/;
    const isTimesInValid = datesAndTimes?.some(
      (dateTime) =>
        !regex.test(dateTime.startTime) || !regex.test(dateTime.endTime)
    );

    setIsSubmitButtonDisabled(isTimesInValid || isConflictHard);
  };

  useEffect(() => {
    isFormValid();
  }, [state.datesAndTimes, state.selectedResource, state.isExclusiveActivity]);

  useEffect(() => {
    if (!loaders || !loaders.isCreating) {
      return;
    }
    setLoaders((prevState) => ({
      ...prevState,
      isUploadingImages: true,
    }));
  }, [loaders?.isCreating]);

  const handleSubmit = (formValues: ActivityFormValues) => {
    // An address of its own must be complete if one is given at all.
    if (whereMode === 'place' && !state.selectedResource) {
      message.error(t('form.where.placeRequired'));
      return;
    }
    if (
      whereMode === 'own' &&
      hasAddress(state.address) &&
      !isCompleteAddress(state.address)
    ) {
      message.error(tc('address.errors.required'));
      return;
    }
    setState((prevState) => ({
      ...prevState,
      formValues,
    }));
    setLoaders((prevState) => ({
      ...prevState,
      isCreating: true,
    }));
  };

  const handleDatesAndTimesChange = (datesAndTimes: DateAndTime[]) => {
    setState((prevState) => ({
      ...prevState,
      datesAndTimes,
    }));
  };

  const handleSelectResource = (selectedResource: SelectedResource | null) => {
    setState((prevState) => ({
      ...prevState,
      selectedResource,
    }));
  };

  const handleCapacityChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setState((prevState) => ({
      ...prevState,
      capacity: value,
    }));
  };

  const parseActivity = async (images: string[]) => {
    const sortedDatesAndTimes = state.datesAndTimes.sort((a, b) => {
      const dateA = new Date(`${a.startDate}T${a.startTime}:00Z`);
      const dateB = new Date(`${b.startDate}T${b.startTime}:00Z`);
      return dateA - dateB;
    });

    const cleanDatesAndTimes = sortedDatesAndTimes.map(
      ({ startTime, endTime, startDate, endDate, attendees }) => ({
        startDate,
        endDate,
        startTime,
        endTime,
        attendees: attendees || [],
      })
    );

    const atOrganizer = whereMode === 'organizer' && author?.address;
    const own = whereMode === 'own';
    const newActivity: any = {
      ...state.formValues,
      place: own ? state.placeName : '',
      capacity: state.capacity,
      datesAndTimes: cleanDatesAndTimes,
      images,
      isPublicActivity: true,
      isRegistrationEnabled: state.isRegistrationEnabled,
      isExclusiveActivity: state.isExclusiveActivity,
      category: state.categoryKey ? { key: state.categoryKey } : null,
      ...(isAdmin && state.authorId ? { authorId: state.authorId } : {}),
      organizers: state.organizers.filter(
        (o: OrganizerRef) => o.userId !== state.authorId
      ),
      contact: contactChoice === OWN_CONTACT ? state.contact : null,
      contactUserId: contactChoice === OWN_CONTACT ? null : contactChoice,
      address: atOrganizer ? author.address : own ? state.address : null,
      locationId: atOrganizer
        ? author.locationId || null
        : own
        ? state.locationId
        : null,
      isMunicipalityOnly: own ? state.isMunicipalityOnly : false,
    };

    const selectedResource =
      whereMode === 'place' ? state.selectedResource : null;

    if (selectedResource) {
      newActivity.resourceId = selectedResource._id;
      newActivity.resource = selectedResource.label;
      // The place says where; a typed name would only compete
      newActivity.place = '';
    } else {
      // No place chosen: the server drops any earlier one
      newActivity.resourceId = null;
      newActivity.resource = null;
    }

    onFinalize(newActivity);
  };

  const handleUploadedImages = (images: string[]) => {
    setLoaders((prevState) => ({
      ...prevState,
      isSendingForm: true,
    }));

    parseActivity(images);
  };

  return (
    <GenericEntryForm
      childrenIndex={2}
      defaultValues={activity || emptyFormValues}
      formFields={publicActivityFormFields(t).filter(
        // The place's name is part of "Var" below
        (field) => field.value !== 'place'
      )}
      isSubmitButtonDisabled={isSubmitButtonDisabled}
      onSubmit={handleSubmit}
    >
      <FormField
        area="main"
        helper={t('form.image.helper')}
        label={t('form.image.label')}
        mt="4"
        mb="8"
        required
      >
        <ImageUploader
          preExistingImages={activity ? activity.images : []}
          ping={loaders?.isUploadingImages}
          onUploadedImages={handleUploadedImages}
        />
      </FormField>

      <FormCard title={tc('eventKinds.form.label')}>
        <p className="form-preview-note">{tc('eventKinds.form.helper')}</p>
        <KindPicker
          value={state.categoryKey}
          onChange={(categoryKey) =>
            setState((prevState: any) => ({ ...prevState, categoryKey }))
          }
        />
      </FormCard>

      <FormCard title={t('form.cards.organizer')}>
        <OrganizerFields
          author={author}
          authorId={state.authorId}
          contact={state.contact}
          contactChoice={contactChoice}
          contactPerson={contactPerson}
          currentUserId={currentUser?._id}
          isAdmin={isAdmin}
          options={organizerOptions}
          organizers={state.organizers}
          profileLinkFor={profileLinkFor}
          onAuthorChange={(authorId) =>
            setState((prevState: any) => ({
              ...prevState,
              authorId,
              // the new organizer is not also a co-organizer
              organizers: prevState.organizers.filter(
                (o: OrganizerRef) => o.userId !== authorId
              ),
            }))
          }
          onContactChange={(contact) =>
            setState((prevState: any) => ({ ...prevState, contact }))
          }
          onContactChoiceChange={(choice) =>
            setState((prevState: any) => ({
              ...prevState,
              contactChoice: choice,
            }))
          }
          onOrganizersChange={(organizers) =>
            setState((prevState: any) => ({ ...prevState, organizers }))
          }
        />
      </FormCard>

      <FormCard title={t('form.cards.place')}>
        <WhereFields
          address={state.address}
          isMunicipalityOnly={state.isMunicipalityOnly}
          locationId={state.locationId}
          mode={whereMode}
          organizerAddress={author?.address || null}
          organizerLocationId={author?.locationId || null}
          placeName={state.placeName}
          profileLink={profileLinkFor(author)}
          resources={state.resources}
          selectedResource={state.selectedResource}
          onAddressChange={(address) =>
            setState((prevState: any) => ({ ...prevState, address }))
          }
          onLocationChange={(choice) =>
            setState((prevState: any) => ({ ...prevState, ...choice }))
          }
          onModeChange={(mode) =>
            setState((prevState: any) => ({ ...prevState, whereMode: mode }))
          }
          onPlaceNameChange={(placeName) =>
            setState((prevState: any) => ({ ...prevState, placeName }))
          }
          onSelectResource={handleSelectResource}
        />
      </FormCard>

      <FormField
        area="main"
        helper={t('form.occurrences.helper')}
        label={t('form.occurrences.label')}
        my="8"
        required
      >
        <DatesAndTimes
          activityId={activity?._id}
          datesAndTimes={state.datesAndTimes}
          isExclusiveActivity={state.isExclusiveActivity}
          resourceId={
            whereMode === 'place' ? state.selectedResource?._id : undefined
          }
          onDatesAndTimesChange={handleDatesAndTimesChange}
        />
      </FormField>

      <FormCard title={t('form.cards.booking')}>
        {/* Blocking the place only means something at a place */}
        {whereMode === 'place' && state.selectedResource && (
          <ToggleSwitch
            checked={Boolean(state.isExclusiveActivity)}
            helper={t('form.booking.exclusiveHelper')}
            label={t('form.booking.exclusive')}
            onChange={(isExclusiveActivity) =>
              setState((prevState: any) => ({
                ...prevState,
                isExclusiveActivity,
              }))
            }
          />
        )}
        <ToggleSwitch
          checked={Boolean(state.isRegistrationEnabled)}
          helper={t('form.booking.rsvpHelper')}
          label={t('form.booking.rsvp')}
          onChange={(isRegistrationEnabled) =>
            setState((prevState: any) => ({
              ...prevState,
              isRegistrationEnabled,
            }))
          }
        />
        {state.isRegistrationEnabled && (
          <FormField
            helper={t('form.booking.capacityHelper')}
            label={t('form.capacity.label')}
          >
            <NumberInput
              min={1}
              max={maxAttendees}
              placeholder={t('form.capacity.label')}
              value={state.capacity}
              onChange={handleCapacityChange}
            />
          </FormField>
        )}
      </FormCard>
    </GenericEntryForm>
  );
}
