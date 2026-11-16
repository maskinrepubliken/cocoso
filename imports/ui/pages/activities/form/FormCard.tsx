import React from 'react';

import type { FormArea } from '/imports/ui/forms/GenericEntryForm';

interface FormCardProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  // Which column of the entry form it goes in (GenericEntryForm reads it)
  area?: FormArea;
  // A tall card beside the others on a wide sheet: it spans their rows
  tall?: boolean;
}

// A group of settings that belong together (organizer, place, booking),
// as one paper card with a small heading.
export default function FormCard({
  title,
  icon,
  children,
  tall = false,
}: FormCardProps) {
  return (
    <section className={`form-card ${tall ? 'is-tall' : ''}`}>
      <h3 className="form-card-title">
        {icon}
        {title}
      </h3>
      <div className="form-card-body">{children}</div>
    </section>
  );
}
