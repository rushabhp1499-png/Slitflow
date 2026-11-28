// The layout of the hidden "Backup data" sheet, kept free of database code so it can be tested on its own.

// Restore order matters: customers before the orders that point at them.
export const BACKUP_TABLES = [
  { table: 'customers', key: 'id', columns: 'id, data' },
  { table: 'machines', key: 'id', columns: 'id, data' },
  { table: 'floor_staff', key: 'id', columns: 'id, data' },
  { table: 'staff_emails', key: 'email', columns: 'email, staff_role, display_name' },
  { table: 'jobs', key: 'id', columns: 'id, customer_id, data' },
] as const;
export type BackupTable = (typeof BACKUP_TABLES)[number]['table'];
export type BackupRecord = { table: BackupTable; key: string; row: Record<string, unknown> };

export const SHEET = 'Backup data';
const CHUNK = 30000; // an Excel cell holds at most 32,767 characters
const HEADER = ['Table', 'Key', 'Parts', 'Record'];

// One line per record; long records are split across the columns after "Record".
export function recordsToRows(records: BackupRecord[]): (string | number)[][] {
  return [
    HEADER,
    ...records.map((r) => {
      const json = JSON.stringify(r.row);
      const parts: string[] = [];
      for (let i = 0; i < json.length; i += CHUNK) parts.push(json.slice(i, i + CHUNK));
      return [r.table, r.key, parts.length, ...parts];
    }),
  ];
}

export function rowsToRecords(rows: unknown[][]): BackupRecord[] {
  const known = new Set<string>(BACKUP_TABLES.map((t) => t.table));
  if (!rows.length || String(rows[0][0]) !== 'Table') throw new Error('bad header');
  return rows.slice(1).flatMap((r) => {
    const table = String(r[0] ?? '');
    if (!known.has(table)) return [];
    const parts = Number(r[2]) || 0;
    const json = r.slice(3, 3 + parts).map((p) => String(p ?? '')).join('');
    return [{ table: table as BackupTable, key: String(r[1] ?? ''), row: JSON.parse(json) as Record<string, unknown> }];
  });
}

// What a restore would do: records missing from the portal, and records that differ from the backup.
export function planRestore(backup: BackupRecord[], current: BackupRecord[]) {
  const now = new Map(current.map((r) => [`${r.table}|${r.key}`, JSON.stringify(r.row)]));
  const missing: BackupRecord[] = [];
  const changed: BackupRecord[] = [];
  for (const r of backup) {
    const here = now.get(`${r.table}|${r.key}`);
    if (here === undefined) missing.push(r);
    else if (here !== JSON.stringify(r.row)) changed.push(r);
  }
  return { missing, changed };
}
