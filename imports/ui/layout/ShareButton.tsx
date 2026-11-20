import React from 'react';
import { useMatches } from 'react-router';
import { useTranslation } from 'react-i18next';
import LinkIcon from 'lucide-react/dist/esm/icons/link';

import { message } from '/imports/ui/generic/message';
import { shareLink } from '/imports/ui/utils/shareLink';

// The link in the header, next to the gear: on an event's page it shares
// the page (the phone's share sheet, else the link is copied). For
// everyone, logged in or not.
export default function ShareButton() {
  const [tc] = useTranslation('common');
  const matches = useMatches();
  const data = [...matches].reverse().find((match) => match.data)?.data as
    | any
    | undefined;
  const activity = data?.activity;

  if (!activity?._id) {
    return null;
  }

  const label = tc('actions.share');
  const share = async () => {
    const outcome = await shareLink(window.location.href, activity.title);
    if (outcome === 'copied') {
      message.success(tc('actions.copied'));
    }
  };

  return (
    <div className="new-button-wrapper new-button-idle">
      <button
        type="button"
        className="site-new-button"
        aria-label={label}
        title={label}
        onClick={share}
      >
        <span className="site-new site-edit" aria-hidden>
          <LinkIcon width={16} height={16} />
        </span>
      </button>
    </div>
  );
}
