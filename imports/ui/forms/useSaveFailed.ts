import { useSetAtom } from 'jotai';

import { message } from '/imports/ui/generic/message';
import { initialLoader, loaderAtom } from '/imports/ui/utils/loaderHandler';

// What a form calls when saving did not go through: the sheet lets go of
// "saving…" so Save and Cancel work again, and says why in a popup that
// stays until it is closed. Without this the sheet stays busy and the user
// is stuck in it.
export default function useSaveFailed() {
  const setLoaders = useSetAtom(loaderAtom);
  return (error: any, text?: string) => {
    setLoaders({ ...initialLoader });
    message.formError(
      text || error?.reason || error?.error || String(error)
    );
  };
}
