import React, { useEffect, useState } from 'react';
import { useRevalidator } from 'react-router';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useAtom } from 'jotai';
import MapPinIcon from 'lucide-react/dist/esm/icons/map-pin';
import PencilIcon from 'lucide-react/dist/esm/icons/pencil-line';

import { Input, Modal } from '/imports/ui/core';
import DateTimePicker from '/imports/ui/forms/DateTimePicker';
import { call } from '/imports/api/_utils/shared';
import { message } from '/imports/ui/generic/message';
import ChoiceChips from '/imports/ui/pages/activities/form/ChoiceChips';
import FormCard from '/imports/ui/pages/activities/form/FormCard';
import PlacePicker, {
  type PlaceOption,
} from '/imports/ui/pages/activities/form/PlacePicker';
import activityErrorText from '/imports/ui/pages/activities/form/activityError';

import { groupAtom } from '../../groupAtom';

type WhereMode = 'place' | 'text';

const today = dayjs().format('YYYY-MM-DD');

// A group's new meeting: when, and where, as cards like those of the event
// form. Where is one of the site's places, picked as in the event form, or
// written out.
export default function AddMeeting({ onClose }: { onClose: () => void }) {
  const [t] = useTranslation('groups');
  const [tc] = useTranslation('common');
  const revalidator = useRevalidator();
  const [group, setGroup] = useAtom(groupAtom) as [any, (g: any) => void];
  const [places, setPlaces] = useState<PlaceOption[]>([]);
  const [when, setWhen] = useState<any>({
    startDate: today,
    endDate: today,
    startTime: '18:00',
    endTime: '20:00',
  });
  const [mode, setMode] = useState<WhereMode>('place');
  const [placeId, setPlaceId] = useState<string | null>(null);
  const [placeText, setPlaceText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    call('getResourcesDry')
      .then((found) => setPlaces((found as PlaceOption[]) || []))
      .catch((error: any) => message.error(error?.reason || error?.error));
  }, []);

  const place = places.find((p) => p._id === placeId);
  const where =
    mode === 'place'
      ? { resource: place?.label, resourceId: place?._id }
      : { resource: placeText.trim() || undefined, resourceId: null };
  const isValid = Boolean(
    where.resource && when.startDate && when.startTime && when.endTime
  );

  const createMeeting = async () => {
    if (!isValid || !group) {
      return;
    }
    setSaving(true);
    try {
      await call('createActivity', {
        title: group.title,
        subTitle: group.readingMaterial,
        longDescription: group.description,
        images: [group.imageUrl],
        ...where,
        datesAndTimes: [
          {
            startDate: when.startDate,
            endDate: when.startDate,
            startTime: when.startTime,
            endTime: when.endTime,
            attendees: [],
            capacity: group.capacity,
          },
        ],
        isPublicActivity: false,
        isRegistrationDisabled: false,
        isGroupMeeting: true,
        isGroupPrivate: group.isPrivate,
        groupId: group._id,
      });
      setGroup(await call('getGroupWithMeetings', group._id));
      revalidator.revalidate();
      message.success(tc('message.success.create'));
      onClose();
    } catch (error: any) {
      message.error(activityErrorText(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      cancelText={tc('actions.cancel')}
      confirmButtonProps={{ disabled: !isValid || saving, loading: saving }}
      confirmText={t('meeting.form.submit')}
      id="group-add-meeting"
      open
      title={t('meeting.form.label')}
      onCancel={onClose}
      onClose={onClose}
      onConfirm={createMeeting}
    >
      <div className="entry-form-side">
        <FormCard title={t('meeting.form.when')}>
          <DateTimePicker value={when} onChange={setWhen} />
        </FormCard>

        <FormCard title={t('meeting.form.where')}>
          <ChoiceChips
            label={t('meeting.form.where')}
            value={mode}
            choices={[
              {
                value: 'place',
                label: t('meeting.form.modePlace'),
                icon: <MapPinIcon aria-hidden />,
                content: (
                  <PlacePicker
                    places={places}
                    selectedId={placeId}
                    onPick={(picked) => setPlaceId(picked._id)}
                  />
                ),
              },
              {
                value: 'text',
                label: t('meeting.form.modeText'),
                icon: <PencilIcon aria-hidden />,
                description: t('meeting.form.textHelper'),
                content: (
                  <Input
                    aria-label={t('meeting.form.where')}
                    placeholder={t('meeting.form.textHolder')}
                    value={placeText}
                    onChange={(event) => setPlaceText(event.target.value)}
                  />
                ),
              },
            ]}
            onChange={setMode}
          />
        </FormCard>
      </div>
    </Modal>
  );
}
