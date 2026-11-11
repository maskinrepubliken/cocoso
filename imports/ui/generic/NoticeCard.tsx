import React from 'react';

import { Center } from '/imports/ui/core';
import ThreeDIcon from '/imports/ui/generic/ThreeDIcon';

interface NoticeCardProps {
  tone?: 'info' | 'warning' | 'success' | 'error';
  icon?: string;
  title: React.ReactNode;
  children?: React.ReactNode;
  // A small line such as an error code or the technical message
  code?: React.ReactNode;
  // Buttons or links to go on from here
  actions?: React.ReactNode;
}

// A note that takes the place of a page's content: something could not be
// found or failed to load. Tinted glass like the other notices
// (.cocoso-notice in client/main.css).
export default function NoticeCard({
  tone = 'warning',
  icon,
  title,
  children,
  code,
  actions,
}: NoticeCardProps) {
  return (
    <Center py="12" px="4">
      <div
        className="new-entry-helper cocoso-notice"
        data-tone={tone}
        role={tone === 'error' ? 'alert' : 'status'}
        style={{ maxWidth: '440px' }}
      >
        {icon && <ThreeDIcon name={icon} size={96} />}
        <h3>{title}</h3>
        {children && <p>{children}</p>}
        {code && <p className="notice-code">{code}</p>}
        {actions && <div className="notice-actions">{actions}</div>}
      </div>
    </Center>
  );
}
