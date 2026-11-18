import React, { useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { useAtom } from 'jotai';

import { styled } from '/stitches.config';
import { Button, Modal } from '/imports/ui/core';
import { call } from '/imports/api/_utils/shared';
import { message } from '/imports/ui/generic/message';

import { groupAtom } from '../../groupAtom';

interface Member {
  memberId: string;
  username: string;
  avatar?: string | null;
  isAdmin?: boolean;
  joinDate?: Date;
}

const Count = styled('p', {
  color: 'var(--cocoso-mylla-soft)',
  margin: '0 0 0.75rem',
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
  flexWrap: 'wrap',
  gap: '0.85rem',
  padding: '0.5rem',
  '&:hover': { backgroundColor: 'var(--cocoso-colors-theme-50)' },
  variants: {
    asking: {
      true: {
        backgroundColor: 'var(--cocoso-colors-theme-50)',
      },
    },
  },
});

// The round portrait of the site, or the initial on green
const Portrait = styled('span', {
  alignItems: 'center',
  backgroundColor: 'var(--cocoso-colors-theme-100)',
  borderRadius: '999px',
  color: 'var(--cocoso-colors-theme-800)',
  display: 'flex',
  flexShrink: 0,
  fontFamily: 'var(--cocoso-font-display)',
  fontSize: '1.1rem',
  fontWeight: 600,
  height: '44px',
  justifyContent: 'center',
  overflow: 'hidden',
  width: '44px',
  '& img': { height: '100%', objectFit: 'cover', width: '100%' },
});

const Who = styled('div', {
  flex: '1 1 10rem',
  minWidth: 0,
  '& a': {
    color: 'var(--cocoso-colors-theme-800)',
    display: 'block',
    fontWeight: 600,
    overflow: 'hidden',
    textDecoration: 'none',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  '& a:hover': { textDecoration: 'underline' },
  '& small': { color: 'var(--cocoso-mylla-soft)', fontSize: '0.82rem' },
});

const Badge = styled('span', {
  backgroundColor: 'var(--cocoso-colors-theme-100)',
  borderRadius: '999px',
  color: 'var(--cocoso-colors-theme-800)',
  fontSize: '0.8rem',
  fontWeight: 700,
  padding: '0.2rem 0.65rem',
});

// Asking once more, under the member: making someone an admin hands them
// the whole group
const Ask = styled('div', {
  alignItems: 'center',
  display: 'flex',
  flexBasis: '100%',
  flexWrap: 'wrap',
  gap: '0.5rem',
  justifyContent: 'flex-end',
  '& p': {
    color: 'var(--cocoso-mylla)',
    flex: '1 1 14rem',
    fontSize: '0.92rem',
    margin: 0,
  },
});

// A group's members for its admins: who, since when, who runs it, and
// making a member an admin.
export default function ManageMembers({ onClose }: { onClose: () => void }) {
  const [t] = useTranslation('groups');
  const [tc] = useTranslation('common');
  const [group, setGroup] = useAtom(groupAtom) as [any, (g: any) => void];
  const [asking, setAsking] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const members: Member[] = [...(group?.members || [])].sort(
    (a: Member, b: Member) =>
      Number(Boolean(b.isAdmin)) - Number(Boolean(a.isAdmin)) ||
      a.username.localeCompare(b.username, 'sv')
  );

  const makeAdmin = async (username: string) => {
    setSaving(true);
    try {
      await call('setAsAGroupAdmin', group._id, username);
      setGroup(await call('getGroupWithMeetings', group._id));
      message.success(t('meeting.success.admin'));
      setAsking(null);
    } catch (error: any) {
      message.error(error.reason || error.error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      hideFooter
      open
      id="group-manage-members"
      title={t('admin.manage_members')}
      onClose={onClose}
    >
      <Count>{t('membership.count', { count: members.length })}</Count>
      <List>
        {members.map((member) => (
          <Row key={member.memberId} asking={asking === member.memberId}>
            <Portrait aria-hidden>
              {member.avatar ? (
                <img alt="" src={member.avatar} />
              ) : (
                member.username.charAt(0).toUpperCase()
              )}
            </Portrait>
            <Who>
              <Link to={`/@${member.username}`}>{member.username}</Link>
              {member.joinDate && (
                <small>
                  {t('membership.joined', {
                    date: dayjs(member.joinDate).format('D MMM YYYY'),
                  })}
                </small>
              )}
            </Who>
            {member.isAdmin ? (
              <Badge>{t('membership.admin')}</Badge>
            ) : (
              asking !== member.memberId && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setAsking(member.memberId)}
                >
                  {t('membership.makeAdmin')}
                </Button>
              )
            )}
            {asking === member.memberId && (
              <Ask>
                <p>
                  {t('membership.makeAdminAsk', { name: member.username })}
                </p>
                <Button
                  loading={saving}
                  size="sm"
                  onClick={() => makeAdmin(member.username)}
                >
                  {t('membership.yes')}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setAsking(null)}
                >
                  {tc('actions.cancel')}
                </Button>
              </Ask>
            )}
          </Row>
        ))}
      </List>
    </Modal>
  );
}
