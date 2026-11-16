import React, { useEffect, useState } from 'react';
import { Box, Checkbox, Text } from '/imports/ui/core';
import { useTranslation } from 'react-i18next';
import AutoCompleteSelect from 'react-select';
import makeAnimated from 'react-select/animated';
import { useAtom } from 'jotai';

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
import { isFeatureEnabled } from '/imports/api/_utils/features';
import { loaderAtom } from '/imports/ui/utils/loaderHandler';
import { message } from '/imports/ui/generic/message';
import KindPicker from '/imports/ui/pages/activities/form/KindPicker';
import ChoiceChips from '/imports/ui/pages/activities/form/ChoiceChips';

import resourceFormFields from './resourceFormFields';
import BookingFields, {
  type Booking,
  bookingState,
  bookingValue,
} from './components/BookingFields';
import { RESOURCE_KINDS } from './resourceKinds';

interface ResourceFormValues {
  label: string;
  description: string;
  isBookable?: boolean;
}

interface ResourceData extends ResourceFormValues {
  images?: string[];
  kinds?: string[] | null;
  category?: { key?: string } | null;
  address?: Partial<Address> | null;
  contact?: Contact | null;
  locationId?: string | null;
  parentId?: string | null;
  isUnlisted?: boolean;
  isCombo?: boolean;
  resourcesForCombo?: ResourceOption[];
  booking?: Booking | null;
}

interface ResourceOption {
  _id: string;
  label: string;
  isCombo?: boolean;
  parentId?: string | null;
}

interface ResourceFormProps {
  resource?: ResourceData;
  // The place being edited, left out of the places it can be part of
  resourceId?: string;
  onFinalize: (resource: ResourceData) => void;
}

export const emptyFormValues: ResourceFormValues = {
  label: '',
  description: '',
  isBookable: true,
};

const animatedComponents = makeAnimated();

// The places a place can be part of: any but itself and its own parts,
// all the way down.
function possibleParents(
  resources: ResourceOption[],
  resourceId?: string
): ResourceOption[] {
  if (!resourceId) {
    return resources;
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
  return resources
    .filter((r) => !below.has(r._id))
    .sort((a, b) => a.label.localeCompare(b.label, 'sv'));
}

export default function ResourceForm({
  resource,
  resourceId,
  onFinalize,
}: ResourceFormProps) {
  const [state, setState] = useState<any>({
    formValues: resource || emptyFormValues,
    isBookable: resource ? resource.isBookable : true,
    isCombo: resource ? resource.isCombo : false,
    kinds: kindsOf(resource),
    address: resource?.address || emptyAddress,
    contact: resource?.contact || emptyContact,
    booking: bookingState(resource?.booking),
    locationId: resource?.locationId || null,
    // An address of its own, or part of another place (and at its address)
    placement: resource?.parentId ? 'parent' : 'address',
    parentId: resource?.parentId || null,
    isUnlisted: Boolean(resource?.isUnlisted),
    resourcesForCombo: resource ? resource.resourcesForCombo : [],
    resources: [],
  });
  const [loaders, setLoaders] = useAtom(loaderAtom);
  const [t] = useTranslation('resources');
  const [tc] = useTranslation('common');

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

  const handleSubmit = (formValues: ResourceFormValues) => {
    // A place is where something happens: no saving it without an address,
    // or the place it is part of (and so at its address).
    const isPart = state.placement === 'parent';
    if (isPart && !state.parentId) {
      message.formError(t('form.parent.required'));
      return;
    }
    if (!isPart && !isCompleteAddress(state.address)) {
      message.formError(tc('address.errors.required'));
      return;
    }
    // A bookable place says how: an organizer, an email or phone, or a link.
    const { booking } = state;
    if (
      booking.isBookable &&
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
      address: state.address,
      kinds: state.kinds,
      contact: state.contact,
      booking: bookingValue(state.booking),
      images,
      isBookable: state.isBookable,
      isCombo: state.isCombo,
      locationId: state.locationId,
      parentId: isPart ? state.parentId : null,
      isUnlisted: Boolean(isPart && state.parentId && state.isUnlisted),
      resourcesForCombo: state.resourcesForCombo,
    };
    onFinalize(newResource);
  };

  const handleUploadedImages = (images: string[]) => {
    setLoaders((prevState) => ({
      ...prevState,
      isSendingForm: true,
    }));

    parseResource(images);
  };

  const handleAutoCompleteSelectChange = (newValue: ResourceOption[]) => {
    setState((prevState) => ({
      ...prevState,
      resourcesForCombo: newValue,
    }));
  };

  const parentOptions = possibleParents(state.resources || [], resourceId);
  const parent =
    state.resources?.find((r: ResourceOption) => r._id === state.parentId) ||
    null;

  const autoCompleteOptions = state.resources
    ?.filter((r: ResourceOption) => !r.isCombo)
    .map((r: ResourceOption) => ({
      _id: r._id,
      label: r.label,
    }));

  return (
    <GenericEntryForm
      childrenIndex={1}
      defaultValues={resource || emptyFormValues}
      formFields={resourceFormFields(t)}
      onSubmit={handleSubmit}
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

      <FormField
        helper={tc('resourceKinds.form.helper')}
        label={tc('resourceKinds.form.label')}
        mt="6"
        mb="12"
      >
        <KindPicker
          kinds={RESOURCE_KINDS}
          namespace="resourceKinds"
          value={state.kinds}
          onChange={(kinds) =>
            setState((prevState: any) => ({ ...prevState, kinds }))
          }
        />
      </FormField>

      {/* Where it is: an address of its own, or inside another place and
          so at its address. Not both. */}
      <FormField label={t('form.placement.label')} mt="6" mb="12" required>
        <ChoiceChips
          label={t('form.placement.label')}
          value={state.placement}
          choices={[
            {
              value: 'address',
              label: t('form.placement.address'),
              description: t('form.address.helper'),
              content: (
                <AddressFields
                  required
                  value={state.address}
                  onChange={(address) =>
                    setState((prevState: any) => ({ ...prevState, address }))
                  }
                />
              ),
            },
            {
              value: 'parent',
              label: t('form.placement.parent'),
              description: t('form.parent.helper'),
              content: (
                <>
                  <AutoCompleteSelect
                    getOptionLabel={(option: ResourceOption) => option.label}
                    getOptionValue={(option: ResourceOption) => option._id}
                    noOptionsMessage={() => t('form.parent.empty')}
                    options={parentOptions}
                    placeholder={t('form.parent.holder')}
                    value={parent}
                    onChange={(option: ResourceOption | null) =>
                      setState((prevState: any) => ({
                        ...prevState,
                        parentId: option?._id || null,
                      }))
                    }
                  />
                  {state.parentId && (
                    <Box pt="4">
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
              ),
            },
          ]}
          onChange={(placement) =>
            setState((prevState: any) => ({ ...prevState, placement }))
          }
        />
      </FormField>

      <FormField
        helper={t('form.contact.helper')}
        label={tc('contact.title')}
        mt="6"
        mb="12"
      >
        <ContactFields
          value={state.contact}
          onChange={(contact) =>
            setState((prevState: any) => ({ ...prevState, contact }))
          }
        />
      </FormField>

      <FormField label={t('form.booking.label')} mt="6" mb="12">
        <BookingFields
          value={state.booking}
          onChange={(booking) =>
            setState((prevState: any) => ({ ...prevState, booking }))
          }
        />
      </FormField>

      {state.placement === 'address' && (
        <FormField
          helper={tc('locations.form.helperResource')}
          label={tc('locations.form.label')}
          mt="6"
          mb="12"
        >
          <LocationSelect
            value={state.locationId}
            onChange={({ locationId }) =>
              setState((prevState) => ({ ...prevState, locationId }))
            }
          />
        </FormField>
      )}

      {/* Combos and the bookable flag are for booking in the calendar;
          while it is off they are kept as they are */}
      {isFeatureEnabled('bookings') && (
        <FormField
          helper={t('form.combo.switch.helper')}
          label={t('form.combo.switch.label')}
          mt="6"
          mb="12"
        >
          <Checkbox
            checked={state.isCombo}
            id="is-combo"
            size="lg"
            onChange={(e) =>
              setState((prevState) => ({
                ...prevState,
                isCombo: e.target.checked,
              }))
            }
          >
            {t('form.combo.switch.label')}
          </Checkbox>
          {state.isCombo && (
            <Box w="100%" pt="2">
              <Text fontSize="sm" mb="2">
                {t('form.combo.select.helper')}
              </Text>
              <AutoCompleteSelect
                isMulti
                closeMenuOnSelect={false}
                components={animatedComponents}
                defaultValue={state.resourcesForCombo}
                options={autoCompleteOptions}
                placeholder={t('form.combo.select.holder')}
                style={{ width: '100%', marginTop: '1rem' }}
                getOptionValue={(option) => option._id}
                onChange={handleAutoCompleteSelectChange}
              />
            </Box>
          )}
        </FormField>
      )}

      {isFeatureEnabled('bookings') && (
        <FormField
          helper={t('form.bookable.helper')}
          label={t('form.bookable.label')}
          mt="6"
          mb="12"
        >
          <Checkbox
            checked={state.isBookable}
            id="is-bookable"
            size="lg"
            onChange={(e) =>
              setState((prevState) => ({
                ...prevState,
                isBookable: e.target.checked,
              }))
            }
          >
            {t('form.bookable.label')}
          </Checkbox>
        </FormField>
      )}
    </GenericEntryForm>
  );
}
