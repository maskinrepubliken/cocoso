import React, { useEffect, useState } from 'react';
import { useLoaderData, useRevalidator } from 'react-router';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import SortableList, { SortableItem } from 'react-easy-sort';
import { arrayMoveImmutable } from 'array-move';
import { useSetAtom } from 'jotai';
import DragHandleIcon from 'lucide-react/dist/esm/icons/grip-horizontal';

import {
  Alert,
  Badge,
  Box,
  Button,
  Checkbox,
  Flex,
  Heading,
  Input,
  Modal,
  Select,
  Text,
} from '/imports/ui/core';
import FormField from '/imports/ui/forms/FormField';
import ImageUploader from '/imports/ui/forms/ImageUploader';
import Quill from '/imports/ui/forms/Quill';
import { message } from '/imports/ui/generic/message';
import { call } from '/imports/api/_utils/shared';
import { slugify } from '/imports/api/locations/reservedSlugs';
import { locationsAtom } from '/imports/state';
import type { Location } from '/imports/ui/types';

import Boxling from './Boxling';

interface LocationFormValues {
  name: string;
  slug: string;
  description: string;
  isPublished: boolean;
  landingPageId: string;
}

const emptyValues: LocationFormValues = {
  name: '',
  slug: '',
  description: '',
  isPublished: false,
  landingPageId: '',
};

interface LocationFormProps {
  location?: Location | null;
  pageOptions: { _id: string; title: string }[];
  onSaved: () => void;
  onCancel: () => void;
}

function LocationForm({
  location,
  pageOptions,
  onSaved,
  onCancel,
}: LocationFormProps) {
  const [t] = useTranslation('admin');
  const [tc] = useTranslation('common');
  const [pendingValues, setPendingValues] =
    useState<LocationFormValues | null>(null);
  const [saving, setSaving] = useState(false);

  const { control, handleSubmit, register, setValue, watch } =
    useForm<LocationFormValues>({
      defaultValues: location
        ? {
            name: location.name,
            slug: location.slug,
            description: location.description || '',
            isPublished: Boolean(location.isPublished),
            landingPageId: location.landingPageId || '',
          }
        : emptyValues,
    });

  const nameTyped = watch('name');
  const slugTyped = watch('slug');

  useEffect(() => {
    // Keep the address in step with the name until it is edited by hand.
    if (!location && (!slugTyped || slugTyped === slugify(nameTyped))) {
      setValue('slug', slugify(nameTyped));
    }
  }, [nameTyped]);

  const save = async (values: LocationFormValues, images: string[]) => {
    setSaving(true);
    const payload = {
      ...values,
      slug: slugify(values.slug || values.name),
      images,
      landingPageId: values.landingPageId || null,
    };
    try {
      if (location) {
        await call('updateLocation', location._id, payload);
      } else {
        await call('createLocation', payload);
      }
      message.success(t('locations.message.saved'));
      onSaved();
    } catch (error: any) {
      message.error(error.reason || error.error);
    } finally {
      setSaving(false);
      setPendingValues(null);
    }
  };

  return (
    <form onSubmit={handleSubmit((values) => setPendingValues(values))}>
      <FormField label={t('locations.form.name.label')} required>
        <Input {...register('name', { required: true })} />
      </FormField>

      <FormField
        helper={t('locations.form.slug.helper')}
        label={t('locations.form.slug.label')}
        required
      >
        <Input {...register('slug', { required: true })} />
        <Text color="gray.600" fontSize="xs">
          {`${window.location.origin}/${slugify(slugTyped || nameTyped)}`}
        </Text>
      </FormField>

      <FormField
        helper={t('locations.form.description.helper')}
        label={t('locations.form.description.label')}
      >
        <Controller
          control={control}
          name="description"
          render={({ field }) => <Quill {...field} />}
        />
      </FormField>

      <FormField
        helper={t('locations.form.image.helper')}
        label={t('locations.form.image.label')}
      >
        <ImageUploader
          isMultiple={false}
          ping={Boolean(pendingValues)}
          preExistingImages={location?.images || []}
          onUploadedImages={(images) =>
            pendingValues && save(pendingValues, images)
          }
        />
      </FormField>

      <FormField
        helper={t('locations.form.landingPage.helper')}
        label={t('locations.form.landingPage.label')}
      >
        <Select {...register('landingPageId')}>
          <option value="">{t('locations.form.landingPage.none')}</option>
          {pageOptions.map((page) => (
            <option key={page._id} value={page._id}>
              {page.title}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField helper={t('locations.form.published.helper')}>
        <Controller
          control={control}
          name="isPublished"
          render={({ field }) => (
            <Checkbox
              checked={field.value}
              id="location-published"
              size="lg"
              onChange={field.onChange}
            >
              {t('locations.form.published.label')}
            </Checkbox>
          )}
        />
      </FormField>

      <Flex justify="flex-end" gap="2" mt="6">
        <Button variant="ghost" type="button" onClick={onCancel}>
          {tc('actions.cancel')}
        </Button>
        <Button loading={saving || Boolean(pendingValues)} type="submit">
          {tc('actions.submit')}
        </Button>
      </Flex>
    </form>
  );
}

export default function Locations() {
  const { locations: loadedLocations } = useLoaderData() as {
    locations: Location[] | null;
  };
  const revalidator = useRevalidator();
  const setPublishedLocations = useSetAtom(locationsAtom);
  const [localLocations, setLocalLocations] = useState<Location[]>(
    loadedLocations || []
  );
  const [pageOptions, setPageOptions] = useState<
    { _id: string; title: string }[]
  >([]);
  const [editing, setEditing] = useState<Location | null | 'new'>(null);
  const [removing, setRemoving] = useState<Location | null>(null);
  const [t] = useTranslation('admin');
  const [tc] = useTranslation('common');

  useEffect(() => {
    setLocalLocations(loadedLocations || []);
  }, [loadedLocations]);

  useEffect(() => {
    call('getComposablePageTitles')
      .then((pages) => setPageOptions(pages || []))
      .catch(() => setPageOptions([]));
  }, []);

  const refresh = async () => {
    revalidator.revalidate();
    try {
      setPublishedLocations(await call('getLocations'));
    } catch {
      // the public list will refresh on next load
    }
  };

  const onSortEnd = async (oldIndex: number, newIndex: number) => {
    const reordered = arrayMoveImmutable(localLocations, oldIndex, newIndex);
    setLocalLocations(reordered);
    try {
      await call(
        'reorderLocations',
        reordered.map((l) => l._id)
      );
      refresh();
    } catch (error: any) {
      message.error(error.reason || error.error);
    }
  };

  const togglePublished = async (location: Location) => {
    try {
      await call('setLocationPublished', location._id, !location.isPublished);
      refresh();
    } catch (error: any) {
      message.error(error.reason || error.error);
    }
  };

  const remove = async () => {
    if (!removing) return;
    try {
      await call('removeLocation', removing._id);
      message.success(t('locations.message.removed'));
      setRemoving(null);
      refresh();
    } catch (error: any) {
      message.error(error.reason || error.error);
    }
  };

  if (!loadedLocations) {
    return <Alert type="error">{tc('message.access.deny')}</Alert>;
  }

  return (
    <Box>
      <Box mb="4">
        <Text>{t('locations.info')}</Text>
      </Box>

      <Flex justify="flex-end" mb="4">
        <Button onClick={() => setEditing('new')}>{t('locations.new')}</Button>
      </Flex>

      <Boxling
        style={{ backgroundColor: 'var(--cocoso-colors-theme-50)' }}
      >
        {localLocations.length === 0 && (
          <Text color="gray.600">{t('locations.none')}</Text>
        )}
        <SortableList onSortEnd={onSortEnd}>
          {localLocations.map((location) => (
            <SortableItem key={location._id}>
              <div>
                <Flex
                  align="center"
                  justify="space-between"
                  mb="3"
                  p="3"
                  css={{
                    backgroundColor: 'white',
                    boxShadow: 'var(--cocoso-box-shadow)',
                    borderRadius: 'var(--cocoso-border-radius)',
                    cursor: 'move',
                  }}
                >
                  <Flex align="center" gap="2">
                    <DragHandleIcon />
                    <Box>
                      <Heading size="sm">{location.name}</Heading>
                      <Text color="gray.600" fontSize="xs">
                        /{location.slug}
                      </Text>
                    </Box>
                    <Badge
                      colorScheme={location.isPublished ? 'green' : 'gray'}
                    >
                      {location.isPublished
                        ? t('locations.published')
                        : t('locations.draft')}
                    </Badge>
                  </Flex>
                  <Flex gap="1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => togglePublished(location)}
                    >
                      {location.isPublished
                        ? t('locations.unpublish')
                        : t('locations.publish')}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditing(location)}
                    >
                      {tc('actions.update')}
                    </Button>
                    <Button
                      colorScheme="red"
                      size="sm"
                      variant="ghost"
                      onClick={() => setRemoving(location)}
                    >
                      {tc('actions.remove')}
                    </Button>
                  </Flex>
                </Flex>
              </div>
            </SortableItem>
          ))}
        </SortableList>
      </Boxling>

      <Modal
        hideFooter
        id="location-form"
        open={Boolean(editing)}
        size="2xl"
        title={editing === 'new' ? t('locations.new') : t('locations.edit')}
        onClose={() => setEditing(null)}
      >
        {editing && (
          <LocationForm
            location={editing === 'new' ? null : editing}
            pageOptions={pageOptions}
            onSaved={() => {
              setEditing(null);
              refresh();
            }}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>

      <Modal
        confirmText={tc('actions.remove')}
        id="location-remove"
        open={Boolean(removing)}
        title={t('locations.removeTitle')}
        onConfirm={remove}
        onClose={() => setRemoving(null)}
      >
        <Text>{t('locations.removeBody', { name: removing?.name })}</Text>
      </Modal>
    </Box>
  );
}
