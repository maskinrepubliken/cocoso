import React, { useEffect, useState } from 'react';
import { useLoaderData, useRevalidator } from 'react-router';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';

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
import { message } from '/imports/ui/generic/message';
import { call } from '/imports/api/_utils/shared';
import { EVENT_KIND_KEYS } from '/imports/ui/pages/activities/eventKinds';

import Boxling from './Boxling';

// Admin → Speglingar: events copied from another calendar and kept like it
// (imports/api/mirrors). One mirror is one place at the source.

interface Mirror {
  _id: string;
  name: string;
  kind: 'axiell-events';
  customerId: string;
  sourceLocation: string;
  sourceName: string;
  eventUrl: string;
  resourceId: string;
  organizerId: string;
  defaultKinds?: string[];
  isEnabled: boolean;
  activityCount: number;
  lastRun?: {
    at: Date;
    created: number;
    updated: number;
    removed: number;
    error?: string;
  };
}

type MirrorValues = Omit<Mirror, '_id' | 'activityCount' | 'lastRun'>;

interface PreviewRow {
  action: 'create' | 'update' | 'keep' | 'detached';
  title: string;
  startDate: string;
  startTime: string;
  endTime: string;
  kinds: string[];
  isCancelled: boolean;
}

interface Preview {
  created: number;
  updated: number;
  removed: number;
  preview: PreviewRow[];
}

interface Option {
  value: string;
  label: string;
}

// Knallebiblioteken, as the first mirror is set up
const knalleDefaults: MirrorValues = {
  name: 'Tranemo bibliotek (Knallebiblioteken)',
  kind: 'axiell-events',
  customerId: '64a55c618094f37d64b9e5e7',
  sourceLocation: 'Tranemo bibliotek',
  sourceName: 'Knallebiblioteken',
  eventUrl: 'https://knallebiblioteken.se/evenemang#/events/{id}',
  resourceId: '',
  organizerId: '',
  defaultKinds: ['kultur'],
  isEnabled: false,
};

interface MirrorFormProps {
  mirror: Mirror | null;
  places: Option[];
  organizers: Option[];
  onSaved: () => void;
  onCancel: () => void;
}

function MirrorForm({
  mirror,
  places,
  organizers,
  onSaved,
  onCancel,
}: MirrorFormProps) {
  const [t] = useTranslation('admin');
  const [tc] = useTranslation('common');
  const [saving, setSaving] = useState(false);
  const [sourcePlaces, setSourcePlaces] = useState<
    { name: string; count: number }[] | null
  >(null);

  const { control, handleSubmit, register, watch } = useForm<MirrorValues>({
    defaultValues: mirror
      ? {
          name: mirror.name,
          kind: mirror.kind,
          customerId: mirror.customerId,
          sourceLocation: mirror.sourceLocation,
          sourceName: mirror.sourceName,
          eventUrl: mirror.eventUrl,
          resourceId: mirror.resourceId,
          organizerId: mirror.organizerId,
          defaultKinds: mirror.defaultKinds || [],
          isEnabled: mirror.isEnabled,
        }
      : {
          ...knalleDefaults,
          resourceId:
            places.find((p) => p.label === knalleDefaults.sourceLocation)
              ?.value || '',
        },
  });

  const customerId = watch('customerId');
  const sourceLocation = watch('sourceLocation');

  // The places with events at the source, to choose from
  useEffect(() => {
    if (!customerId) {
      return;
    }
    call('getMirrorSourceLocations', customerId)
      .then((found) => setSourcePlaces(found as any))
      .catch(() => setSourcePlaces(null));
  }, [customerId]);

  const save = async (values: MirrorValues) => {
    setSaving(true);
    try {
      if (mirror) {
        await call('updateMirror', mirror._id, values);
      } else {
        await call('createMirror', values);
      }
      message.success(t('mirrors.message.saved'));
      onSaved();
    } catch (error: any) {
      message.error(error.reason || error.error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(save)}>
      <FormField label={t('mirrors.form.name.label')} required>
        <Input {...register('name', { required: true })} />
      </FormField>

      <Heading size="sm" css={{ margin: '1.5rem 0 0.5rem' }}>
        {t('mirrors.form.source')}
      </Heading>
      <FormField
        helper={t('mirrors.form.sourceName.helper')}
        label={t('mirrors.form.sourceName.label')}
        required
      >
        <Input {...register('sourceName', { required: true })} />
      </FormField>
      <FormField
        helper={t('mirrors.form.customerId.helper')}
        label={t('mirrors.form.customerId.label')}
        required
      >
        <Input {...register('customerId', { required: true })} />
      </FormField>
      <FormField
        helper={t('mirrors.form.sourceLocation.helper')}
        label={t('mirrors.form.sourceLocation.label')}
        required
      >
        {sourcePlaces ? (
          <Select {...register('sourceLocation', { required: true })}>
            {!sourcePlaces.some((p) => p.name === sourceLocation) && (
              <option value={sourceLocation}>{sourceLocation}</option>
            )}
            {sourcePlaces.map((place) => (
              <option key={place.name} value={place.name}>
                {t('mirrors.form.sourceLocation.option', {
                  name: place.name,
                  count: place.count,
                })}
              </option>
            ))}
          </Select>
        ) : (
          <Input {...register('sourceLocation', { required: true })} />
        )}
      </FormField>
      <FormField
        helper={t('mirrors.form.eventUrl.helper')}
        label={t('mirrors.form.eventUrl.label')}
        required
      >
        <Input {...register('eventUrl', { required: true })} />
      </FormField>

      <Heading size="sm" css={{ margin: '1.5rem 0 0.5rem' }}>
        {t('mirrors.form.target')}
      </Heading>
      <FormField
        helper={t('mirrors.form.resource.helper')}
        label={t('mirrors.form.resource.label')}
        required
      >
        <Select {...register('resourceId', { required: true })}>
          <option value="">{t('mirrors.form.choose')}</option>
          {places.map((place) => (
            <option key={place.value} value={place.value}>
              {place.label}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField
        helper={t('mirrors.form.organizer.helper')}
        label={t('mirrors.form.organizer.label')}
        required
      >
        <Select {...register('organizerId', { required: true })}>
          <option value="">{t('mirrors.form.choose')}</option>
          {organizers.map((organizer) => (
            <option key={organizer.value} value={organizer.value}>
              {organizer.label}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField
        helper={t('mirrors.form.kinds.helper')}
        label={t('mirrors.form.kinds.label')}
      >
        <Controller
          control={control}
          name="defaultKinds"
          render={({ field }) => (
            <Flex gap="3" wrap="wrap">
              {EVENT_KIND_KEYS.map((key) => {
                const chosen = field.value || [];
                return (
                  <Checkbox
                    key={key}
                    checked={chosen.includes(key)}
                    id={`mirror-kind-${key}`}
                    onChange={() =>
                      field.onChange(
                        chosen.includes(key)
                          ? chosen.filter((k) => k !== key)
                          : [...chosen, key]
                      )
                    }
                  >
                    {tc(`eventKinds.${key}`)}
                  </Checkbox>
                );
              })}
            </Flex>
          )}
        />
      </FormField>

      <FormField helper={t('mirrors.form.enabled.helper')}>
        <Controller
          control={control}
          name="isEnabled"
          render={({ field }) => (
            <Checkbox
              checked={field.value}
              id="mirror-enabled"
              size="lg"
              onChange={field.onChange}
            >
              {t('mirrors.form.enabled.label')}
            </Checkbox>
          )}
        />
      </FormField>

      <Flex justify="flex-end" gap="2" mt="6">
        <Button variant="ghost" type="button" onClick={onCancel}>
          {tc('actions.cancel')}
        </Button>
        <Button loading={saving} type="submit">
          {tc('actions.submit')}
        </Button>
      </Flex>
    </form>
  );
}

function PreviewTable({ preview }: { preview: Preview }) {
  const [t] = useTranslation('admin');
  const [tc] = useTranslation('common');
  return (
    <Box>
      <Text css={{ marginBottom: '0.75rem' }}>
        {t('mirrors.preview.summary', {
          created: preview.created,
          updated: preview.updated,
          removed: preview.removed,
        })}
      </Text>
      <Box css={{ maxHeight: '60vh', overflowY: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <tbody>
            {preview.preview.map((row, index) => (
              <tr
                key={index}
                style={{
                  borderBottom: '1px solid var(--cocoso-colors-theme-100)',
                }}
              >
                <td
                  style={{
                    padding: '0.35rem 0.5rem 0.35rem 0',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Badge
                    colorScheme={
                      row.action === 'create'
                        ? 'green'
                        : row.action === 'update'
                        ? 'blue'
                        : 'gray'
                    }
                    variant="subtle"
                  >
                    {t(`mirrors.preview.action.${row.action}`)}
                  </Badge>
                </td>
                <td style={{ padding: '0.35rem 0.5rem', whiteSpace: 'nowrap' }}>
                  {dayjs(row.startDate).format('D MMM')} {row.startTime}–
                  {row.endTime}
                </td>
                <td style={{ padding: '0.35rem 0.5rem' }}>
                  {row.title}
                  {row.isCancelled && (
                    <Badge
                      colorScheme="red"
                      style={{ marginLeft: '0.5rem' }}
                      variant="solid"
                    >
                      {tc('event.cancelled.tag')}
                    </Badge>
                  )}
                </td>
                <td
                  style={{
                    padding: '0.35rem 0',
                    color: 'var(--cocoso-colors-gray-600)',
                  }}
                >
                  {row.kinds.map((key) => tc(`eventKinds.${key}`)).join(', ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Box>
    </Box>
  );
}

export default function AdminMirrors() {
  const { mirrors } = useLoaderData() as { mirrors: Mirror[] | null };
  const revalidator = useRevalidator();
  const [t] = useTranslation('admin');
  const [tc] = useTranslation('common');
  const [editing, setEditing] = useState<Mirror | null | 'new'>(null);
  const [removing, setRemoving] = useState<Mirror | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [places, setPlaces] = useState<Option[]>([]);
  const [organizers, setOrganizers] = useState<Option[]>([]);

  useEffect(() => {
    call('getResourcesDry')
      .then((found: any) =>
        setPlaces(
          (found || [])
            .map((r: any) => ({ value: r._id, label: r.label }))
            .sort((a: Option, b: Option) =>
              a.label.localeCompare(b.label, 'sv')
            )
        )
      )
      .catch(() => setPlaces([]));
    call('getOrganizerOptions', true)
      .then((found: any) =>
        setOrganizers(
          (found || []).map((u: any) => ({
            value: u._id,
            label: [u.firstName, u.lastName].filter(Boolean).join(' ')
              ? `${[u.firstName, u.lastName].filter(Boolean).join(' ')} (${
                  u.username
                })`
              : u.username,
          }))
        )
      )
      .catch(() => setOrganizers([]));
  }, []);

  const labelOf = (options: Option[], value: string) =>
    options.find((o) => o.value === value)?.label || value;

  const act = async (mirror: Mirror, run: () => Promise<void>) => {
    setBusyId(mirror._id);
    try {
      await run();
    } catch (error: any) {
      message.error(error.reason || error.error);
    } finally {
      setBusyId(null);
    }
  };

  const showPreview = (mirror: Mirror) =>
    act(mirror, async () => {
      setPreview((await call('previewMirror', mirror._id)) as Preview);
    });

  const runNow = (mirror: Mirror) =>
    act(mirror, async () => {
      const result = (await call('runMirrorNow', mirror._id)) as Preview;
      message.success(
        t('mirrors.message.ran', {
          created: result.created,
          updated: result.updated,
          removed: result.removed,
        })
      );
      revalidator.revalidate();
    });

  const toggle = (mirror: Mirror) =>
    act(mirror, async () => {
      await call('setMirrorEnabled', mirror._id, !mirror.isEnabled);
      revalidator.revalidate();
    });

  const remove = async () => {
    if (!removing) return;
    try {
      await call('removeMirror', removing._id);
      message.success(t('mirrors.message.removed'));
      setRemoving(null);
      revalidator.revalidate();
    } catch (error: any) {
      message.error(error.reason || error.error);
    }
  };

  if (!mirrors) {
    return <Alert type="error">{tc('message.access.deny')}</Alert>;
  }

  return (
    <Box>
      <Box mb="4">
        <Text>{t('mirrors.info')}</Text>
      </Box>

      <Flex justify="flex-end" mb="4">
        <Button onClick={() => setEditing('new')}>{t('mirrors.new')}</Button>
      </Flex>

      <Boxling style={{ backgroundColor: 'var(--cocoso-colors-theme-50)' }}>
        {mirrors.length === 0 && (
          <Text color="gray.600">{t('mirrors.none')}</Text>
        )}
        {mirrors.map((mirror) => (
          <Box
            key={mirror._id}
            mb="3"
            p="4"
            css={{
              backgroundColor: 'white',
              boxShadow: 'var(--cocoso-box-shadow)',
              borderRadius: 'var(--cocoso-border-radius)',
            }}
          >
            <Flex align="center" gap="2" mb="1" wrap="wrap">
              <Heading size="sm">{mirror.name}</Heading>
              <Badge colorScheme={mirror.isEnabled ? 'green' : 'gray'}>
                {mirror.isEnabled ? t('mirrors.on') : t('mirrors.off')}
              </Badge>
            </Flex>
            <Text color="gray.600" fontSize="sm">
              {t('mirrors.route', {
                source: `${mirror.sourceLocation} · ${mirror.sourceName}`,
                place: labelOf(places, mirror.resourceId),
                organizer: labelOf(organizers, mirror.organizerId),
              })}
            </Text>
            <Text color="gray.600" fontSize="sm">
              {t('mirrors.count', { count: mirror.activityCount })}
              {' · '}
              {mirror.lastRun
                ? mirror.lastRun.error
                  ? t('mirrors.lastRun.failed', {
                      at: dayjs(mirror.lastRun.at).format('D MMM HH:mm'),
                      error: mirror.lastRun.error,
                    })
                  : t('mirrors.lastRun.done', {
                      at: dayjs(mirror.lastRun.at).format('D MMM HH:mm'),
                      created: mirror.lastRun.created,
                      updated: mirror.lastRun.updated,
                      removed: mirror.lastRun.removed,
                    })
                : t('mirrors.lastRun.never')}
            </Text>
            <Flex gap="1" mt="3" wrap="wrap">
              <Button
                disabled={busyId === mirror._id}
                size="sm"
                variant="outline"
                onClick={() => showPreview(mirror)}
              >
                {t('mirrors.preview.button')}
              </Button>
              <Button
                disabled={busyId === mirror._id}
                size="sm"
                onClick={() => runNow(mirror)}
              >
                {t('mirrors.runNow')}
              </Button>
              <Button
                disabled={busyId === mirror._id}
                size="sm"
                variant="ghost"
                onClick={() => toggle(mirror)}
              >
                {mirror.isEnabled ? t('mirrors.disable') : t('mirrors.enable')}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditing(mirror)}
              >
                {tc('actions.update')}
              </Button>
              <Button
                colorScheme="red"
                size="sm"
                variant="ghost"
                onClick={() => setRemoving(mirror)}
              >
                {tc('actions.remove')}
              </Button>
            </Flex>
          </Box>
        ))}
      </Boxling>

      <Modal
        hideFooter
        id="mirror-form"
        open={Boolean(editing)}
        size="2xl"
        title={editing === 'new' ? t('mirrors.new') : t('mirrors.edit')}
        onClose={() => setEditing(null)}
      >
        {editing && (
          <MirrorForm
            mirror={editing === 'new' ? null : editing}
            organizers={organizers}
            places={places}
            onCancel={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              revalidator.revalidate();
            }}
          />
        )}
      </Modal>

      <Modal
        hideFooter
        id="mirror-preview"
        open={Boolean(preview)}
        size="2xl"
        title={t('mirrors.preview.title')}
        onClose={() => setPreview(null)}
      >
        {preview && <PreviewTable preview={preview} />}
      </Modal>

      <Modal
        confirmText={tc('actions.remove')}
        id="mirror-remove"
        open={Boolean(removing)}
        title={t('mirrors.removeTitle')}
        onConfirm={remove}
        onClose={() => setRemoving(null)}
      >
        <Text>{t('mirrors.removeBody', { name: removing?.name })}</Text>
      </Modal>
    </Box>
  );
}
