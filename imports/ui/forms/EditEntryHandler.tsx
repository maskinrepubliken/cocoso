import React from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';

import { canCreateContentAtom } from '/imports/state';
import { initialLoader, loaderAtom } from '/imports/ui/utils/loaderHandler';
import { dismissFormError } from '/imports/ui/generic/message';

import EntryFormHandler from './EntryFormHandler';

export interface EditEntryHandlerProps {
  context: string;
  // See EntryFormHandler: Cancel closes without asking
  keepsDraft?: boolean;
  // See EntryFormHandler: a new entry says "Publicera"
  publishes?: boolean;
  children?: React.ReactNode;
}

export default function EditEntryHandler({
  context,
  keepsDraft,
  publishes,
  children,
}: EditEntryHandlerProps) {
  const canCreateContent = useAtomValue(canCreateContentAtom);
  const [searchParams, setSearchParams] = useSearchParams();
  const setLoaders = useSetAtom(loaderAtom);
  const [tc] = useTranslation('common');

  const handleClose = () => {
    setLoaders({ ...initialLoader });
    dismissFormError();
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
    keepsDraft,
    publishes,
    context,
    children,
  };

  return <EntryFormHandler {...props} />;
}
