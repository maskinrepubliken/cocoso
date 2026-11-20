import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import PlusIcon from 'lucide-react/dist/esm/icons/plus';
import XIcon from 'lucide-react/dist/esm/icons/x';

import PersonCard, {
  personName,
} from '/imports/ui/pages/activities/form/PersonCard';
import PickerPopover from '/imports/ui/pages/activities/form/PickerPopover';
import {
  OrganizerRow,
  type OrganizerOption,
} from '/imports/ui/pages/activities/form/OrganizerFields';

interface ManagerFieldsProps {
  // The user ids of those who look after the place
  value: string[];
  // All organizers and admins, from getOrganizerOptions
  options: OrganizerOption[];
  onChange: (managerIds: string[]) => void;
}

const searchText = (o: OrganizerOption) =>
  [o.firstName, o.lastName, o.username].filter(Boolean).join(' ');

// Who looks after a place: the organizers as cards, each to be taken away,
// and a search to add another, as the co-organizers of an event.
export default function ManagerFields({
  value,
  options,
  onChange,
}: ManagerFieldsProps) {
  const [t] = useTranslation('resources');
  const [picking, setPicking] = useState(false);
  const managers = value.map(
    (id) => options.find((o) => o._id === id) || { _id: id, username: '…' }
  );
  const candidates = options.filter((o) => !value.includes(o._id));

  return (
    <>
      {managers.length > 0 ? (
        <div className="person-list">
          {managers.map((person) => (
            <PersonCard
              key={person._id}
              action={
                <button
                  type="button"
                  className="person-card-remove"
                  aria-label={t('form.managers.remove', {
                    name: personName(person),
                  })}
                  onClick={() =>
                    onChange(value.filter((id) => id !== person._id))
                  }
                >
                  <XIcon width={16} height={16} />
                </button>
              }
              person={person}
            />
          ))}
        </div>
      ) : (
        <p className="form-preview-note">{t('form.managers.none')}</p>
      )}
      <div className="picker-anchor">
        <button
          type="button"
          className="person-add-small"
          aria-expanded={picking}
          disabled={candidates.length === 0}
          onClick={() => setPicking(!picking)}
        >
          <PlusIcon aria-hidden width={14} height={14} />
          {t('form.managers.add')}
        </button>
        {picking && (
          <PickerPopover
            emptyText={t('form.managers.empty')}
            getKey={(o) => o._id}
            getSearchText={searchText}
            items={candidates}
            placeholder={t('form.managers.search')}
            renderItem={(o) => <OrganizerRow organizer={o} />}
            onClose={() => setPicking(false)}
            onPick={(o) => {
              onChange([...value, o._id]);
              setPicking(false);
            }}
          />
        )}
      </div>
    </>
  );
}
