/**
 * Escape a value for safe interpolation into an HTML template string.
 *
 * Use this for every user-supplied scalar (names, titles, labels) that ends
 * up inside server-rendered HTML such as email bodies. Rich-text fields that
 * are intentionally HTML (Quill output) must be sanitised instead, not
 * escaped.
 */
export default function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
