import React, { useEffect, useState } from 'react';
import { useRevalidator, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';

import { Modal, Tabs } from '/imports/ui/core';
import FormField from '/imports/ui/forms/FormField';
import ContactFields, { emptyContact } from '/imports/ui/forms/ContactFields';
import Quill from '/imports/ui/forms/Quill';
import ToggleSwitch from '/imports/ui/pages/activities/form/ToggleSwitch';
import { message } from '/imports/ui/generic/message';
import { call } from '/imports/api/_utils/shared';
import type { Contact } from '/imports/api/_utils/contact';
import type { Opening } from '/imports/ui/pages/businesses/hours';
import {
  OFFERING_KINDS,
  type OfferingKind,
} from '/imports/api/offerings/offeringKinds';

import OpeningHoursFields from './OpeningHoursFields';

export interface Offering {
  _id?: string;
  kind: OfferingKind;
  description?: string;
  contact?: Contact | null;
  openingHours?: Opening[];
  hoursNote?: string;
  isExample?: boolean;
}

// One tab's state: whether the place offers it, and what is written
interface Draft {
  on: boolean;
  description: string;
  contact: Contact;
  withHours: boolean;
  openingHours: Opening[];
  hoursNote: string;
}

const draftOf = (offering?: Offering): Draft => ({
  on: Boolean(offering),
  description: offering?.description || '',
  contact: { ...emptyContact, ...(offering?.contact || {}) },
  withHours: Boolean(offering?.openingHours?.length || offering?.hoursNote),
  openingHours: offering?.openingHours || [],
  hoursNote: offering?.hoursNote || '',
});

const draftsOf = (offerings: Offering[] = []) =>
  Object.fromEntries(
    OFFERING_KINDS.map((kind) => [
      kind,
      draftOf(offerings.find((o) => o.kind === kind)),
    ])
  ) as Record<OfferingKind, Draft>;

interface OfferingsEditorProps {
  place: { _id: string; label: string; offerings?: Offering[] };
}

// What a place offers, from the gear's "Äta, handla & bo": a tab for each
// kind (Mat & fika, Boende, Tjänster, Försäljning). In each, a switch says
// whether the place offers it, and then what it is, how to reach it and,
// if they like, its opening hours. A place offering anything is listed
// under Äta, handla & bo instead of Platser. Opened by ?offerings=true.
export default function OfferingsEditor({ place }: OfferingsEditorProps) {
  const [tc] = useTranslation('common');
  const [searchParams, setSearchParams] = useSearchParams();
  const { revalidate } = useRevalidator();
  const open = searchParams.get('offerings') === 'true';
  const [tab, setTab] = useState(0);
  const [drafts, setDrafts] = useState(() => draftsOf(place.offerings));
  const [saving, setSaving] = useState(false);

  // Each time it opens, from what is saved
  useEffect(() => {
    if (open) {
      setDrafts(draftsOf(place.offerings));
    }
  }, [open, place._id]);

  const kind = OFFERING_KINDS[tab];
  const draft = drafts[kind];
  const set = (patch: Partial<Draft>) =>
    setDrafts((prev) => ({ ...prev, [kind]: { ...prev[kind], ...patch } }));

  const close = () =>
    setSearchParams(
      (params) => {
        const next = new URLSearchParams(params);
        next.delete('offerings');
        return next;
      },
      { preventScrollReset: true }
    );

  const save = async () => {
    setSaving(true);
    try {
      await call(
        'savePlaceOfferings',
        place._id,
        OFFERING_KINDS.filter((k) => drafts[k].on).map((k) => ({
          kind: k,
          description: drafts[k].description,
          contact: drafts[k].contact,
          openingHours: drafts[k].withHours ? drafts[k].openingHours : [],
          hoursNote: drafts[k].withHours ? drafts[k].hoursNote : '',
        }))
      );
      message.success(tc('offerings.form.saved'));
      // Closing changes the URL, which would cancel a reload still running
      await revalidate();
      close();
    } catch (error: any) {
      message.error(error.reason || error.error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      confirmButtonProps={{ loading: saving }}
      confirmText={tc('actions.save')}
      id="offerings-editor"
      open={open}
      size="2xl"
      title={tc('offerings.form.title', { place: place.label })}
      onClose={close}
      onConfirm={save}
    >
      <p className="form-preview-note">{tc('offerings.form.helper')}</p>
      <Tabs
        index={tab}
        tabs={OFFERING_KINDS.map((k, i) => ({
          key: k,
          // A tick on the kinds the place offers
          title: `${tc(`offerings.kinds.${k}`)}${drafts[k].on ? ' ✓' : ''}`,
          onClick: () => setTab(i),
        }))}
      />
      <div className="offering-tab">
        <ToggleSwitch
          checked={draft.on}
          helper={tc('offerings.form.switchHelper')}
          label={tc(`offerings.form.switch.${kind}`)}
          onChange={(on) => set({ on })}
        />
        {draft.on && (
          <>
            <FormField
              helper={tc('offerings.form.descriptionHelper')}
              label={tc('offerings.form.description')}
              mt="6"
            >
              <Quill
                value={draft.description}
                onChange={(description) => set({ description })}
              />
            </FormField>
            <FormField
              helper={tc('offerings.form.contactHelper')}
              label={tc('offerings.form.contact')}
              mt="6"
            >
              <ContactFields
                value={draft.contact}
                onChange={(contact) => set({ contact })}
              />
            </FormField>
            <div style={{ marginTop: '1.5rem' }}>
              <ToggleSwitch
                checked={draft.withHours}
                helper={tc('offerings.form.hoursHelper')}
                label={tc('offerings.form.hours')}
                onChange={(withHours) => set({ withHours })}
              />
              {draft.withHours && (
                <OpeningHoursFields
                  note={draft.hoursNote}
                  value={draft.openingHours}
                  onChange={(openingHours) => set({ openingHours })}
                  onNoteChange={(hoursNote) => set({ hoursNote })}
                />
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
