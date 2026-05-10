import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { LoaderCircle, ShieldCheck, Trash2, UserCheck, UserX } from 'lucide-react';
import PageShell from '../components/shared/PageShell';
import { useAppContext } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { callInternalApi } from '../lib/internalApi';
import { cn } from '../lib/utils';

const statusClasses = {
  pending: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
  approved: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
  rejected: 'border-red-400/30 bg-red-400/10 text-red-200',
};

async function callAdminFunction(body) {
  const { data: sessionData } = await supabase.auth.getSession();

  return callInternalApi('/api/admin-users', body, {
    accessToken: sessionData.session?.access_token,
  });
}

export default function AdminPage() {
  const { isAdmin, isAuthLoading } = useAppContext();
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [confirmingId, setConfirmingId] = useState('');

  const stats = useMemo(
    () => ({
      total: users.length,
      pending: users.filter((user) => user.status === 'pending').length,
      approved: users.filter((user) => user.status === 'approved').length,
      rejected: users.filter((user) => user.status === 'rejected').length,
    }),
    [users],
  );

  const loadUsers = async () => {
    setError('');
    setLoading(true);

    try {
      const result = await callAdminFunction({ action: 'list' });
      setUsers(result.users || []);
    } catch (adminError) {
      setError(adminError.message || 'Unable to load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      void loadUsers();
    }
  }, [isAdmin]);

  const runAction = async (action, user) => {
    setBusyId(`${action}:${user.id}`);
    setError('');
    setMessage('');

    try {
      await callAdminFunction({ action, userId: user.id });
      setMessage(`${user.username} updated.`);
      setConfirmingId('');
      await loadUsers();
    } catch (adminError) {
      setError(adminError.message || 'Action failed.');
    } finally {
      setBusyId('');
    }
  };

  if (isAuthLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-electric-500/20 border-t-electric-300" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen px-4 py-8">
      <PageShell className="max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="nav-pill w-fit">
              <ShieldCheck className="h-4 w-4" />
              Admin
            </div>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white">
              Access Requests
            </h1>
          </div>
          <button type="button" onClick={loadUsers} className="btn-ghost">
            Refresh
          </button>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Object.entries(stats).map(([label, value]) => (
            <div key={label} className="surface-panel p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                {label}
              </p>
              <p className="mt-2 text-2xl font-extrabold text-white">{value}</p>
            </div>
          ))}
        </div>

        {message ? (
          <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {message}
          </div>
        ) : null}
        {error ? (
          <div className="mb-4 rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        ) : null}

        <div className="surface-panel overflow-hidden">
          {loading ? (
            <div className="flex items-center gap-2 p-6 text-sm text-electric-200">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Loading users...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-white/5 text-xs uppercase tracking-[0.2em] text-slate-500">
                  <tr>
                    <th className="px-4 py-4 font-semibold">Username</th>
                    <th className="px-4 py-4 font-semibold">Email</th>
                    <th className="px-4 py-4 font-semibold">Status</th>
                    <th className="px-4 py-4 font-semibold">Date Requested</th>
                    <th className="px-4 py-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {users.map((user) => (
                    <tr key={user.id} className="text-slate-200">
                      <td className="px-4 py-4 font-medium">{user.username}</td>
                      <td className="px-4 py-4 text-slate-400">{user.email}</td>
                      <td className="px-4 py-4">
                        <span
                          className={cn(
                            'inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize',
                            statusClasses[user.status] || statusClasses.pending,
                          )}
                        >
                          {user.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-slate-400">
                        {new Date(user.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-4">
                        {confirmingId === user.id ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs text-slate-400">
                              Delete {user.username}? This cannot be undone.
                            </span>
                            <button
                              type="button"
                              className="btn-danger px-3 py-2"
                              disabled={busyId === `delete:${user.id}`}
                              onClick={() => runAction('delete', user)}
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              className="btn-ghost px-3 py-2"
                              onClick={() => setConfirmingId('')}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              className="btn-ghost px-3 py-2"
                              disabled={busyId === `approve:${user.id}`}
                              onClick={() => runAction('approve', user)}
                            >
                              <UserCheck className="h-4 w-4" />
                              Approve
                            </button>
                            <button
                              type="button"
                              className="btn-ghost px-3 py-2"
                              disabled={busyId === `reject:${user.id}`}
                              onClick={() => runAction('reject', user)}
                            >
                              <UserX className="h-4 w-4" />
                              Reject
                            </button>
                            <button
                              type="button"
                              className="btn-danger px-3 py-2"
                              onClick={() => setConfirmingId(user.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete User
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </PageShell>
    </div>
  );
}
