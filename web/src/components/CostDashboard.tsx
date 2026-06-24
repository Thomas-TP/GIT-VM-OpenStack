import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../api';
import type { CostBucket, PresetCatalog } from '../types';
import { Card, Spinner } from '../ui';
import { OsIcon } from './OsIcon';

const chf = (n: number) =>
  (n ?? 0).toLocaleString('fr-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' CHF';

function StatTile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <Card className="p-4">
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-2 text-2xl font-semibold tracking-tight tabular-nums ${accent ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
        {value}
      </div>
    </Card>
  );
}

// Horizontal bar breakdown (cost per bucket).
function Bars({ title, rows, render }: { title: string; rows: CostBucket[]; render?: (key: string) => React.ReactNode }) {
  const max = Math.max(1, ...rows.map((r) => r.cost));
  return (
    <Card className="p-5">
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      {rows.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">—</p>
      ) : (
        <div className="space-y-2.5">
          {rows.slice(0, 10).map((r) => (
            <div key={r.key} className="space-y-1">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="flex min-w-0 items-center gap-2 truncate text-muted-foreground">{render ? render(r.key) : r.key}</span>
                <span className="shrink-0 font-semibold tabular-nums">{chf(r.cost)}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-foreground/70" style={{ width: `${(r.cost / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// 30-day cost column chart (pure SVG).
function DailyChart({ daily }: { daily: { day: string; cost: number }[] }) {
  const { t } = useTranslation();
  const max = Math.max(0.01, ...daily.map((d) => d.cost));
  const W = 720, H = 140, n = daily.length, gap = 2;
  const bw = (W - gap * (n - 1)) / n;
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t('cost.daily')}</h3>
        <span className="text-xs text-muted-foreground">{t('cost.dailyMax')}: {chf(max)}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-36 w-full" preserveAspectRatio="none">
        {daily.map((d, i) => {
          const h = (d.cost / max) * (H - 18);
          return (
            <g key={d.day}>
              <rect x={i * (bw + gap)} y={H - 14 - h} width={bw} height={Math.max(0, h)} rx={1} className="fill-foreground/70">
                <title>{d.day}: {chf(d.cost)}</title>
              </rect>
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>{daily[0]?.day}</span>
        <span>{daily[daily.length - 1]?.day}</span>
      </div>
    </Card>
  );
}

export function CostDashboard() {
  const { t } = useTranslation();
  const costQ = useQuery({ queryKey: ['admin-cost'], queryFn: api.adminCost, refetchInterval: 30000 });
  const presetsQ = useQuery({ queryKey: ['presets'], queryFn: api.presets });

  const cat: PresetCatalog | undefined = presetsQ.data;
  const { osLabel, osFamily, perfLabel } = useMemo(() => {
    const osMap = new Map((cat?.os ?? []).map((o) => [o.id, o]));
    const perfMap = new Map((cat?.perf ?? []).map((p) => [p.id, p]));
    return {
      osLabel: (id: string) => osMap.get(id)?.label ?? id,
      osFamily: (id: string) => osMap.get(id)?.family,
      perfLabel: (id: string) => perfMap.get(id)?.label ?? id,
    };
  }, [cat]);

  const typeLabel = (ty: string) => {
    if (ty === 'instance_up') return t('cost.tInstanceUp');
    if (ty === 'instance_reserved') return t('cost.tInstanceReserved');
    if (ty === 'software_licence') return t('cost.tLicence');
    if (ty.startsWith('network')) return t('cost.tNetwork');
    if (ty.startsWith('volume')) return t('cost.tVolume');
    if (ty.startsWith('storage')) return t('cost.tStorage');
    return ty;
  };

  if (costQ.isLoading) return <div className="grid place-items-center py-16"><Spinner className="h-6 w-6" /></div>;
  const r = costQ.data;
  if (!r) return <p className="py-10 text-center text-sm text-muted-foreground">{t('common.error')}</p>;
  const s = r.summary;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{t('cost.title')}</h2>
        <p className="text-sm text-muted-foreground">{t('cost.hint')}</p>
      </div>

      {/* Real billed cost (CloudKitty) */}
      {r.real.available ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatTile label={t('cost.realMonth')} value={chf(r.real.monthTotal ?? 0)} accent />
            <StatTile label={t('cost.realAllTime')} value={chf(r.real.allTimeTotal ?? 0)} />
            <StatTile label={t('cost.realSource')} value="CloudKitty ✓" />
          </div>
          <Bars
            title={t('cost.realByType')}
            rows={(r.real.byType ?? []).map((x) => ({ key: x.type, cost: x.rate, vms: 0 }))}
            render={(k) => <span className="truncate">{typeLabel(k)}</span>}
          />
        </div>
      ) : (
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">{t('cost.realNa')}</p>
        </Card>
      )}

      <div className="border-t border-border pt-4">
        <h3 className="text-sm font-semibold tracking-tight">{t('cost.estTitle')}</h3>
        <p className="text-xs text-muted-foreground">{t('cost.estHint')}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatTile label={t('cost.total')} value={chf(s.totalCost)} />
        <StatTile label={t('cost.month')} value={chf(s.currentMonthCost)} />
        <StatTile label={t('cost.projected')} value={chf(s.projectedMonthly)} accent />
        <StatTile label={t('cost.activeVms')} value={`${s.activeVms} / ${s.totalVms}`} />
        <StatTile label={t('cost.totalHours')} value={`${s.totalHours.toLocaleString('fr-CH')} h`} />
        <StatTile label={t('cost.split')} value={`${chf(s.computeCost)} + ${chf(s.storageCost)}`} />
      </div>

      <DailyChart daily={r.daily} />

      <div className="grid gap-4 lg:grid-cols-3">
        <Bars title={t('cost.byUser')} rows={r.byUser} />
        <Bars
          title={t('cost.byOs')}
          rows={r.byOs}
          render={(id) => (
            <>
              {osFamily(id) && <OsIcon family={osFamily(id)!} className="h-4 w-4" />}
              <span className="truncate">{osLabel(id)}</span>
            </>
          )}
        />
        <Bars title={t('cost.byPerf')} rows={r.byPerf} render={(id) => <span className="truncate">{perfLabel(id)}</span>} />
      </div>

      <Card className="p-5">
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t('cost.perVm')}</h3>
        {r.perVm.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">{t('cost.empty')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">{t('cost.colVm')}</th>
                  <th className="py-2 pr-3 font-medium">{t('cost.colOwner')}</th>
                  <th className="py-2 pr-3 font-medium">OS</th>
                  <th className="py-2 pr-3 font-medium">{t('cost.colPerf')}</th>
                  <th className="py-2 pr-3 font-medium">{t('cost.colDisk')}</th>
                  <th className="py-2 pr-3 text-right font-medium">{t('cost.colHours')}</th>
                  <th className="py-2 text-right font-medium">{t('cost.colCost')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {r.perVm.slice(0, 100).map((v) => (
                  <tr key={v.id}>
                    <td className="py-2 pr-3 font-medium">{v.name || `#${v.id}`}</td>
                    <td className="py-2 pr-3 truncate text-muted-foreground">{v.user_email}</td>
                    <td className="py-2 pr-3">
                      <span className="flex items-center gap-1.5">
                        {v.os && osFamily(v.os) && <OsIcon family={osFamily(v.os)!} className="h-4 w-4" />}
                        <span className="truncate text-muted-foreground">{v.os ? osLabel(v.os) : '—'}</span>
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-muted-foreground">{perfLabel(v.preset)}</td>
                    <td className="py-2 pr-3 tabular-nums text-muted-foreground">{cat?.storage.find((x) => x.id === v.storage)?.sizeGb ?? '?'} Go</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-muted-foreground">{v.hours.toLocaleString('fr-CH')}</td>
                    <td className="py-2 text-right font-semibold tabular-nums">{chf(v.cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="text-xs text-muted-foreground">{t('cost.note')}</p>
    </div>
  );
}
