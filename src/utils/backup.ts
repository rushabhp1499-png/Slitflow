// Full backup to one Excel file and restore from it (owner/developer only).
// The file has readable sheets for people, plus a hidden "Backup data" sheet
// holding every database record exactly, which is what Restore reads back.
import { getSupabase, errorMessage } from '../lib/supabase';
import { Customer, FloorStaff, Machine, MaterialInward } from '../types';
import { addJobSheets, addReadableSheet } from './excelExport';
import { BACKUP_TABLES, BackupRecord, BackupTable, SHEET, planRestore, recordsToRows, rowsToRecords } from './backupFormat';

async function readAll(): Promise<BackupRecord[]> {
  const sb = getSupabase();
  const out: BackupRecord[] = [];
  for (const t of BACKUP_TABLES) {
    const { data, error } = await sb.from(t.table).select(t.columns).order(t.key);
    if (error) throw new Error(`${t.table}: ${errorMessage(error)}`);
    for (const row of (data || []) as unknown as Record<string, unknown>[]) {
      out.push({ table: t.table, key: String(row[t.key]), row });
    }
  }
  return out;
}

export async function downloadFullBackup(): Promise<string> {
  const XLSX = await import('xlsx');
  const records = await readAll();
  const of = (t: BackupTable) => records.filter((r) => r.table === t).map((r) => r.row.data as Record<string, unknown>);
  const jobs = of('jobs') as unknown as MaterialInward[];
  const customers = of('customers') as unknown as Customer[];
  const machines = of('machines') as unknown as Machine[];
  const staff = of('floor_staff') as unknown as FloorStaff[];

  const book = XLSX.utils.book_new();
  addJobSheets(XLSX, book, jobs, machines, staff);
  const custRows = customers.map((c) => ({
    Company: c.companyName,
    GSTIN: c.gstNumber || '',
    'Contact Person': c.contactPerson || '',
    Phone: c.phone || '',
    Email: c.email || '',
    'Login Emails': (c.authorizedEmails || []).join(', '),
    'Registered Address': c.registeredAddress || '',
    'Plant Address': c.plantAddress || '',
    City: c.city || '',
    State: c.state || '',
    'Keeps Stock With Us': c.keepsStock ? 'Yes' : '',
  }));
  addReadableSheet(XLSX, book, custRows, 'Customers', Object.keys(custRows[0] || { Company: '' }));

  const raw = XLSX.utils.aoa_to_sheet(recordsToRows(records));
  XLSX.utils.book_append_sheet(book, raw, SHEET);
  book.Workbook = { Sheets: book.SheetNames.map((name) => ({ name, Hidden: name === SHEET ? 1 : 0 })) } as typeof book.Workbook;

  const stamp = new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', '-');
  XLSX.writeFile(book, `PE-Portal-Backup-${stamp}.xlsx`);
  return `Backup downloaded: ${jobs.length} orders, ${customers.length} customers. Save it in OneDrive.`;
}

export async function readBackupFile(file: File): Promise<BackupRecord[]> {
  const XLSX = await import('xlsx');
  const book = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  const sheet = book.Sheets[SHEET];
  if (!sheet) {
    throw new Error('This file is not a full backup. Use a file made with "Download full backup" (the per-customer Excel cannot be restored).');
  }
  try {
    return rowsToRecords(XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: '' }));
  } catch {
    throw new Error('The backup data in this file is damaged and cannot be read.');
  }
}

export async function checkRestore(file: File) {
  const backup = await readBackupFile(file);
  return { backup, ...planRestore(backup, await readAll()) };
}

// Writes records back, table by table in the safe order. Returns a list of problems (empty = all good).
export async function writeRestore(missing: BackupRecord[], replace: BackupRecord[]): Promise<string[]> {
  const sb = getSupabase();
  const problems: string[] = [];
  for (const t of BACKUP_TABLES) {
    for (const r of missing.filter((m) => m.table === t.table)) {
      const { error } = await sb.from(t.table).insert(r.row);
      if (error) problems.push(`${t.table} ${r.key}: ${errorMessage(error)}`);
    }
    for (const r of replace.filter((m) => m.table === t.table)) {
      const { [t.key]: _key, ...rest } = r.row;
      const { error } = await sb.from(t.table).update(rest).eq(t.key, r.key);
      if (error) problems.push(`${t.table} ${r.key}: ${errorMessage(error)}`);
    }
  }
  return problems;
}
