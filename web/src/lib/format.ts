import i18n from '../i18n';

// SQLite datetime('now') returns UTC "YYYY-MM-DD HH:MM:SS"
export function fmtDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso.replace(' ', 'T') + 'Z');
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString(i18n.language, { dateStyle: 'medium', timeStyle: 'short' });
}
