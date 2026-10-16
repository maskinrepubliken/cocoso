import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAtomValue } from 'jotai';
import { Trans, useTranslation } from 'react-i18next';

import { Button, Modal } from '/imports/ui/core';
import {
  getLoaderProgress,
  initialLoader,
  loaderAtom,
} from '/imports/ui/utils/loaderHandler';

import { EntryFormSheetContext } from './EntryFormSheet.context';

export interface EntryFormHandlerProps {
  open: boolean;
  title: string;
  forEdit?: boolean;
  onClose: () => void;
  children?: React.ReactNode;
}

// Matches the leave transition of .entry-sheet in client/main.css.
const CLOSE_MS = 260;

type Status = 'creating' | 'uploading' | 'sending' | 'success' | null;

function getStatus(loaders: typeof initialLoader | null): Status {
  if (!loaders) return null;
  if (loaders.isSuccess) return 'success';
  if (loaders.isSendingForm) return 'sending';
  if (loaders.isUploadingImages) return 'uploading';
  if (loaders.isCreating) return 'creating';
  return null;
}

// The sheet every "new" and "edit" form opens in: a pane of glass over the
// page, as large as the screen allows, with Save and Cancel always within
// reach in a sticky footer that also says how saving is going.
export default function EntryFormHandler({
  open,
  title,
  forEdit = false,
  onClose,
  children,
}: EntryFormHandlerProps) {
  const loaders = useAtomValue(loaderAtom);
  const [tc] = useTranslation('common');
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitDisabled, setSubmitDisabled] = useState(false);
  const [succeeded, setSucceeded] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const formId = `entry-form-${useId().replace(/:/g, '')}`;
  const titleId = `${formId}-title`;

  const shown = open && !closing;
  const progress = getLoaderProgress(loaders);
  const busy = Boolean(loaders?.isCreating) && !loaders?.isSuccess;

  // The loaders are reset a moment before the sheet closes after a save;
  // hold on to the success message until it is gone.
  const status: Status = succeeded ? 'success' : getStatus(loaders);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (loaders?.isSuccess) setSucceeded(true);
  }, [loaders?.isSuccess]);

  useEffect(() => {
    if (!open) return undefined;
    setSucceeded(false);
    setSubmitDisabled(false);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    sheetRef.current?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [open]);

  const requestClose = () => {
    if (busy) return;
    setConfirmOpen(true);
  };

  const close = () => {
    setConfirmOpen(false);
    setClosing(true);
    window.setTimeout(() => {
      setClosing(false);
      onClose();
    }, CLOSE_MS);
  };

  useEffect(() => {
    if (!open || confirmOpen) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') requestClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, confirmOpen, busy]);

  const context = useMemo(() => ({ formId, setSubmitDisabled }), [formId]);

  let statusText: string | null = null;
  if (status === 'success') {
    statusText = tc(`message.success.${forEdit ? 'update' : 'create'}`);
  } else if (status) {
    statusText = tc(`message.loading.${status}`);
  } else if (submitDisabled) {
    statusText = tc('entrySheet.blocked');
  }

  const sheet = (
    <div
      aria-hidden={!shown}
      className="entry-sheet-root"
      data-state={shown ? 'open' : 'closed'}
    >
      <div className="entry-sheet-backdrop" onClick={requestClose} />
      <div
        ref={sheetRef}
        aria-labelledby={titleId}
        aria-modal="true"
        className="entry-sheet"
        role="dialog"
        tabIndex={-1}
      >
        <header className="entry-sheet-head">
          <h2 className="entry-sheet-title" id={titleId}>
            <Trans i18nKey={title} />
          </h2>
        </header>

        <div className="entry-sheet-body">
          <div className="entry-sheet-inner">
            <EntryFormSheetContext.Provider value={context}>
              {children}
            </EntryFormSheetContext.Provider>
          </div>
        </div>

        <footer className="entry-sheet-foot">
          {progress > 0 && (
            <div aria-hidden className="entry-sheet-progress">
              <span style={{ width: `${progress}%` }} />
            </div>
          )}
          <div
            aria-live="polite"
            className="entry-sheet-status"
            data-status={status || (submitDisabled ? 'blocked' : 'idle')}
            role="status"
          >
            {statusText && (
              <>
                <span aria-hidden className="entry-sheet-status-mark" />
                <span>{statusText}</span>
              </>
            )}
          </div>
          <div className="entry-sheet-actions">
            <Button disabled={busy} variant="outline" onClick={requestClose}>
              {tc('actions.cancel')}
            </Button>
            <Button
              disabled={submitDisabled || status === 'success'}
              form={formId}
              loading={busy}
              type="submit"
            >
              {tc('actions.save')}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );

  return (
    <>
      {mounted && createPortal(sheet, document.body)}
      <Modal
        cancelText={tc('modals.confirm.newentry.cancel')}
        confirmText={tc('modals.confirm.newentry.yes')}
        id="new-entry-handler-confirm-close"
        open={confirmOpen}
        title={tc('modals.confirm.newentry.title')}
        onConfirm={close}
        onClose={() => setConfirmOpen(false)}
      >
        {tc('modals.confirm.newentry.body')}
      </Modal>
    </>
  );
}
