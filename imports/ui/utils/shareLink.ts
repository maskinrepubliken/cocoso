// Share the current page: the phone's share sheet when there is one, else
// the clipboard, else an old-fashioned hidden textarea. Resolves to
// 'shared' | 'copied' | 'failed' and never throws, so a button can show
// "Länken är kopierad" only when it is true. (navigator.clipboard is
// missing on plain http, which is how the dev server is reached.)
export type ShareOutcome = 'shared' | 'copied' | 'failed';

export async function shareLink(
  url: string,
  title?: string
): Promise<ShareOutcome> {
  if (typeof navigator === 'undefined') {
    return 'failed';
  }
  const nav = navigator as Navigator & {
    share?: (data: { url: string; title?: string }) => Promise<void>;
    canShare?: (data: { url: string; title?: string }) => boolean;
  };
  const isTouch =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(pointer: coarse)').matches;
  if (isTouch && nav.share && (!nav.canShare || nav.canShare({ url, title }))) {
    try {
      await nav.share({ url, title });
      return 'shared';
    } catch {
      // The person closed the sheet; fall through to copying.
    }
  }
  if (nav.clipboard?.writeText) {
    try {
      await nav.clipboard.writeText(url);
      return 'copied';
    } catch {
      // Permission denied; try the fallback.
    }
  }
  try {
    const field = document.createElement('textarea');
    field.value = url;
    field.setAttribute('readonly', '');
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.appendChild(field);
    field.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(field);
    return ok ? 'copied' : 'failed';
  } catch {
    return 'failed';
  }
}
