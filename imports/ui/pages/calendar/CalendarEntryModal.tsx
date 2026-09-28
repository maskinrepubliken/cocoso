import React from 'react';

import Modal from '/imports/ui/core/Modal';
import ActivityQuickView from '/imports/ui/pages/activities/components/ActivityQuickView';

// One occurrence as the calendar hands it over.
export interface CalendarEntry {
  activityId: string;
  title: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  resourceId?: string;
  resource?: string;
  authorName: string;
  groupId?: string;
  isGroupMeeting?: boolean;
  isPublicActivity?: boolean;
  isGroupPrivate?: boolean;
  longDescription?: string;
}

interface CalendarEntryModalProps {
  entry: CalendarEntry | null;
  canEdit: boolean;
  onClose: () => void;
  onEdit: () => void;
}

// What opens when an event in the calendar is clicked, on the occurrence
// that was clicked.
export default function CalendarEntryModal({
  entry,
  canEdit,
  onClose,
  onEdit,
}: CalendarEntryModalProps) {
  if (!entry) {
    return null;
  }

  return (
    <Modal
      hideFooter
      id="calendar-item"
      open
      size="lg"
      title={entry.title}
      onClose={onClose}
    >
      <ActivityQuickView
        activityId={entry.activityId}
        initialOccurrence={entry}
        onEdit={canEdit ? onEdit : undefined}
      />
    </Modal>
  );
}
