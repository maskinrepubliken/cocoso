import { createContext, useContext } from 'react';

// The entry form sheet owns Save and Cancel in its sticky footer. A form
// inside it takes the sheet's form id, so the footer's Save submits it, and
// tells the sheet when Save should be held back, or what to say beside
// Save while the form is filled in (something missing that does not stop
// a save).
export interface EntryFormSheetContextValue {
  formId: string;
  setSubmitDisabled: (disabled: boolean) => void;
  setNotice: (notice: string | null) => void;
}

export const EntryFormSheetContext =
  createContext<EntryFormSheetContextValue | null>(null);

export const useEntryFormSheet = () => useContext(EntryFormSheetContext);
