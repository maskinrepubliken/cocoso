import React from 'react';

export interface NoticeProps {
  children: React.ReactNode;
  className?: string;
}

// The site's notice bar: a light green, see-through pill with one line of
// text, as under a listing's heading when a place is chosen ("Visar bara
// … i <ort>"). That one is a link (PlaceNotice); this is the plain kind,
// for a line that only informs.
export default function Notice({ children, className = '' }: NoticeProps) {
  return (
    <p className={`site-notice ${className}`} role="note">
      {children}
    </p>
  );
}
