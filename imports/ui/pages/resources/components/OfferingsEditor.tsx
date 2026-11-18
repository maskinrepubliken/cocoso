import React, { useEffect, useState } from 'react';
import { useRevalidator, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';
import PlusIcon from 'lucide-react/dist/esm/icons/plus';
import XIcon from 'lucide-react/dist/esm/icons/x';

import { Input, Modal } from '/imports/ui/core';
import FormField from '/imports/ui/forms/FormField';
import Quill from '/imports/ui/forms/Quill';
import ToggleSwitch from '/imports/ui/pages/activities/form/ToggleSwitch';
import { message } from '/imports/ui/generic/message';
import { call } from '/imports/api/_utils/shared';
import { currentUserAtom } from '/imports/state';
import type { OrganizerDefaults } from '/imports/ui/pages/activities/form/OrganizerFields';
import type { Opening } from '/imports/ui/pages/businesses/hours';
import {
  OFFERING_KINDS,
  type OfferingKind,
} from '/imports/api/offerings/offeringKinds';

import OpeningHoursFields from './OpeningHoursFields';
import ReachFields, {
  type Reach,
  type ReachState,
  reachState,
  reachValue,
} from './ReachFields';

// How it is reached (Reach) when not as the place is, and its own hours
// when not the place's
export interface Offering extends Reach {
  _id?: string;
  kind: OfferingKind;
  title?: string;
  description?: string;
  openingHours?: Opening[] | null;
  hoursNote?: string;
}

interface Commerce extends Reach {
  tagline?: string;
  openingHours?: Opening[];
  hoursNote?: string;
}

// The place's part of the form
interface GeneralDraft {
  isCommercial: boolean;
  tagline: string;
  reach: ReachState;
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
  ownReach: boolean;
  reach: ReachState;
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
  reach: reachState(commerce),
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
  ownReach: Boolean(
    offering.contactUserId ||
      offering.contact ||
      offering.website ||
      offering.contactNote
  ),
  reach: reachState(offering),
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
    managerIds?: string[];
  };
}

// A place's Äta, handla & bo, from the gear: on the left a list with the
// place itself first and then its offerings, to add to and take from; on
// the right what is chosen there. The place's part switches Äta, handla &
// bo on and says what that means, and holds its tagline, how it is reached
// (a manager, details of its own, its website or a free note, as a place's
// contact is chosen; a website alone is enough) and its opening hours,
// which its offerings go by unless switched to their own. An offering is a kind (Mat & fika,
// Boende, Tjänster, Försäljning), and a place can have several of a kind.
// Opened by ?offerings=true.
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
  const currentUser = useAtomValue(currentUserAtom);

  // The place's managers with their profiles, to be reached through one
  const [managers, setManagers] = useState<OrganizerDefaults[]>([]);
  const managerKey = (place.managerIds || []).join(',');
  useEffect(() => {
    if (!open) {
      return undefined;
    }
    let cancelled = false;
    Promise.all(
      (place.managerIds || []).map((id) =>
        call<OrganizerDefaults>('getOrganizerDefaults', id).catch(() => null)
      )
    ).then(
      (people) =>
        !cancelled &&
        setManagers(people.filter((p): p is OrganizerDefaults => Boolean(p)))
    );
    return () => {
      cancelled = true;
    };
  }, [open, managerKey]);

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
          ...reachValue(general.reach),
          openingHours: general.withHours ? general.openingHours : [],
          hoursNote: general.withHours ? general.hoursNote : '',
        },
        general.isCommercial
          ? offerings.map((o) => ({
              ...(o._id ? { _id: o._id } : {}),
              kind: o.kind,
              title: o.title,
              description: o.description,
              ...(o.ownReach
                ? reachValue(o.reach)
                : {
                    contactUserId: null,
                    contact: null,
                    website: null,
                    contactNote: null,
                  }),
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
                label={tc('offerings.form.commercial')}
                onChange={(isCommercial) => setGen({ isCommercial })}
              />
              <div className="commerce-consequences">
                <p>{tc('offerings.form.consequences.intro')}</p>
                <ul>
                  <li>{tc('offerings.form.consequences.move')}</li>
                  <li>{tc('offerings.form.consequences.show')}</li>
                  <li>{tc('offerings.form.consequences.same')}</li>
                  <li>{tc('offerings.form.consequences.website')}</li>
                </ul>
                <p>{tc('offerings.form.consequences.off')}</p>
              </div>
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
                    helper={tc('offerings.form.reach.helper')}
                    label={tc('offerings.form.reach.label')}
                    mt="6"
                    optional
                  >
                    <ReachFields
                      currentUserId={currentUser?._id}
                      label={tc('offerings.form.reach.label')}
                      managers={managers}
                      value={general.reach}
                      onChange={(reach) => setGen({ reach })}
                    />
                  </FormField>
                  <div style={{ marginTop: '1.5rem' }}>
                    <ToggleSwitch
                      checked={general.withHours}
                      helper={tc('offerings.form.hoursHelper')}
                      label={tc('offerings.form.hours')}
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
              <div className="commerce-own">
                <ToggleSwitch
                  checked={current.ownReach}
                  helper={tc('offerings.form.ownReachHelper')}
                  label={tc('offerings.form.reach.label')}
                  onChange={(ownReach) => setOffering({ ownReach })}
                />
                {current.ownReach && (
                  <ReachFields
                    currentUserId={currentUser?._id}
                    label={tc('offerings.form.reach.label')}
                    managers={managers}
                    value={current.reach}
                    onChange={(reach) => setOffering({ reach })}
                  />
                )}
              </div>
              <div className="commerce-own">
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
