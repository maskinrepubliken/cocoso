import React, { useEffect, useState } from 'react';
import { useRevalidator } from 'react-router';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useAtom } from 'jotai';
import MapPinIcon from 'lucide-react/dist/esm/icons/map-pin';
import HouseIcon from 'lucide-react/dist/esm/icons/house';
import PencilIcon from 'lucide-react/dist/esm/icons/pencil-line';

import { Input, Modal } from '/imports/ui/core';
import DateTimePicker from '/imports/ui/forms/DateTimePicker';
import AddressFields, { emptyAddress } from '/imports/ui/forms/AddressFields';
import { formatAddress, type Address } from '/imports/api/_utils/address';
import { call } from '/imports/api/_utils/shared';
import { message } from '/imports/ui/generic/message';
import ChoiceChips from '/imports/ui/pages/activities/form/ChoiceChips';
import { styled } from '/stitches.config';
import PlacePicker, {
  type PlaceOption,
} from '/imports/ui/pages/activities/form/PlacePicker';
import activityErrorText from '/imports/ui/pages/activities/form/activityError';

import { groupAtom } from '../../groupAtom';

type WhereMode = 'place' | 'address' | 'text';

const today = dayjs().format('YYYY-MM-DD');

const Sections = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  gap: '1.5rem',
});

const SectionTitle = styled('h3', {
  fontFamily: 'var(--cocoso-font-display)',
  fontSize: '1.1rem',
  fontWeight: 600,
  margin: '0 0 0.6rem',
});

// A part of the dialog under a small heading; the dialog is the card, so
// no card of its own
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <SectionTitle>{title}</SectionTitle>
      {children}
    </section>
  );
}

// A group's new meeting: its name, when, and where. Where is one of the
// site's places, picked as in the event form, an address, or written out.
export default function AddMeeting({ onClose }: { onClose: () => void }) {
  const [t] = useTranslation('groups');
  const [tc] = useTranslation('common');
  const revalidator = useRevalidator();
  const [group, setGroup] = useAtom(groupAtom) as [any, (g: any) => void];
  const [places, setPlaces] = useState<PlaceOption[]>([]);
  const [title, setTitle] = useState('');
  const [when, setWhen] = useState<any>({
    startDate: today,
    endDate: today,
    startTime: '18:00',
    // Left out, it ends an hour after it starts
    endTime: '',
  });
  const [mode, setMode] = useState<WhereMode>('place');
  const [placeId, setPlaceId] = useState<string | null>(null);
  const [address, setAddress] = useState<Partial<Address>>(emptyAddress);
  const [placeText, setPlaceText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    call('getResourcesDry')
      .then((found) => setPlaces((found as PlaceOption[]) || []))
      .catch((error: any) => message.error(error?.reason || error?.error));
  }, []);

  // As an event keeps it: a place of the site by its id, else an address
  // of its own, else a place written out (activity.place.js)
  const place = places.find((p) => p._id === placeId);
  const where =
    mode === 'place'
      ? place && { resource: place.label, resourceId: place._id }
      : mode === 'address'
      ? formatAddress(address) && { address: address as Address }
      : placeText.trim() && { place: placeText.trim() };
  const endTime =
    when.endTime ||
    dayjs(`2000-01-01 ${when.startTime}`).add(1, 'hour').format('HH:mm');
  const isValid = Boolean(
    title.trim() && where && when.startDate && when.startTime
  );

  const createMeeting = async () => {
    if (!isValid || !group) {
      return;
    }
    setSaving(true);
    try {
      await call('createActivity', {
        // The server titles it after the group, with this name after it
        title: group.title,
        meetingTitle: title.trim(),
        subTitle: group.readingMaterial,
        longDescription: group.description,
        images: [group.imageUrl],
        ...where,
        datesAndTimes: [
          {
            startDate: when.startDate,
            endDate: when.startDate,
            startTime: when.startTime,
            endTime,
            attendees: [],
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
      size="lg"
      title={t('meeting.form.label')}
      onCancel={onClose}
      onClose={onClose}
      onConfirm={createMeeting}
    >
      <Sections>
        <Section title={t('meeting.form.name')}>
          <Input
            aria-label={t('meeting.form.name')}
            placeholder={t('meeting.form.nameHolder')}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </Section>

        <Section title={t('meeting.form.when')}>
          <DateTimePicker
            endOptional
            endLabel={t('meeting.form.endOptional')}
            value={when}
            onChange={setWhen}
          />
        </Section>

        <Section title={t('meeting.form.where')}>
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
                value: 'address',
                label: t('meeting.form.modeAddress'),
                icon: <HouseIcon aria-hidden />,
                content: (
                  <AddressFields value={address} onChange={setAddress} />
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
        </Section>
      </Sections>
    </Modal>
  );
}
