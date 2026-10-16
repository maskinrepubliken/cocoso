import i18n from 'i18next';

// What went wrong saving an event, in the reader's language: the server's
// known error codes have texts of their own, anything else as it came.
const KNOWN: Record<string, string> = {
  'image-required': 'activities:form.errors.imageRequired',
  'organizer-contact-required': 'activities:form.errors.organizerContact',
};

export default function activityErrorText(error: any): string {
  const key = error && KNOWN[error.error];
  return key ? i18n.t(key) : error?.reason || error?.error || String(error);
}
