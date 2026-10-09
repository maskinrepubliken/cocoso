import React from 'react';

import SlideWidget from '../../../entry/SlideWidget';
import ContactInfo from '../../profile/ContactInfo';

export default function UserInteractionHandler({ user }) {
  if (!user) {
    return null;
  }

  return (
    <SlideWidget justify="center">
      <ContactInfo username={user.username} userId={user._id} />
    </SlideWidget>
  );
}
