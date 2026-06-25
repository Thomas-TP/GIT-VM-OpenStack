import i18n from '../i18n';

// Dates come in two shapes: SQLite datetime('now') = "YYYY-MM-DD HH:MM:SS" (UTC, no
// timezone), and full ISO with a Z/offset (start_date/end_date via toISOString()).
// Only add Z to the bare SQLite form; always render in Europe/Zurich.
export function fmtDate(iso?: string | null): string {
  if (!iso) return '—';
  const s = iso.trim();
  const hasTz = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(s);
  const d = new Date(hasTz ? s : s.replace(' ', 'T') + 'Z');
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString(i18n.language, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Zurich' });
}

// Compact uptime from an ISO launch time (e.g. "2d 4h", "5h 12m", "8m").
export function fmtUptime(iso?: string | null): string {
  if (!iso) return '—';
  const start = new Date(iso).getTime();
  if (isNaN(start)) return '—';
  let s = Math.max(0, Math.floor((Date.now() - start) / 1000));
  const d = Math.floor(s / 86400);
  s -= d * 86400;
  const h = Math.floor(s / 3600);
  s -= h * 3600;
  const m = Math.floor(s / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
