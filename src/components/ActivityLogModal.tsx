import React, { useEffect, useMemo, useState } from 'react';
import { getSupabase, errorMessage } from '../lib/supabase';
import { X, Search, History, ChevronDown, ChevronRight, AlertCircle } from 'lucide-react';

interface AuditEntry {
  id: number;
  at: string;
  actor_email: string | null;
  actor_name: string | null;
  actor_role: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  ref: string | null;
  summary: string;
  details: unknown;
}

const GROUPS: Array<{ key: string; label: string; match: (a: string) => boolean }> = [
  { key: 'all', label: 'Everything', match: () => true },
  { key: 'machines', label: 'Machine assignment', match: (a) => a === 'machine_assigned' },
  { key: 'po', label: 'PO closed / reopened', match: (a) => a === 'po_closed' || a === 'po_reopened' },
  { key: 'challans', label: 'Challans', match: (a) => a.startsWith('challan_') },
  { key: 'amend', label: 'PO amendments', match: (a) => a.startsWith('change_') || a === 'order_edited' },
  { key: 'bundles', label: 'Bundles', match: (a) => a.startsWith('bundle_') },
  { key: 'setup', label: 'Customers, machines, staff', match: (a) => /^(customers|machines|floor_staff)_/.test(a) },
  { key: 'whatsapp', label: 'WhatsApp messages', match: (a) => a.startsWith('whatsapp_') },
];

const ROLE_LABEL: Record<string, string> = {
  manager: 'Production Manager',
  owner: 'Top Management',
  developer: 'Developer',
  customer: 'Customer',
  system: 'System',
};

// Who did what and when. Written only by the database, so it can't be edited from here.
export const ActivityLogModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('all');
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    const sb = getSupabase();
    let cancelled = false;
    sb.from('audit_log')
      .select('*')
      .order('at', { ascending: false })
      .limit(1000)
      .then(({ data, error: err }) => {
        if (cancelled) return;
        if (err) {
          setError(
            /could not find the table|PGRST205/i.test(err.message + (err.code || ''))
              ? 'The activity log is not set up in the database yet. Run section 8 of supabase/schema.sql.'
              : errorMessage(err)
          );
        } else {
          setEntries((data || []) as AuditEntry[]);
        }
        setLoading(false);
      });
    const channel = sb
      .channel(`audit-${Date.now()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_log' }, (payload) => {
        setEntries((prev) => [payload.new as AuditEntry, ...prev]);
      })
      .subscribe();
    return () => {
      cancelled = true;
      void sb.removeChannel(channel);
    };
  }, []);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const g = GROUPS.find((x) => x.key === group) || GROUPS[0];
    return entries.filter(
      (e) =>
        g.match(e.action) &&
        (!q || [e.ref, e.summary, e.actor_name, e.actor_email].some((f) => (f || '').toLowerCase().includes(q)))
    );
  }, [entries, query, group]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden border border-slate-200 flex flex-col max-h-[94vh]">
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-base font-bold">Activity Log</h2>
              <p className="text-xs text-slate-400">Every change, who made it and when. Recorded by the database.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 sm:px-5 py-3 border-b border-slate-200 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search PO number, person, challan..."
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <select value={group} onChange={(e) => setGroup(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm">
            {GROUPS.map((g) => (
              <option key={g.key} value={g.key}>
                {g.label}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-y-auto">
          {loading ? (
            <p className="p-8 text-center text-sm text-slate-500">Loading...</p>
          ) : error ? (
            <div className="m-5 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-900 flex gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              {error}
            </div>
          ) : shown.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-500">Nothing recorded yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {shown.map((e) => (
                <div key={e.id} className="px-4 sm:px-5 py-2.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setOpen(open === e.id ? null : e.id)}
                    className="w-full grid grid-cols-[auto_1fr] sm:grid-cols-[150px_170px_120px_1fr] gap-x-3 gap-y-0.5 text-left items-start"
                  >
                    <span className="font-mono text-slate-500 flex items-center gap-1">
                      {e.details ? (open === e.id ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />) : <span className="w-3" />}
                      {new Date(e.at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                    <span className="font-semibold text-slate-900 truncate" title={e.actor_email || ''}>
                      {e.actor_name || e.actor_email}
                      <span className="block text-[10px] font-normal text-slate-500">{ROLE_LABEL[e.actor_role || ''] || e.actor_role}</span>
                    </span>
                    <span className="font-mono font-bold text-blue-800 truncate">{e.ref || '—'}</span>
                    <span className="text-slate-800 col-span-2 sm:col-span-1">{e.summary}</span>
                  </button>
                  {open === e.id && e.details && (
                    <pre className="mt-2 ml-4 p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] overflow-x-auto max-h-80">
                      {JSON.stringify(e.details, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
