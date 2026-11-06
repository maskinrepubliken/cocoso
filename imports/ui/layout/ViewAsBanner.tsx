import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { Trans, useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';
import EyeIcon from 'lucide-react/dist/esm/icons/eye';

import { currentUserAtom, roleAtom, viewAsAtom } from '/imports/state';
import { stopViewAs } from '/imports/utils/viewAs';
import { message } from '/imports/ui/generic/message';

// A dark pill floating at the foot of the screen while an admin is
// viewing the site as another member: who, with what role, and the way
// back to their own account.
export default function ViewAsBanner() {
  const [t] = useTranslation('members');
  const viewAs = useAtomValue(viewAsAtom);
  const currentUser = useAtomValue(currentUserAtom);
  const role = useAtomValue(roleAtom);
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  if (!viewAs) {
    return null;
  }

  const username = currentUser?.username || viewAs;
  const roleLabel = role ? t(`roles.${role}`) : '';

  const handleBack = async () => {
    setBusy(true);
    try {
      await stopViewAs();
      message.success(t('viewAs.backSuccess'));
      navigate('/admin/listing/people');
    } catch (error: any) {
      message.error(error.reason || error.message || error.error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="view-as-bar" role="status">
      <span className="view-as-icon" aria-hidden="true">
        <EyeIcon width={18} height={18} />
      </span>
      <span className="view-as-text">
        <Trans
          i18nKey="members:viewAs.banner"
          values={{ username }}
          components={{ b: <strong /> }}
        />
        {roleLabel && <span className="view-as-role">{roleLabel}</span>}
      </span>
      <button
        className="view-as-back"
        disabled={busy}
        type="button"
        onClick={handleBack}
      >
        {t('viewAs.back')}
      </button>
    </div>
  );
}
