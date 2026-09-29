import React, { useState } from 'react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';

import { styled } from '/stitches.config';
import { Button, Checkbox, Input } from '/imports/ui/core';
import { call } from '/imports/api/_utils/shared';
import { currentUserAtom } from '/imports/state';
import { message } from '/imports/ui/generic/message';

import Section, { Muted } from './Section';
import { Occurrence, countPeople, isPastOccurrence } from './occurrences';

const Fields = styled('div', {
  display: 'grid',
  gap: '0.5rem',
  gridTemplateColumns: '1fr',
  '@media (min-width: 560px)': { gridTemplateColumns: '1fr 1fr' },
});

const Field = styled('label', {
  display: 'flex',
  flexDirection: 'column',
  fontSize: '0.8rem',
  fontWeight: 600,
  gap: '0.25rem',
  variants: { wide: { true: { gridColumn: '1 / -1' } } },
});

const Actions = styled('div', {
  alignItems: 'center',
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.75rem',
  justifyContent: 'space-between',
  marginTop: '0.875rem',
});

const ChangeBox = styled('div', {
  borderTop: '1px solid var(--cocoso-colors-theme-100)',
  marginTop: '1.25rem',
  paddingTop: '1rem',
});

const LinkButton = styled('button', {
  background: 'none',
  border: 'none',
  color: 'var(--cocoso-colors-theme-700)',
  cursor: 'pointer',
  fontSize: '0.875rem',
  padding: 0,
  textDecoration: 'underline',
});

const Status = styled('p', {
  backgroundColor: 'var(--cocoso-colors-theme-50)',
  borderRadius: 'var(--cocoso-border-radius)',
  fontWeight: 600,
  margin: 0,
  padding: '0.75rem 1rem',
});

interface FormValues {
  firstName: string;
  lastName: string;
  email: string;
  isNameHidden: boolean;
}

const emptyForm: FormValues = {
  firstName: '',
  lastName: '',
  email: '',
  isNameHidden: false,
};

const trimmed = (v: FormValues) => ({
  firstName: v.firstName.trim(),
  lastName: v.lastName.trim(),
  email: v.email.trim(),
  isNameHidden: v.isNameHidden,
});

interface AttendeeFieldsProps {
  idPrefix: string;
  values: FormValues;
  onChange: (values: FormValues) => void;
}

function AttendeeFields({ idPrefix, values, onChange }: AttendeeFieldsProps) {
  const [tc] = useTranslation('common');
  const set =
    (name: keyof FormValues) => (e: React.ChangeEvent<HTMLInputElement>) =>
      onChange({ ...values, [name]: e.target.value });

  return (
    <>
      <Fields>
        <Field>
          {tc('event.register.firstName')}
          <Input
            autoComplete="given-name"
            required
            value={values.firstName}
            onChange={set('firstName')}
          />
        </Field>
        <Field>
          {tc('event.register.lastName')}
          <Input
            autoComplete="family-name"
            required
            value={values.lastName}
            onChange={set('lastName')}
          />
        </Field>
        <Field wide>
          {tc('event.register.email')}
          <Input
            autoComplete="email"
            required
            type="email"
            value={values.email}
            onChange={set('email')}
          />
        </Field>
      </Fields>
      <div style={{ marginTop: '0.75rem' }}>
        <Checkbox
          checked={values.isNameHidden}
          id={`${idPrefix}-hide-name`}
          size="sm"
          onChange={(e) =>
            onChange({ ...values, isNameHidden: e.target.checked })
          }
        >
          {tc('event.register.hideName')}
        </Checkbox>
      </div>
    </>
  );
}

interface RegistrationSectionProps {
  activity: {
    _id: string;
    capacity?: number;
    isRegistrationDisabled?: boolean;
  };
  occurrence: Occurrence;
  occurrenceIndex: number;
  onChanged: () => void;
}

// Signing up for the selected date, and changing or cancelling a sign-up
// with the last name and email it was made with.
export default function RegistrationSection({
  activity,
  occurrence,
  occurrenceIndex,
  onChanged,
}: RegistrationSectionProps) {
  const [tc] = useTranslation('common');
  // Profile names live on the user document itself, not under `profile`.
  const currentUser = useAtomValue(currentUserAtom) as any;
  const [form, setForm] = useState<FormValues>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [changeOpen, setChangeOpen] = useState(false);
  const [lookup, setLookup] = useState({ lastName: '', email: '' });
  const [found, setFound] = useState<
    (FormValues & { attendeeIndex: number; current: any }) | null
  >(null);

  const taken = countPeople(occurrence.attendees);
  const capacity = activity.capacity || 0;
  const left = capacity ? Math.max(capacity - taken, 0) : null;
  const isPast = isPastOccurrence(occurrence);
  const isFull = left === 0;
  const dateLabel = dayjs(occurrence.startDate).format('D MMMM');

  const fillFromUser = () => {
    if (currentUser && !form.email) {
      setForm({
        firstName: currentUser.firstName || '',
        lastName: currentUser.lastName || '',
        email: currentUser.emails?.[0]?.address || '',
        isNameHidden: false,
      });
    }
  };

  const showError = (error: any, fallbackKey?: string) => {
    if (error?.error === 'already-registered') {
      message.error(tc('event.register.already'));
    } else if (error?.error === 'capacity-full') {
      message.error(tc('event.register.full'));
    } else if (fallbackKey) {
      message.error(tc(fallbackKey));
    } else {
      message.error(error?.reason || error?.message);
    }
  };

  const register = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await call(
        'registerAttendance',
        activity._id,
        { ...trimmed(form), numberOfPeople: 1 },
        occurrenceIndex
      );
      setForm(emptyForm);
      message.success(tc('event.register.done'));
      onChanged();
    } catch (error) {
      showError(error);
    } finally {
      setSubmitting(false);
    }
  };

  const findRegistration = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const result: any = await call(
        'findAttendance',
        activity._id,
        occurrenceIndex,
        lookup.email.trim(),
        lookup.lastName.trim()
      );
      setFound({
        attendeeIndex: result.attendeeIndex,
        firstName: result.firstName || '',
        lastName: result.lastName || '',
        email: result.email || '',
        isNameHidden: Boolean(result.isNameHidden),
        current: { email: result.email, lastName: result.lastName },
      });
    } catch (error) {
      showError(error, 'event.change.notFound');
    }
  };

  const saveChanges = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!found) return;
    try {
      await call(
        'updateAttendance',
        activity._id,
        { ...trimmed(found), numberOfPeople: 1 },
        occurrenceIndex,
        found.attendeeIndex,
        found.current
      );
      message.success(tc('event.change.updated'));
      setFound(null);
      setChangeOpen(false);
      onChanged();
    } catch (error) {
      showError(error);
    }
  };

  const cancelRegistration = async () => {
    if (!found) return;
    try {
      await call(
        'removeAttendance',
        activity._id,
        occurrenceIndex,
        found.current.email,
        found.current.lastName
      );
      message.success(tc('event.change.removed'));
      setFound(null);
      setChangeOpen(false);
      onChanged();
    } catch (error) {
      showError(error);
    }
  };

  const canSignUp = !activity.isRegistrationDisabled && !isPast && !isFull;

  return (
    <Section
      aside={
        left !== null && !isPast
          ? tc('event.attendees.left', { count: left, capacity })
          : null
      }
      id="anmalan"
      order={2}
      title={tc('event.sections.register')}
    >
      {activity.isRegistrationDisabled ? (
        <Status>{tc('event.register.closed')}</Status>
      ) : isPast ? (
        <Status>{tc('event.register.past')}</Status>
      ) : isFull ? (
        <Status>{tc('event.register.full')}</Status>
      ) : (
        <form onFocus={fillFromUser} onSubmit={register}>
          <Muted css={{ marginBottom: '0.75rem' }}>
            {tc('event.register.forDate', { date: dateLabel })}
          </Muted>
          <AttendeeFields
            idPrefix="register"
            values={form}
            onChange={setForm}
          />
          <Actions>
            <Muted>{tc('event.register.emailPrivate')}</Muted>
            <Button loading={submitting} type="submit">
              {tc('event.register.submit')}
            </Button>
          </Actions>
        </form>
      )}

      {!isPast && (
        <ChangeBox css={canSignUp ? undefined : { borderTop: 'none' }}>
          <LinkButton
            aria-expanded={changeOpen}
            type="button"
            onClick={() => {
              setChangeOpen(!changeOpen);
              setFound(null);
            }}
          >
            {tc('event.change.toggle')}
          </LinkButton>

          {changeOpen && !found && (
            <form style={{ marginTop: '0.875rem' }} onSubmit={findRegistration}>
              <Muted css={{ marginBottom: '0.75rem' }}>
                {tc('event.change.intro')}
              </Muted>
              <Fields>
                <Field>
                  {tc('event.register.lastName')}
                  <Input
                    required
                    value={lookup.lastName}
                    onChange={(e) =>
                      setLookup({ ...lookup, lastName: e.target.value })
                    }
                  />
                </Field>
                <Field>
                  {tc('event.register.email')}
                  <Input
                    required
                    type="email"
                    value={lookup.email}
                    onChange={(e) =>
                      setLookup({ ...lookup, email: e.target.value })
                    }
                  />
                </Field>
              </Fields>
              <Actions css={{ justifyContent: 'flex-end' }}>
                <Button type="submit" variant="outline">
                  {tc('event.change.find')}
                </Button>
              </Actions>
            </form>
          )}

          {changeOpen && found && (
            <form style={{ marginTop: '0.875rem' }} onSubmit={saveChanges}>
              <AttendeeFields
                idPrefix="change"
                values={found}
                onChange={(values) => setFound({ ...found, ...values })}
              />
              <Actions>
                <Button
                  colorScheme="red"
                  type="button"
                  variant="ghost"
                  onClick={cancelRegistration}
                >
                  {tc('event.change.cancel')}
                </Button>
                <Button type="submit">{tc('event.change.save')}</Button>
              </Actions>
            </form>
          )}
        </ChangeBox>
      )}
    </Section>
  );
}
