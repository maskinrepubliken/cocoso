import { Meteor } from 'meteor/meteor';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useSetAtom } from 'jotai';

import { clearViewAsState } from '/imports/utils/viewAs';
import { currentUserAtom } from '/imports/state';
import { message } from '/imports/ui/generic/message';

// Logging out, the same from the account menu and the footer: drop any
// borrowed session, end the Meteor session, forget the user, go home.
export default function useLogout() {
  const setCurrentUser = useSetAtom(currentUserAtom);
  const navigate = useNavigate();
  const [t] = useTranslation('accounts');
  return () => {
    clearViewAsState();
    Meteor.logout();
    setCurrentUser(null);
    message.info(t('logout.messages.success'));
    navigate('/');
  };
}
