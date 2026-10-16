import React from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';

import { canCreateContentAtom } from '/imports/state';
import { initialLoader, loaderAtom } from '/imports/ui/utils/loaderHandler';

import EntryFormHandler from './EntryFormHandler';

export interface EditEntryHandlerProps {
  context: string;
  children?: React.ReactNode;
}

export default function EditEntryHandler({ context, children }: EditEntryHandlerProps) {
  const canCreateContent = useAtomValue(canCreateContentAtom);
  const [searchParams, setSearchParams] = useSearchParams();
  const setLoaders = useSetAtom(loaderAtom);
  const [tc] = useTranslation('common');

  const handleClose = () => {
    setLoaders({ ...initialLoader });
    setSearchParams((params) => ({ ...params, edit: 'false' }));
  };

  const title = tc(`common:labels.update.${context}`);
  const open = searchParams.get('edit') === 'true';

  if (!canCreateContent) {
    return null;
  }

  const props = {
    open,
    title,
    forEdit: true,
    onClose: handleClose,
    children,
  };

  return <EntryFormHandler {...props} />;
}
