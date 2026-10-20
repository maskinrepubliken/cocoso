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
import { Contact } from '/imports/api/_utils/contact';
import { call } from '/imports/api/_utils/shared';
import { kindsOf } from '/imports/api/_utils/kinds';
import { loaderAtom } from '/imports/ui/utils/loaderHandler';
import { message } from '/imports/ui/generic/message';
import KindPicker from '/imports/ui/pages/activities/form/KindPicker';

import resourceFormFields from './resourceFormFields';
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
  isCombo?: boolean;
  resourcesForCombo?: ResourceOption[];
}

interface ResourceOption {
  _id: string;
  label: string;
  isCombo?: boolean;
}

interface ResourceFormProps {
  resource?: ResourceData;
  onFinalize: (resource: ResourceData) => void;
}

export const emptyFormValues: ResourceFormValues = {
  label: '',
  description: '',
  isBookable: true,
};

const animatedComponents = makeAnimated();

export default function ResourceForm({ resource, onFinalize }: ResourceFormProps) {
  const [state, setState] = useState<any>({
    formValues: resource || emptyFormValues,
    isBookable: resource ? resource.isBookable : true,
    isCombo: resource ? resource.isCombo : false,
    kinds: kindsOf(resource),
    address: resource?.address || emptyAddress,
    contact: resource?.contact || emptyContact,
    locationId: resource?.locationId || null,
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
    // A place is where something happens: no saving it without an address.
    if (!isCompleteAddress(state.address)) {
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

  const parseResource = async (images: string[]) => {
    const newResource: ResourceData = {
      ...state.formValues,
      address: state.address,
      kinds: state.kinds,
      contact: state.contact,
      images,
      isBookable: state.isBookable,
      isCombo: state.isCombo,
      locationId: state.locationId,
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

      <FormField
        helper={t('form.address.helper')}
        label={tc('address.title')}
        mt="6"
        mb="12"
        required
      >
        <AddressFields
          required
          value={state.address}
          onChange={(address) =>
            setState((prevState: any) => ({ ...prevState, address }))
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
    </GenericEntryForm>
  );
}
