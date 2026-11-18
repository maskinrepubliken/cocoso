import React, { useEffect, useState } from 'react';
import { Box, Checkbox, Text } from '/imports/ui/core';
import { useTranslation } from 'react-i18next';
import { useAtom, useAtomValue } from 'jotai';

import GenericEntryForm from '/imports/ui/forms/GenericEntryForm';
import ImageUploader from '/imports/ui/forms/ImageUploader';
import FormField from '/imports/ui/forms/FormField';
import LocationSelect from '/imports/ui/forms/LocationSelect';
import AddressFields, { emptyAddress } from '/imports/ui/forms/AddressFields';
import ContactFields, { emptyContact } from '/imports/ui/forms/ContactFields';
import { Address, isCompleteAddress } from '/imports/api/_utils/address';
import { Contact, isReachable } from '/imports/api/_utils/contact';
import { call } from '/imports/api/_utils/shared';
import { kindsOf } from '/imports/api/_utils/kinds';
import { loaderAtom } from '/imports/ui/utils/loaderHandler';
import {
  DraftNotice,
  draftBase,
  useDraftKey,
  useKeepDraft,
  useLoadedDraft,
} from '/imports/ui/forms/useFormDraft';
import { message } from '/imports/ui/generic/message';
import KindPicker from '/imports/ui/pages/activities/form/KindPicker';
import MapPinIcon from 'lucide-react/dist/esm/icons/map-pin';
import CrosshairIcon from 'lucide-react/dist/esm/icons/crosshair';
import BuildingIcon from 'lucide-react/dist/esm/icons/building-2';
import ChoiceChips from '/imports/ui/pages/activities/form/ChoiceChips';
import FormCard from '/imports/ui/pages/activities/form/FormCard';
import PlacePicker from '/imports/ui/pages/activities/form/PlacePicker';

import resourceFormFields from './resourceFormFields';
import BookingFields, {
  type Booking,
  bookingState,
  bookingValue,
} from './components/BookingFields';
import { RESOURCE_KINDS } from './resourceKinds';
import ManagerFields from './components/ManagerFields';
import { currentUserAtom, roleAtom } from '/imports/state';
import {
  ContactPreview,
  OWN_CONTACT,
  type OrganizerDefaults,
  type OrganizerOption,
} from '/imports/ui/pages/activities/form/OrganizerFields';
import { PersonAvatar } from '/imports/ui/pages/activities/form/PersonCard';
import PencilLineIcon from 'lucide-react/dist/esm/icons/pencil-line';

interface ResourceFormValues {
  label: string;
  description: string;
}

interface ResourceData extends ResourceFormValues {
  images?: string[];
  kinds?: string[] | null;
  category?: { key?: string } | null;
  address?: Partial<Address> | null;
  contact?: Contact | null;
  // The manager whose profile's contact details the place shows
  contactUserId?: string | null;
  locationId?: string | null;
  parentId?: string | null;
  isUnlisted?: boolean;
  managerIds?: string[];
  booking?: Booking | null;
}

interface ResourceOption {
  _id: string;
  label: string;
  parentId?: string | null;
  isUnlisted?: boolean;
}

interface ResourceFormProps {
  resource?: ResourceData;
  // The place being edited, left out of the places it can be part of
  resourceId?: string;
  // A new place started from another place's page: part of it to begin with
  defaultParentId?: string;
  // Resolves to true once saved, which throws the draft away
  onFinalize: (resource: ResourceData) => Promise<boolean | void> | void;
}

export const emptyFormValues: ResourceFormValues = {
  label: '',
  description: '',
};

// The places a place can be part of: any listed one but itself and its
// own parts, all the way down. A place left out of the list (a room) has
// no parts of its own.
function possibleParents(
  resources: ResourceOption[],
  resourceId?: string
): ResourceOption[] {
  const listed = resources.filter((r) => !r.isUnlisted);
  if (!resourceId) {
    return listed;
  }
  const below = new Set([resourceId]);
  let grew = true;
  while (grew) {
    grew = false;
    resources.forEach((r) => {
      if (r.parentId && below.has(r.parentId) && !below.has(r._id)) {
        below.add(r._id);
        grew = true;
      }
    });
  }
  return listed
    .filter((r) => !below.has(r._id))
    .sort((a, b) => a.label.localeCompare(b.label, 'sv'));
}

// How a place is given: part of another, a map point with no street, or
// a street address.
type Placement = 'address' | 'coordinates' | 'parent';
const placementOf = (resource?: ResourceData): Placement => {
  if (resource?.parentId) {
    return 'parent';
  }
  if (resource?.address?.coordinates && !resource.address.street?.trim()) {
    return 'coordinates';
  }
  return 'address';
};

const PLACEMENTS: {
  value: Placement;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}[] = [
  { value: 'address', Icon: MapPinIcon },
  { value: 'coordinates', Icon: CrosshairIcon },
  { value: 'parent', Icon: BuildingIcon },
];

// Only what the chosen way uses: a map point alone, or the street address.
const addressFor = (
  placement: Placement,
  address: Partial<Address>
): Partial<Address> =>
  placement === 'coordinates' ? { coordinates: address.coordinates } : address;

// What a draft keeps (see useFormDraft): the typed name and description,
// and everything chosen outside them. Pictures not yet uploaded are not.
const DRAFT_FIELDS = [
  'address',
  'booking',
  'contactChoice',
  'contact',
  'isUnlisted',
  'kinds',
  'locationId',
  'parentId',
  'placement',
  'managerIds',
] as const;
const TEXT_FIELDS = ['label', 'description'] as const;

// The place form keeps a draft of what is written in this browser until
// the place is saved; throwing the draft away starts the form over.
export default function ResourceForm(props: ResourceFormProps) {
  // Its own draft for each place, and for a new place inside each place
  const { key, formKey, discard } = useDraftKey(
    props.resourceId
      ? `place:${props.resourceId}`
      : props.defaultParentId
      ? `place:new:in:${props.defaultParentId}`
      : 'place:new'
  );
  return (
    <PlaceForm key={formKey} {...props} draftKey={key} onDiscard={discard} />
  );
}

function PlaceForm({
  resource,
  resourceId,
  defaultParentId,
  onFinalize,
  draftKey,
  onDiscard,
}: ResourceFormProps & { draftKey: string; onDiscard: () => void }) {
  const currentUser = useAtomValue(currentUserAtom);
  const role = useAtomValue(roleAtom);
  const [organizerOptions, setOrganizerOptions] = useState<OrganizerOption[]>(
    []
  );
  const [pristine] = useState<any>(() => ({
    kinds: kindsOf(resource),
    address: resource?.address || emptyAddress,
    // Whose contact details the place shows, as in the event form: one of
    // its managers' (their user id) or its own
    contactChoice: resource?.contactUserId || OWN_CONTACT,
    // Its own details; a place shown through a manager has none
    contact: (!resource?.contactUserId && resource?.contact) || emptyContact,
    booking: bookingState(resource?.booking),
    locationId: resource?.locationId || null,
    // An address of its own, or part of another place (and at its address)
    // (a street address, a map point, or inside another place)
    placement: defaultParentId ? 'parent' : placementOf(resource),
    parentId: resource?.parentId || defaultParentId || null,
    isUnlisted: Boolean(resource?.isUnlisted),
    // Who looks after it: an organizer adding a place does, to begin with
    managerIds:
      resource?.managerIds ||
      (!resource && role !== 'admin' && currentUser ? [currentUser._id] : []),
  }));
  // Editing: the place as saved, so a draft from before it was saved again
  // is dropped rather than undoing that
  const [base] = useState(() =>
    resource
      ? draftBase(pristine, resource, DRAFT_FIELDS, TEXT_FIELDS)
      : undefined
  );
  const draft = useLoadedDraft(draftKey, base);
  const defaultValues = {
    ...(resource || emptyFormValues),
    ...(draft?.data.values || {}),
  };
  const [state, setState] = useState<any>(() => ({
    ...pristine,
    ...(draft?.data.state || {}),
    formValues: defaultValues,
    resources: [],
  }));
  const { onValuesChange, markSaved } = useKeepDraft({
    key: draftKey,
    draft,
    state,
    pristineState: pristine,
    pristineValues: resource || emptyFormValues,
    stateFields: DRAFT_FIELDS,
    textFields: TEXT_FIELDS,
    base,
  });
  const [loaders, setLoaders] = useAtom(loaderAtom);
  const [t] = useTranslation('resources');
  const [tc] = useTranslation('common');
  // The event form's words for the same choice
  const [ta] = useTranslation('activities');

  const getResources = async () => {
    try {
      const resources = await call('getResourcesDry');
      setState((prevState) => ({
        ...prevState,
        resources,
      }));
    } catch (error: any) {
      message.error(error.reason);
    }
  };

  useEffect(() => {
    getResources();
    call<OrganizerOption[]>('getOrganizerOptions', true)
      .then((options) => setOrganizerOptions(options || []))
      .catch(() => setOrganizerOptions([]));
  }, []);

  useEffect(() => {
    if (!loaders || !loaders.isCreating) {
      return;
    }
    setLoaders((prevState) => ({
      ...prevState,
      isUploadingImages: true,
    }));
  }, [loaders?.isCreating]);

  // The managers' profiles, for choosing one of them as the contact
  const [managerProfiles, setManagerProfiles] = useState<
    Record<string, OrganizerDefaults>
  >({});
  useEffect(() => {
    (state.managerIds || [])
      .filter((id: string) => !managerProfiles[id])
      .forEach((id: string) =>
        call('getOrganizerDefaults', id)
          .then((profile) =>
            setManagerProfiles((prev) => ({
              ...prev,
              [id]: profile as OrganizerDefaults,
            }))
          )
          .catch(() => {})
      );
  }, [state.managerIds]);
  const managers: OrganizerDefaults[] = (state.managerIds || [])
    .map((id: string) => managerProfiles[id])
    .filter(Boolean);
  // A manager taken off the list falls back to the place's own details
  const isOwnContact =
    state.contactChoice === OWN_CONTACT ||
    !(state.managerIds || []).includes(state.contactChoice);
  const contactManager = managerProfiles[state.contactChoice];

  const handleSubmit = (formValues: ResourceFormValues) => {
    // A manager chosen as the contact has an email or a phone in their
    // profile (the server insists too)
    if (!isOwnContact && !isReachable(contactManager?.publicContact)) {
      message.formError(t('form.contact.managerMissing'));
      return;
    }
    // An organizer adding a place looks after it (the server insists too)
    if (
      !resource &&
      role !== 'admin' &&
      currentUser &&
      !state.managerIds?.includes(currentUser._id)
    ) {
      message.formError(t('form.managers.mustInclude'));
      return;
    }
    // A place is where something happens: no saving it without an address,
    // or the place it is part of (and so at its address).
    const isPart = state.placement === 'parent';
    if (isPart && !state.parentId) {
      message.formError(t('form.parent.required'));
      return;
    }
    if (
      !isPart &&
      !isCompleteAddress(addressFor(state.placement, state.address))
    ) {
      message.formError(tc('address.errors.required'));
      return;
    }
    // A bookable place says how: an organizer, an email or phone, or a link.
    const { booking } = state;
    if (
      booking.canBeBooked &&
      ((booking.via === 'organizer' && !booking.contactUserId) ||
        (booking.via === 'own' && !isReachable(booking.contact)) ||
        (booking.via === 'link' && !booking.url.trim()))
    ) {
      message.formError(t(`form.booking.errors.${booking.via}`));
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

  const parseResource = async (images: string[]) => {
    const isPart = state.placement === 'parent';
    const newResource: ResourceData = {
      ...state.formValues,
      address: addressFor(state.placement, state.address),
      kinds: state.kinds,
      contact: isOwnContact ? state.contact : null,
      contactUserId: isOwnContact ? null : state.contactChoice,
      booking: bookingValue(state.booking),
      images,
      locationId: state.locationId,
      parentId: isPart ? state.parentId : null,
      isUnlisted: Boolean(isPart && state.parentId && state.isUnlisted),
      managerIds: state.managerIds,
    };
    if ((await onFinalize(newResource)) === true) {
      markSaved();
    }
  };

  const handleUploadedImages = (images: string[]) => {
    setLoaders((prevState) => ({
      ...prevState,
      isSendingForm: true,
    }));

    parseResource(images);
  };

  const parentOptions = possibleParents(state.resources || [], resourceId);
  const parent =
    state.resources?.find((r: ResourceOption) => r._id === state.parentId) ||
    null;

  return (
    <>
      <DraftNotice draft={draft} onDiscard={onDiscard} />
      <GenericEntryForm
        childrenIndex={1}
        defaultValues={defaultValues}
        formFields={resourceFormFields(t)}
        onSubmit={handleSubmit}
        onValuesChange={onValuesChange}
      >
        <FormField
          area="main"
          helper={t('form.image.helper')}
          label={t('form.image.label')}
          mb="12"
        >
          <ImageUploader
            ping={loaders?.isUploadingImages}
            preExistingImages={resource ? resource.images : []}
            onUploadedImages={handleUploadedImages}
          />
        </FormField>

        {/* The details as cards in the right column, as in the event form */}
        <FormCard title={tc('resourceKinds.form.label')}>
          <p className="form-preview-note">{tc('resourceKinds.form.helper')}</p>
          <KindPicker
            kinds={RESOURCE_KINDS}
            namespace="resourceKinds"
            value={state.kinds}
            onChange={(kinds) =>
              setState((prevState: any) => ({ ...prevState, kinds }))
            }
          />
        </FormCard>

        {/* Where it is: an address of its own, a map point, or inside another
          place and so at its address. Only one. */}
        <FormCard tall title={t('form.placement.label')}>
          {/* One of three, as the chips with small icons of the event
            form's "Plats", with a line on the chosen one */}
          <ChoiceChips
            label={t('form.placement.label')}
            value={state.placement as Placement}
            choices={PLACEMENTS.map(({ value, Icon }) => ({
              value,
              label: t(`form.placement.${value}`),
              icon: <Icon aria-hidden />,
              description: t(`form.placement.details.${value}`),
            }))}
            onChange={(placement) =>
              setState((prevState: any) => ({ ...prevState, placement }))
            }
          />
          {state.placement === 'parent' ? (
            <>
              {/* The same place picker as where an event is held */}
              <PlacePicker
                places={parentOptions}
                selectedId={state.parentId}
                onPick={(place) =>
                  setState((prevState: any) => ({
                    ...prevState,
                    parentId: place._id,
                  }))
                }
              />
              {state.parentId && (
                <Box py="4">
                  <Checkbox
                    checked={state.isUnlisted}
                    id="is-unlisted"
                    onChange={(e) =>
                      setState((prevState: any) => ({
                        ...prevState,
                        isUnlisted: e.target.checked,
                      }))
                    }
                  >
                    {t('form.parent.unlisted')}
                  </Checkbox>
                  <Box pt="1">
                    <Text fontSize="sm">
                      {t('form.parent.unlistedHelper', {
                        place: parent?.label,
                      })}
                    </Text>
                  </Box>
                </Box>
              )}
            </>
          ) : (
            <>
              <AddressFields
                required
                mode={
                  state.placement === 'coordinates' ? 'coordinates' : 'street'
                }
                value={state.address}
                onChange={(address) =>
                  setState((prevState: any) => ({ ...prevState, address }))
                }
              />
              <FormField
                helper={tc('locations.form.helperResource')}
                label={tc('locations.form.label')}
                my="4"
              >
                <LocationSelect
                  value={state.locationId}
                  onChange={({ locationId }) =>
                    setState((prevState) => ({ ...prevState, locationId }))
                  }
                />
              </FormField>
            </>
          )}
        </FormCard>

        <FormCard title={t('form.managers.label')}>
          <p className="form-preview-note">{t('form.managers.helper')}</p>
          <ManagerFields
            options={organizerOptions}
            value={state.managerIds}
            onChange={(managerIds) =>
              setState((prevState: any) => ({ ...prevState, managerIds }))
            }
          />
        </FormCard>

        {/* As in the event form: one of the managers, shown with their
          profile's details, or details of the place's own. Without
          managers, only its own. */}
        <FormCard title={tc('contact.title')}>
          <p className="form-preview-note">{t('form.contact.helper')}</p>
          {managers.length === 0 ? (
            <ContactFields
              value={state.contact}
              onChange={(contact) =>
                setState((prevState: any) => ({ ...prevState, contact }))
              }
            />
          ) : (
            <ChoiceChips
              label={tc('contact.title')}
              value={isOwnContact ? OWN_CONTACT : state.contactChoice}
              choices={[
                ...managers.map((manager) => ({
                  value: manager._id,
                  label:
                    manager._id === currentUser?._id
                      ? ta('form.contact.standard')
                      : manager.firstName || manager.username,
                  icon: <PersonAvatar person={manager} size={26} />,
                  content: (
                    <ContactPreview
                      contact={manager.publicContact}
                      empty={ta('form.contact.none')}
                      person={manager}
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
                      onChange={(contact) =>
                        setState((prevState: any) => ({
                          ...prevState,
                          contact,
                        }))
                      }
                    />
                  ),
                },
              ]}
              onChange={(contactChoice) =>
                setState((prevState: any) => ({ ...prevState, contactChoice }))
              }
            />
          )}
        </FormCard>

        <FormCard title={t('form.booking.label')}>
          <BookingFields
            value={state.booking}
            onChange={(booking) =>
              setState((prevState: any) => ({ ...prevState, booking }))
            }
          />
        </FormCard>
      </GenericEntryForm>
    </>
  );
}
