import { atom } from 'jotai';

// The group on the page, kept fresh as one joins, leaves or adds a meeting.
// On its own so the header can read it without the group page's code.
export const groupAtom = atom<any>(null);
