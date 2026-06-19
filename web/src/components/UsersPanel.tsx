import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { Button, Spinner } from '../ui';

export function UsersPanel() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const usersQ = useQuery({ queryKey: ['admin-users'], queryFn: api.adminUsers });
  const roleM = useMutation({
    mutationFn: (v: { email: string; role: 'admin' | 'member' }) => api.setUserRole(v.email, v.role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const users = usersQ.data ?? [];

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3 font-medium">{t('table.user')}</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 text-right font-medium">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isAdmin = u.role === 'admin';
              const busy = roleM.isPending && roleM.variables?.email === u.email;
              return (
                <tr key={u.email} className="border-b border-border/70 transition last:border-0 hover:bg-muted/40">
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-0.5 text-xs font-medium ${
                        isAdmin ? 'text-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${isAdmin ? 'bg-blue-500' : 'bg-zinc-400'}`} />
                      {isAdmin ? t('role.admin') : t('role.member')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="secondary"
                      className="h-8"
                      disabled={busy}
                      onClick={() => roleM.mutate({ email: u.email, role: isAdmin ? 'member' : 'admin' })}
                    >
                      {busy ? <Spinner className="h-4 w-4" /> : null}
                      {isAdmin ? t('role.removeAdmin') : t('role.makeAdmin')}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
