import React, { useEffect, useState } from 'react';
import { useRevalidator, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import PlusIcon from 'lucide-react/dist/esm/icons/plus';
import XIcon from 'lucide-react/dist/esm/icons/x';

import { Input, Modal } from '/imports/ui/core';
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
  title?: string;
  description?: string;
  contact?: Contact | null;
  // Absent: the place's hours
  openingHours?: Opening[] | null;
  hoursNote?: string;
}

interface Commerce {
  tagline?: string;
  contact?: Contact | null;
  openingHours?: Opening[];
  hoursNote?: string;
}

// The place's part of the form
interface GeneralDraft {
  isCommercial: boolean;
  tagline: string;
  contact: Contact;
  withHours: boolean;
  openingHours: Opening[];
  hoursNote: string;
}

// One offering's part; `key` tells new ones apart before they have an _id
interface OfferingDraft {
  key: string;
  _id?: string;
  kind: OfferingKind;
  title: string;
  description: string;
  contact: Contact;
  ownHours: boolean;
  openingHours: Opening[];
  hoursNote: string;
}

let newKeys = 0;
const newKey = () => `new-${(newKeys += 1)}`;

const generalOf = (
  isCommercial?: boolean,
  commerce?: Commerce | null
): GeneralDraft => ({
  isCommercial: Boolean(isCommercial),
  tagline: commerce?.tagline || '',
  contact: { ...emptyContact, ...(commerce?.contact || {}) },
  withHours: Boolean(commerce?.openingHours?.length || commerce?.hoursNote),
  openingHours: commerce?.openingHours || [],
  hoursNote: commerce?.hoursNote || '',
});

const draftOf = (offering: Offering): OfferingDraft => ({
  key: offering._id || newKey(),
  _id: offering._id,
  kind: offering.kind,
  title: offering.title || '',
  description: offering.description || '',
  contact: { ...emptyContact, ...(offering.contact || {}) },
  ownHours: Array.isArray(offering.openingHours),
  openingHours: offering.openingHours || [],
  hoursNote: offering.hoursNote || '',
});

interface OfferingsEditorProps {
  place: {
    _id: string;
    label: string;
    isCommercial?: boolean;
    commerce?: Commerce | null;
    offerings?: Offering[];
  };
}

// A place's Äta, handla & bo, from the gear: on the right a list with the
// place itself first and then its offerings, to add to and take from; on
// the left what is chosen there. The place's part says whether it is a
// commercial place, and holds its tagline and the contact and opening
// hours its offerings use unless they have their own. An offering is a
// kind (Mat & fika, Boende, Tjänster, Försäljning), and a place can have
// several of a kind. Opened by ?offerings=true.
export default function OfferingsEditor({ place }: OfferingsEditorProps) {
  const [tc] = useTranslation('common');
  const [searchParams, setSearchParams] = useSearchParams();
  const { revalidate } = useRevalidator();
  const open = searchParams.get('offerings') === 'true';
  const [general, setGeneral] = useState(() =>
    generalOf(place.isCommercial, place.commerce)
  );
  const [offerings, setOfferings] = useState<OfferingDraft[]>(() =>
    (place.offerings || []).map(draftOf)
  );
  // 'general' or an offering's key
  const [selected, setSelected] = useState('general');
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);

  // Each time it opens, from what is saved
  useEffect(() => {
    if (open) {
      setGeneral(generalOf(place.isCommercial, place.commerce));
      setOfferings((place.offerings || []).map(draftOf));
      setSelected('general');
      setPicking(false);
    }
  }, [open, place._id]);

  const current = offerings.find((o) => o.key === selected);
  const setGen = (patch: Partial<GeneralDraft>) =>
    setGeneral((prev) => ({ ...prev, ...patch }));
  const setOffering = (patch: Partial<OfferingDraft>) =>
    setOfferings((prev) =>
      prev.map((o) => (o.key === selected ? { ...o, ...patch } : o))
    );

  const add = (kind: OfferingKind) => {
    const draft = draftOf({ kind });
    setOfferings((prev) => [...prev, draft]);
    setSelected(draft.key);
    setPicking(false);
  };

  const remove = (key: string) => {
    setOfferings((prev) => prev.filter((o) => o.key !== key));
    if (selected === key) {
      setSelected('general');
    }
  };

  const nameOf = (offering: OfferingDraft) =>
    offering.title.trim() || tc(`offerings.kinds.${offering.kind}`);

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
        'savePlaceCommerce',
        place._id,
        {
          isCommercial: general.isCommercial,
          tagline: general.tagline,
          contact: general.contact,
          openingHours: general.withHours ? general.openingHours : [],
          hoursNote: general.withHours ? general.hoursNote : '',
        },
        general.isCommercial
          ? offerings.map((o) => ({
              ...(o._id ? { _id: o._id } : {}),
              kind: o.kind,
              title: o.title,
              description: o.description,
              contact: o.contact,
              openingHours: o.ownHours ? o.openingHours : null,
              hoursNote: o.ownHours ? o.hoursNote : '',
            }))
          : []
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
      size="3xl"
      title={tc('offerings.form.title', { place: place.label })}
      onClose={close}
      onConfirm={save}
    >
      <div className="commerce-editor">
        <nav
          className="commerce-list"
          aria-label={tc('offerings.form.offeringsTitle')}
        >
          <button
            type="button"
            className={`commerce-item ${
              selected === 'general' ? 'is-selected' : ''
            }`}
            onClick={() => setSelected('general')}
          >
            <strong>{tc('offerings.form.general')}</strong>
          </button>
          {general.isCommercial && (
            <>
              <p className="commerce-list-title">
                {tc('offerings.form.offeringsTitle')}
              </p>
              {offerings.length === 0 && (
                <p className="commerce-list-empty">
                  {tc('offerings.form.none')}
                </p>
              )}
              {offerings.map((offering) => (
                <div
                  key={offering.key}
                  className={`commerce-item ${
                    selected === offering.key ? 'is-selected' : ''
                  }`}
                >
                  <button
                    type="button"
                    className="commerce-item-select"
                    onClick={() => setSelected(offering.key)}
                  >
                    <strong>{nameOf(offering)}</strong>
                    {offering.title.trim() && (
                      <span>{tc(`offerings.kinds.${offering.kind}`)}</span>
                    )}
                  </button>
                  <button
                    type="button"
                    className="person-card-remove"
                    aria-label={tc('offerings.form.remove')}
                    title={tc('offerings.form.remove')}
                    onClick={() => remove(offering.key)}
                  >
                    <XIcon aria-hidden width={14} height={14} />
                  </button>
                </div>
              ))}
              {picking ? (
                <div className="commerce-kinds">
                  <span>{tc('offerings.form.addKind')}</span>
                  {OFFERING_KINDS.map((kind) => (
                    <button
                      key={kind}
                      type="button"
                      className="person-add-small"
                      onClick={() => add(kind)}
                    >
                      {tc(`offerings.kinds.${kind}`)}
                    </button>
                  ))}
                </div>
              ) : (
                <button
                  type="button"
                  className="person-add-small commerce-add"
                  onClick={() => setPicking(true)}
                >
                  <PlusIcon aria-hidden width={14} height={14} />
                  {tc('offerings.form.add')}
                </button>
              )}
            </>
          )}
        </nav>

        <div className="commerce-pane">
          {!current && (
            <>
              <ToggleSwitch
                checked={general.isCommercial}
                helper={tc('offerings.form.commercialHelper')}
                label={tc('offerings.form.commercial')}
                onChange={(isCommercial) => setGen({ isCommercial })}
              />
              <p className="form-preview-note">
                {tc('offerings.form.consequences')}
              </p>
              {general.isCommercial && (
                <>
                  <FormField
                    helper={tc('offerings.form.taglineHelper')}
                    label={tc('offerings.form.tagline')}
                    mt="6"
                    optional
                  >
                    <Input
                      placeholder={tc('offerings.form.taglineHolder')}
                      value={general.tagline}
                      onChange={(e) => setGen({ tagline: e.target.value })}
                    />
                  </FormField>
                  <FormField
                    helper={tc('offerings.form.defaultContactHelper')}
                    label={tc('offerings.form.defaultContact')}
                    mt="6"
                  >
                    <ContactFields
                      value={general.contact}
                      onChange={(contact) => setGen({ contact })}
                    />
                  </FormField>
                  <div style={{ marginTop: '1.5rem' }}>
                    <ToggleSwitch
                      checked={general.withHours}
                      helper={tc('offerings.form.defaultHoursHelper')}
                      label={tc('offerings.form.defaultHours')}
                      onChange={(withHours) => setGen({ withHours })}
                    />
                    {general.withHours && (
                      <OpeningHoursFields
                        note={general.hoursNote}
                        value={general.openingHours}
                        onChange={(openingHours) => setGen({ openingHours })}
                        onNoteChange={(hoursNote) => setGen({ hoursNote })}
                      />
                    )}
                  </div>
                </>
              )}
            </>
          )}

          {current && (
            <div key={current.key}>
              <FormField label={tc('offerings.form.kind')}>
                <div className="commerce-kind-choice" role="radiogroup">
                  {OFFERING_KINDS.map((kind) => (
                    <button
                      key={kind}
                      type="button"
                      role="radio"
                      aria-checked={current.kind === kind}
                      className={current.kind === kind ? 'is-selected' : ''}
                      onClick={() => setOffering({ kind })}
                    >
                      {tc(`offerings.kinds.${kind}`)}
                    </button>
                  ))}
                </div>
              </FormField>
              <FormField
                helper={tc('offerings.form.offeringTitleHelper')}
                label={tc('offerings.form.offeringTitle')}
                mt="6"
                optional
              >
                <Input
                  placeholder={tc('offerings.form.offeringTitleHolder')}
                  value={current.title}
                  onChange={(e) => setOffering({ title: e.target.value })}
                />
              </FormField>
              <FormField
                helper={tc('offerings.form.descriptionHelper')}
                label={tc('offerings.form.description')}
                mt="6"
              >
                <Quill
                  value={current.description}
                  onChange={(description) => setOffering({ description })}
                />
              </FormField>
              <FormField
                helper={tc('offerings.form.contactHelper')}
                label={tc('offerings.form.contact')}
                mt="6"
              >
                <ContactFields
                  value={current.contact}
                  onChange={(contact) => setOffering({ contact })}
                />
              </FormField>
              <div style={{ marginTop: '1.5rem' }}>
                <ToggleSwitch
                  checked={current.ownHours}
                  helper={tc('offerings.form.ownHoursHelper')}
                  label={tc('offerings.form.ownHours')}
                  onChange={(ownHours) => setOffering({ ownHours })}
                />
                {current.ownHours && (
                  <OpeningHoursFields
                    note={current.hoursNote}
                    value={current.openingHours}
                    onChange={(openingHours) => setOffering({ openingHours })}
                    onNoteChange={(hoursNote) => setOffering({ hoursNote })}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
