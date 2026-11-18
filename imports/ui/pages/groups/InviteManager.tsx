import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import XIcon from 'lucide-react/dist/esm/icons/x';
import { useAtom } from 'jotai';

import { styled } from '/stitches.config';
import { Button, Input, Modal } from '/imports/ui/core';
import {
  call,
  emailIsValid,
  includesSpecialCharacters,
} from '/imports/api/_utils/shared';
import { message } from '/imports/ui/generic/message';

import { groupAtom } from './groupAtom';

interface Person {
  firstName: string;
  email: string;
}

const Intro = styled('p', {
  color: 'var(--cocoso-mylla)',
  lineHeight: 1.55,
  margin: '0 0 1.25rem',
});

// Name and email side by side on a wide dialog, one under the other on a
// phone, the button at the end
const Fields = styled('form', {
  alignItems: 'end',
  display: 'grid',
  gap: '0.75rem',
  gridTemplateColumns: '1fr',
  '@media (min-width: 640px)': {
    gridTemplateColumns: '1fr 1.4fr auto',
  },
  '& label': {
    color: 'var(--cocoso-mylla)',
    display: 'block',
    fontSize: '0.88rem',
    fontWeight: 600,
    marginBottom: '0.3rem',
  },
});

const ListTitle = styled('h3', {
  fontFamily: 'var(--cocoso-font-display)',
  fontSize: '1.15rem',
  fontWeight: 600,
  margin: '1.75rem 0 0.75rem',
});

const List = styled('ul', {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
  listStyle: 'none',
  margin: 0,
  padding: 0,
});

const Row = styled('li', {
  alignItems: 'center',
  borderRadius: '12px',
  display: 'flex',
  gap: '0.75rem',
  padding: '0.45rem 0.5rem',
  '&:hover': { backgroundColor: 'var(--cocoso-colors-theme-50)' },
  '& > span:nth-child(2)': { flex: '1 1 auto', minWidth: 0 },
  '& strong': { display: 'block' },
  '& small': {
    color: 'var(--cocoso-mylla-soft)',
    display: 'block',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
});

const Initial = styled('span', {
  alignItems: 'center',
  backgroundColor: 'var(--cocoso-colors-theme-100)',
  borderRadius: '999px',
  color: 'var(--cocoso-colors-theme-800)',
  display: 'flex',
  flexShrink: 0,
  fontFamily: 'var(--cocoso-font-display)',
  fontWeight: 600,
  height: '38px',
  justifyContent: 'center',
  width: '38px',
});

const Remove = styled('button', {
  alignItems: 'center',
  background: 'none',
  border: 0,
  borderRadius: '999px',
  color: 'var(--cocoso-mylla-soft)',
  cursor: 'pointer',
  display: 'flex',
  flexShrink: 0,
  height: '2rem',
  justifyContent: 'center',
  width: '2rem',
  '& svg': { height: '1rem', width: '1rem' },
  '&:hover': {
    backgroundColor: 'var(--cocoso-colors-red-50)',
    color: 'var(--cocoso-colors-red-700)',
  },
});

const Empty = styled('p', { color: 'var(--cocoso-mylla-soft)', margin: 0 });

// Inviting people to a private group, opened from the gear: a name and an
// email send an invitation, and those invited are listed below, each with
// a cross to take the invitation back.
export default function InviteManager({ onClose }: { onClose: () => void }) {
  const [t] = useTranslation('groups');
  const [group, setGroup] = useAtom(groupAtom) as [any, (g: any) => void];
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);

  const invited: Person[] = group?.peopleInvited || [];

  const refresh = async () =>
    setGroup(await call('getGroupWithMeetings', group._id));

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    const address = email.trim();
    const name = firstName.trim();
    if (invited.some((person) => person.email === address)) {
      message.error(t('invite.email.already'));
      return;
    }
    if (!emailIsValid(address)) {
      message.error(t('invite.email.valid'));
      return;
    }
    if (name.length < 2 || includesSpecialCharacters(name)) {
      message.error(t('invite.firstName.valid'));
      return;
    }
    setSending(true);
    try {
      await call('invitePersonToPrivateGroup', group._id, {
        firstName: name,
        email: address,
      });
      await refresh();
      message.success(t('invite.success', { name }));
      setFirstName('');
      setEmail('');
    } catch (error: any) {
      message.error(error.reason || error.error);
    } finally {
      setSending(false);
    }
  };

  const remove = async (person: Person) => {
    try {
      await call('removePersonFromInvitedList', group._id, person);
      await refresh();
      message.success(t('invite.remove.success'));
    } catch (error: any) {
      message.error(error.reason || error.error);
    }
  };

  return (
    <Modal
      hideFooter
      open
      id="group-invite"
      size="lg"
      title={t('inviteDialog.title')}
      onClose={onClose}
    >
      <Intro>{t('inviteDialog.intro')}</Intro>

      <Fields onSubmit={send}>
        <div>
          <label htmlFor="invite-first-name">
            {t('inviteDialog.firstName')}
          </label>
          <Input
            id="invite-first-name"
            placeholder={t('inviteDialog.firstNameHolder')}
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
          />
        </div>
        <div>
          <label htmlFor="invite-email">{t('inviteDialog.email')}</label>
          <Input
            id="invite-email"
            placeholder={t('inviteDialog.emailHolder')}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <Button loading={sending} type="submit">
          {t('inviteDialog.send')}
        </Button>
      </Fields>

      <ListTitle>
        {t('inviteDialog.invited')} ({invited.length})
      </ListTitle>
      {invited.length === 0 ? (
        <Empty>{t('inviteDialog.empty')}</Empty>
      ) : (
        <List>
          {invited.map((person) => (
            <Row key={person.email}>
              <Initial aria-hidden>
                {(person.firstName || person.email).charAt(0).toUpperCase()}
              </Initial>
              <span>
                <strong>{person.firstName}</strong>
                <small>{person.email}</small>
              </span>
              <Remove
                aria-label={t('inviteDialog.remove', { name: person.firstName })}
                title={t('inviteDialog.remove', { name: person.firstName })}
                type="button"
                onClick={() => remove(person)}
              >
                <XIcon aria-hidden />
              </Remove>
            </Row>
          ))}
        </List>
      )}
    </Modal>
  );
}
