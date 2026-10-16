import React from 'react';

import { getImageUrl } from '/imports/ui/utils/imageHelper';

export interface Person {
  _id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  avatar?: string | null;
}

export const personName = (p?: Partial<Person> | null) =>
  (p && [p.firstName, p.lastName].filter(Boolean).join(' ')) ||
  (p?.username ? `@${p.username}` : '');

// A person's picture in the organizers' dark green ring, or their initial
// on paper when they have none (as the header's account button).
export function PersonAvatar({
  person,
  size = 40,
}: {
  person?: Partial<Person> | null;
  size?: number;
}) {
  const src = person?.avatar ? getImageUrl(person.avatar, 'thumb') : null;
  const initial = (personName(person).replace('@', '')[0] || '?').toUpperCase();
  return (
    <span
      aria-hidden
      className={`person-avatar ${src ? '' : 'is-initial'}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
    >
      {src ? <img alt="" src={src} /> : initial}
    </span>
  );
}

// A row naming a person: picture, name, @username, and whatever the
// caller adds at the end (a button to change or remove them).
export default function PersonCard({
  person,
  note,
  action,
  size = 40,
}: {
  person?: Partial<Person> | null;
  note?: React.ReactNode;
  action?: React.ReactNode;
  size?: number;
}) {
  const name = personName(person);
  const fullName = Boolean(person?.firstName || person?.lastName);
  return (
    <div className="person-card">
      <PersonAvatar person={person} size={size} />
      <span className="person-card-text">
        <span className="person-card-name">{name}</span>
        {(note || fullName) && (
          <span className="person-card-note">
            {note || `@${person?.username}`}
          </span>
        )}
      </span>
      {action && <span className="person-card-action">{action}</span>}
    </div>
  );
}
