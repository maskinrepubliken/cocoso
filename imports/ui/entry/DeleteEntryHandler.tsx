import { useNavigate, useSearchParams } from 'react-router';
import React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';
import AlertIcon from 'lucide-react/dist/esm/icons/triangle-alert';

import { styled } from '/stitches.config';
import Modal from '/imports/ui/core/Modal';

import { canCreateContentAtom, currentUserAtom, roleAtom } from '../../state';
import { call } from '../../api/_utils/shared';
import { message } from '../generic/message';
import { sitePath } from '/imports/api/_utils/paths';

type Context = 'activities' | 'groups' | 'resources' | 'works' | 'info';

interface User {
  _id: string;
}

function getDeleteMethod(context: Context): string | null {
  switch (context) {
    case 'activities':
      return 'deleteActivity';
    case 'groups':
      return 'deleteGroup';
    case 'resources':
      return 'deleteResource';
    case 'works':
      return 'deleteWork';
    case 'info':
      return 'deletePage';
    default:
      return null;
  }
}

interface BaseItem {
  _id: string;
  authorId?: string;
  userId?: string;
  // What it is called: a title, or a place's label
  title?: string;
  label?: string;
}

// What goes, by name, then a quiet red line that it is for good
const Body = styled('p', {
  color: 'var(--cocoso-mylla)',
  fontSize: '1.05rem',
  lineHeight: 1.55,
  margin: '0 0 1rem',
  '& strong': { color: 'var(--cocoso-colors-theme-900)' },
});

const Warning = styled('p', {
  alignItems: 'center',
  backgroundColor: 'var(--cocoso-colors-red-50)',
  borderRadius: 'var(--cocoso-radius-falt)',
  color: 'var(--cocoso-colors-red-700)',
  display: 'flex',
  fontSize: '0.92rem',
  fontWeight: 600,
  gap: '0.5rem',
  margin: 0,
  padding: '0.6rem 0.8rem',
  '& svg': { flexShrink: 0, height: '1rem', width: '1rem' },
});

export interface DeleteEntryHandlerProps {
  item: BaseItem;
  context: Context;
}

export default function DeleteEntryHandler({
  item,
  context,
}: DeleteEntryHandlerProps) {
  const canCreateContent = useAtomValue(canCreateContentAtom);
  const currentUser = useAtomValue(currentUserAtom) as User | null;
  const role = useAtomValue(roleAtom);

  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [tc] = useTranslation('common');

  const deleteEntry = async () => {
    const deleteMethod = getDeleteMethod(context);
    if (!deleteMethod) {
      return;
    }
    try {
      await call(deleteMethod, item._id);
      message.success(tc('message.success.remove'));
      navigate(sitePath(context));
      if (context === 'info') {
        window.location.reload();
      }
    } catch (error: any) {
      if (error.error === 'place-has-upcoming') {
        message.error(
          tc('message.error.placeHasUpcoming', { count: error.details?.count })
        );
        return;
      }
      message.error(error.reason || error.error);
    }
  };

  if (!canCreateContent) {
    return null;
  }

  if (context === 'resources') {
    if (currentUser?._id !== item?.userId && role !== 'admin') {
      return null;
    }
  } else if (currentUser?._id !== item?.authorId && role !== 'admin') {
    return null;
  }

  const isOpen = searchParams.get('delete') === 'true';
  const keys = `modals.confirm.delete.${context}`;

  return (
    <Modal
      cancelText={tc('actions.cancel')}
      confirmButtonProps={{
        colorScheme: 'red',
      }}
      confirmText={tc(`${keys}.yes`)}
      id="delete-entry-handler"
      title={tc(`${keys}.title`)}
      open={isOpen}
      onConfirm={() => deleteEntry()}
      onClose={() => {
        const newParams = new URLSearchParams(searchParams);
        newParams.set('delete', 'false');
        setSearchParams(newParams);
      }}
    >
      <Body>
        <Trans
          components={{ b: <strong /> }}
          i18nKey={`common:${keys}.body`}
          values={{ name: item?.title || item?.label || '' }}
        />
      </Body>
      <Warning>
        <AlertIcon aria-hidden />
        {tc('modals.confirm.delete.cantundo')}
      </Warning>
    </Modal>
  );
}
