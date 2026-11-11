// Drafts of forms being filled in, kept in this browser until the form is
// saved: if saving fails, the sheet is closed or the page reloads, what was
// written is still there the next time the form is opened.
//
// Only this browser has them, one per user and form. Pictures not yet
// uploaded cannot be kept.

const PREFIX = 'cocoso:draft:';
// An old draft is more confusing than helpful
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export interface FormDraft<T> {
  savedAt: number;
  data: T;
}

export const draftKey = (userId: string | undefined, form: string) =>
  `${PREFIX}${userId || 'anonymous'}:${form}`;

export function loadDraft<T>(key: string): FormDraft<T> | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return null;
    }
    const draft = JSON.parse(raw) as FormDraft<T>;
    if (!draft?.data || Date.now() - draft.savedAt > MAX_AGE_MS) {
      window.localStorage.removeItem(key);
      return null;
    }
    return draft;
  } catch {
    return null;
  }
}

export function saveDraft<T>(key: string, data: T) {
  try {
    window.localStorage.setItem(
      key,
      JSON.stringify({ savedAt: Date.now(), data })
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
