import { atom } from 'jotai';

import type { Host, Location, PageTitle, Role, User } from './ui/types';

export const currentHostAtom = atom<Host | null>(null);
export const currentUserAtom = atom<User | null>(null);
export const isDesktopAtom = atom<boolean>(true);
export const isMobileAtom = atom<boolean>(false);
// Published locations (villages/places), loaded once at boot.
export const locationsAtom = atom<Location[]>([]);
export const pageTitlesAtom = atom<PageTitle[]>([]);
export const renderedAtom = atom<boolean>(false);
export const roleAtom = atom<Role>(null);
// Holds the decrypted private key in memory — never written to DB or localStorage.
// Null until the user logs in and the key is decrypted from their backup blob.
export const privateKeyAtom = atom<Uint8Array | null>(null);

export const canCreateContentAtom = atom<boolean>((get) => {
  const role = get(roleAtom);
  return role !== null && ['admin', 'contributor'].includes(role);
});
