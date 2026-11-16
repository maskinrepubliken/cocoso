// Drafts of forms being filled in, kept in this browser until the form is
// saved: if saving fails, the sheet is closed or the page reloads, what was
// written is still there the next time the form is opened.
//
// Only this browser has them, one per user and per thing: each event,
// place and info page being edited has its own ("place:<id>"), and so does
// each kind of new one ("place:new", "place:new:in:<id>"). Pictures not yet
// uploaded cannot be kept.

const PREFIX = 'cocoso:draft:';
// An old draft is more confusing than helpful
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export interface FormDraft<T> {
  savedAt: number;
  data: T;
  // The entry as it was saved when the draft was begun (see draftBase in
  // useFormDraft.tsx). Saved again since, by anyone, and the draft would
  // undo that: it is thrown away instead.
  base?: string;
}

export const draftKey = (userId: string | undefined, form: string) =>
  `${PREFIX}${userId || 'anonymous'}:${form}`;

// `base`: the entry as it is saved now, when editing one
export function loadDraft<T>(key: string, base?: string): FormDraft<T> | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return null;
    }
    const draft = JSON.parse(raw) as FormDraft<T>;
    const isStale =
      base !== undefined && draft?.base !== undefined && draft.base !== base;
    if (!draft?.data || Date.now() - draft.savedAt > MAX_AGE_MS || isStale) {
      window.localStorage.removeItem(key);
      return null;
    }
    return draft;
  } catch {
    return null;
  }
}

export function saveDraft<T>(key: string, data: T, base?: string) {
  try {
    window.localStorage.setItem(
      key,
      JSON.stringify({ savedAt: Date.now(), data, base })
    );
  } catch {
    // Storage full or blocked: the form works as before, without a draft
  }
}

export function clearDraft(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // nothing kept, nothing to clear
  }
}
