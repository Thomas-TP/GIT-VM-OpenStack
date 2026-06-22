import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { useToast } from '../toast';
import type { Snapshot, VmRequest } from '../types';
import { fmtDate } from '../lib/format';
import { Button, IconDownload, Spinner } from '../ui';

function SnapStatus({ s }: { s: Snapshot }) {
  const { t } = useTranslation();
  if (s.status === 'completed')
    return <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">✓ {t('snapshot.statusCompleted')}</span>;
  if (s.status === 'error')
    return <span className="text-xs font-medium text-red-600 dark:text-red-400">{t('snapshot.statusError')}</span>;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
      <Spinner className="h-3.5 w-3.5" /> {t('snapshot.statusPending')}
    </span>
  );
}

/** One-click disk export: launches the helper, shows progress, then a download link. */
function ExportControls({ reqId, s }: { reqId: number; s: Snapshot }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const toast = useToast();
  const m = useMutation({
    mutationFn: (format: 'vmdk' | 'vdi') => api.exportSnapshot(reqId, s.id, format),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['snapshots', reqId] }); toast.success(t('snapshot.exportStarted')); },
    onError: (e: unknown) => toast.error(e instanceof Error && e.message === 'export_not_configured' ? t('snapshot.exportNotConfigured') : t('toast.error')),
  });

  if (s.export_status === 'running')
    return <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400"><Spinner className="h-3.5 w-3.5" /> {t('snapshot.exportRunning')}</span>;
  if (s.export_status === 'ready' && s.export_url)
    return (
      <a href={s.export_url} className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 transition hover:underline dark:text-emerald-400">
        <IconDownload className="h-3.5 w-3.5" /> .{s.export_format}
      </a>
    );
  return (
    <span className="inline-flex items-center gap-1.5">
      {s.export_status === 'error' && <span className="text-xs font-medium text-red-600 dark:text-red-400">{t('snapshot.exportError')}</span>}
      <button disabled={m.isPending} onClick={() => m.mutate('vmdk')} title={t('snapshot.exportVmdk')} className="rounded-md border border-border bg-card px-2 py-1 text-[11px] font-medium text-muted-foreground transition hover:text-foreground disabled:pointer-events-none disabled:opacity-50">.vmdk</button>
      <button disabled={m.isPending} onClick={() => m.mutate('vdi')} title={t('snapshot.exportVdi')} className="rounded-md border border-border bg-card px-2 py-1 text-[11px] font-medium text-muted-foreground transition hover:text-foreground disabled:pointer-events-none disabled:opacity-50">.vdi</button>
    </span>
  );
}

export function SnapshotPanel({ request }: { request: VmRequest }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const toast = useToast();

  const q = useQuery({
    queryKey: ['snapshots', request.id],
    queryFn: () => api.listSnapshots(request.id),
    refetchInterval: (qq) => ((qq.state.data ?? []).some((s) => s.status === 'pending' || s.export_status === 'running') ? 8000 : false),
  });
  const createM = useMutation({
    mutationFn: () => api.createSnapshot(request.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['snapshots', request.id] }); toast.success(t('snapshot.created')); },
    onError: () => toast.error(t('toast.error')),
  });
  const toggleM = useMutation({
    mutationFn: (en: boolean) => api.setSnapshotOnDelete(request.id, en),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['request', request.id] }),
    onError: () => toast.error(t('toast.error')),
  });

  const snaps = q.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{t('snapshot.hint')}</p>
        <Button variant="secondary" disabled={createM.isPending} onClick={() => createM.mutate()}>
          {createM.isPending ? <Spinner className="h-4 w-4" /> : null}
          {t('snapshot.create')}
        </Button>
      </div>

      <label className="flex items-center gap-2.5">
        <input
          type="checkbox"
          checked={!!request.snapshot_on_delete}
          onChange={(e) => toggleM.mutate(e.target.checked)}
          className="h-4 w-4 rounded border-border"
        />
        <span className="text-sm">{t('snapshot.autoLabel')}</span>
      </label>

      {snaps.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">{t('snapshot.empty')}</p>
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border">
          {snaps.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm">
              <div className="min-w-0">
                <div className="font-mono text-xs text-muted-foreground">{s.aws_snapshot_id ?? `#${s.id}`}</div>
                <div className="text-xs text-muted-foreground">{fmtDate(s.created_at)}{s.size_gb ? ` · ${s.size_gb} Go` : ''}</div>
              </div>
              <div className="flex items-center gap-3">
                {s.status === 'completed' && s.aws_snapshot_id && <ExportControls reqId={request.id} s={s} />}
                <SnapStatus s={s} />
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground">{t('snapshot.exportHint')}</p>
    </div>
  );
}
