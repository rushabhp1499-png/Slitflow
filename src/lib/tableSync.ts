import { getSupabase, errorMessage } from './supabase';

export interface SyncedRow<T> {
  id: string;
  data: T;
  updated_at: string;
}

interface TableSyncOptions<T extends { id: string }> {
  table: 'jobs' | 'customers';
  // Extra columns stored next to `data` (e.g. customer_id for jobs).
  toColumns: (item: T) => Record<string, unknown>;
  // Cleans an item before it is saved (e.g. removes passwords).
  prepare?: (item: T) => T;
  getLocal: () => T[];
  setLocal: (updater: (prev: T[]) => T[]) => void;
  canInsert: () => boolean;
  canUpdate: () => boolean;
  onError: (message: string) => void;
}

/**
 * Keeps a React state array in step with a Supabase table that stores each
 * record as { id, data, updated_at }.
 *
 * The app keeps changing its state exactly as before; after every change
 * `syncAll()` saves whichever records differ from what the database last
 * returned. Updates only succeed if nobody else saved the record in the
 * meantime (checked with updated_at), so two devices can never silently
 * overwrite each other's work.
 */
export class TableSync<T extends { id: string }> {
  private known = new Map<string, { json: string; updatedAt: string }>();
  private inFlight = new Set<string>();
  private dirty = new Set<string>();
  private generation = 0;

  constructor(private opts: TableSyncOptions<T>) {}

  reset() {
    this.known.clear();
    this.inFlight.clear();
    this.dirty.clear();
    this.generation++;
  }

  // Records the rows just loaded from the database and returns their data.
  seed(rows: SyncedRow<T>[]): T[] {
    for (const row of rows) {
      this.known.set(row.id, { json: JSON.stringify(row.data), updatedAt: row.updated_at });
    }
    return rows.map(r => r.data);
  }

  syncAll() {
    for (const item of this.opts.getLocal()) {
      const known = this.known.get(item.id);
      if (!known || known.json !== JSON.stringify(item)) {
        void this.flush(item.id);
      }
    }
  }

  // Called when Realtime reports a change made elsewhere.
  receiveRemote(id: string) {
    if (this.inFlight.has(id) || this.dirty.has(id)) return;
    void this.refresh(id, true);
  }

  async refresh(id: string, skipIfUnchanged = false) {
    const gen = this.generation;
    const { data, error } = await getSupabase()
      .from(this.opts.table)
      .select('id, data, updated_at')
      .eq('id', id)
      .maybeSingle();
    if (gen !== this.generation) return;
    if (error) {
      this.opts.onError(`Could not load the latest data: ${errorMessage(error)}`);
      return;
    }
    if (!data) {
      this.known.delete(id);
      this.opts.setLocal(prev => prev.filter(i => i.id !== id));
      return;
    }
    const row = data as SyncedRow<T>;
    if (skipIfUnchanged && this.known.get(id)?.updatedAt === row.updated_at) return;
    this.known.set(id, { json: JSON.stringify(row.data), updatedAt: row.updated_at });
    this.opts.setLocal(prev => {
      const idx = prev.findIndex(i => i.id === id);
      if (idx === -1) return [row.data, ...prev];
      const next = prev.slice();
      next[idx] = row.data;
      return next;
    });
  }

  private async flush(id: string) {
    if (this.inFlight.has(id)) {
      this.dirty.add(id);
      return;
    }
    const item = this.opts.getLocal().find(i => i.id === id);
    if (!item) return;
    const sentJson = JSON.stringify(item);
    const known = this.known.get(id);
    if (known && known.json === sentJson) return;
    if (known ? !this.opts.canUpdate() : !this.opts.canInsert()) return;

    const prepared = this.opts.prepare ? this.opts.prepare(item) : item;
    const payload = { data: prepared, ...this.opts.toColumns(prepared) };
    const gen = this.generation;
    this.inFlight.add(id);
    try {
      const table = getSupabase().from(this.opts.table);
      if (!known) {
        const { data, error } = await table
          .insert({ id, ...payload })
          .select('id, data, updated_at')
          .single();
        if (gen !== this.generation) return;
        if (error) {
          this.opts.setLocal(prev => prev.filter(i => i.id !== id));
          this.opts.onError(`Could not save the new record: ${errorMessage(error)}`);
          return;
        }
        this.accept(data as SyncedRow<T>, sentJson);
      } else {
        const { data, error } = await table
          .update(payload)
          .eq('id', id)
          .eq('updated_at', known.updatedAt)
          .select('id, data, updated_at');
        if (gen !== this.generation) return;
        if (error) {
          this.opts.onError(`Could not save your change: ${errorMessage(error)}`);
          await this.refresh(id);
          return;
        }
        if (!data || data.length === 0) {
          this.opts.onError(
            'This record was changed on another device at the same moment. The latest version has been loaded - please check it and redo your last change if needed.'
          );
          await this.refresh(id);
          return;
        }
        this.accept(data[0] as SyncedRow<T>, sentJson);
      }
    } catch (e) {
      if (gen === this.generation) this.opts.onError(`Could not reach the database: ${errorMessage(e)}`);
    } finally {
      this.inFlight.delete(id);
      if (this.dirty.delete(id) && gen === this.generation) void this.flush(id);
    }
  }

  // Store what the server saved (it may add the real job number etc.), unless
  // the user has already made another change that is about to be saved.
  private accept(row: SyncedRow<T>, sentJson: string) {
    this.known.set(row.id, { json: JSON.stringify(row.data), updatedAt: row.updated_at });
    this.opts.setLocal(prev => {
      const idx = prev.findIndex(i => i.id === row.id);
      if (idx === -1) return prev;
      if (JSON.stringify(prev[idx]) !== sentJson) return prev;
      const next = prev.slice();
      next[idx] = row.data;
      return next;
    });
  }
}
