import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';
import dayjs from 'dayjs';

import { Button } from '/imports/ui/core';
import { currentUserAtom } from '/imports/state';

import {
  clearDraft,
  draftKey,
  loadDraft,
  saveDraft,
  type FormDraft,
} from './formDraft';

// A form's draft (see formDraft.ts) as hooks: one form keeps what is
// chosen outside its text fields (`state`) and what is typed in them
// (`values`), a moment after each change and when the form closes, as
// long as something differs from what the form started with. The event
// form has its own, older version of the same in PublicActivityForm.

export interface DraftData {
  state: Record<string, any>;
  values: Record<string, any>;
}

const pick = (from: any, fields: readonly string[]) =>
  Object.fromEntries(fields.map((field) => [field, from?.[field] ?? null]));

// The texts as written; an empty editor counts as empty.
const textsOf = (values: any, fields: readonly string[]) =>
  JSON.stringify(
    fields.map((field) =>
      String(values?.[field] ?? '')
        .replace(/<p><br><\/p>/g, '')
        .trim()
    )
  );

// The draft's key for this user and form ("place:new", "info:<id>"), and
// a way to throw the draft away and start the form over: render the form
// with `formKey` as its React key and call `discard`.
export function useDraftKey(form: string) {
  const currentUser = useAtomValue(currentUserAtom);
  const key = draftKey(currentUser?._id, form);
  const [generation, setGeneration] = useState(0);
  return {
    key,
    formKey: `${key}:${generation}`,
    discard: () => {
      clearDraft(key);
      setGeneration((n) => n + 1);
    },
  };
}

// The draft as it was when the form opened, or null; read once.
export function useLoadedDraft(key: string): FormDraft<DraftData> | null {
  const [draft] = useState(() => loadDraft<DraftData>(key));
  return draft;
}

interface KeepDraftOptions {
  key: string;
  draft: FormDraft<DraftData> | null;
  // What the form holds now, and what it started with
  state: Record<string, any>;
  pristineState: Record<string, any>;
  pristineValues: Record<string, any>;
  stateFields: readonly string[];
  textFields: readonly string[];
}

// Keeps the draft up to date. Hand `onValuesChange` to GenericEntryForm
// and call `markSaved` once the entry is saved: the draft then goes.
export function useKeepDraft({
  key,
  draft,
  state,
  pristineState,
  pristineValues,
  stateFields,
  textFields,
}: KeepDraftOptions) {
  const textsRef = useRef<Record<string, any>>({
    ...pristineValues,
    ...(draft?.data.values || {}),
  });
  const [textsChanged, setTextsChanged] = useState(0);
  const baselineRef = useRef({
    state: JSON.stringify(pick(pristineState, stateFields)),
    texts: textsOf(pristineValues, textFields),
  });
  const isSavedRef = useRef(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  const keep = () => {
    if (isSavedRef.current) {
      return;
    }
    const isChanged =
      JSON.stringify(pick(stateRef.current, stateFields)) !==
        baselineRef.current.state ||
      textsOf(textsRef.current, textFields) !== baselineRef.current.texts;
    if (isChanged) {
      saveDraft<DraftData>(key, {
        state: pick(stateRef.current, stateFields),
        values: pick(textsRef.current, textFields),
      });
    } else if (!draft) {
      clearDraft(key);
    }
  };
  const keepRef = useRef(keep);
  keepRef.current = keep;

  useEffect(() => {
    const timer = window.setTimeout(() => keepRef.current(), 400);
    return () => window.clearTimeout(timer);
  }, [state, textsChanged]);
  // Leaving the form keeps the very last change too
  useEffect(() => () => keepRef.current(), []);

  const onValuesChange = useCallback((values: Record<string, any>) => {
    textsRef.current = values;
    setTextsChanged((n) => n + 1);
  }, []);

  const markSaved = useCallback(() => {
    isSavedRef.current = true;
    clearDraft(key);
  }, [key]);

  return { onValuesChange, markSaved };
}

// At the top of a form that brought a draft back: when it was written,
// and a button to throw it away.
export function DraftNotice({
  draft,
  onDiscard,
}: {
  draft: FormDraft<DraftData> | null;
  onDiscard: () => void;
}) {
  const [tc] = useTranslation('common');
  if (!draft) {
    return null;
  }
  return (
    <div className="form-draft-notice" role="status">
      <p>
        {tc('drafts.restored', {
          when: dayjs(draft.savedAt).format('D MMMM HH:mm'),
        })}
      </p>
      <Button size="sm" variant="outline" onClick={onDiscard}>
        {tc('drafts.discard')}
      </Button>
    </div>
  );
}
