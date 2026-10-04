// Mock database: in-memory collections persisted to db/data.json.
//
// Every function the API uses goes through the `db` object below. To switch to a real database,
// re-implement the same Collection interface on top of Supabase / Prisma / Firestore — the API routes
// and services won't need to change.
//
// Notes:
// - Server-only (uses the file system). Never import this from a client component.
// - Data is cached per server process; if you edit data.json by hand, restart `npm run dev`.
// - `npm run db:reset` deletes data.json; it's re-created from db/seed.ts on the next request.

import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { emptyDatabase, type DatabaseShape } from './schema';
import { createSeedData } from './seed';

const DATA_FILE = path.join(process.cwd(), 'db', 'data.json');

type CollectionName = keyof DatabaseShape;
type RecordOf<K extends CollectionName> = DatabaseShape[K][number];

const globalForDb = globalThis as unknown as { __habitflowDb?: DatabaseShape };

function persist(data: DatabaseShape): void {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    // Read-only file systems (e.g. some serverless hosts) keep working in memory only.
    console.warn('[mock-db] Could not write data.json, continuing in memory:', err);
  }
}

function load(): DatabaseShape {
  if (globalForDb.__habitflowDb) return globalForDb.__habitflowDb;
  let data: DatabaseShape;
  try {
    data = { ...emptyDatabase(), ...JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) };
  } catch {
    data = createSeedData();
    persist(data);
    console.info('[mock-db] Created db/data.json with demo data (demo@habitflow.ru / demo12345).');
  }
  globalForDb.__habitflowDb = data;
  return data;
}

// Records are cloned on the way in and out so callers can't accidentally change stored data
// without going through update() (which is what persists changes).
const clone = <T,>(value: T): T => structuredClone(value);

export interface Collection<T extends { id: string }> {
  all(): T[];
  find(predicate: (item: T) => boolean): T[];
  findOne(predicate: (item: T) => boolean): T | undefined;
  findById(id: string): T | undefined;
  insert(item: Omit<T, 'id'> & { id?: string }): T;
  update(id: string, patch: Partial<Omit<T, 'id'>>): T | undefined;
  remove(id: string): boolean;
  removeWhere(predicate: (item: T) => boolean): number;
}

function collection<K extends CollectionName>(name: K): Collection<RecordOf<K>> {
  type T = RecordOf<K>;
  const rows = (): T[] => load()[name] as T[];
  const setRows = (next: T[]) => {
    const data = load();
    (data as unknown as Record<CollectionName, unknown[]>)[name] = next;
    persist(data);
  };

  return {
    all: () => clone(rows()),
    find: (predicate) => clone(rows().filter(predicate)),
    findOne: (predicate) => {
      const found = rows().find(predicate);
      return found ? clone(found) : undefined;
    },
    findById: (id) => {
      const found = rows().find((r) => r.id === id);
      return found ? clone(found) : undefined;
    },
    insert: (item) => {
      const record = { ...clone(item), id: item.id ?? randomUUID() } as T;
      setRows([...rows(), record]);
      return clone(record);
    },
    update: (id, patch) => {
      let updated: T | undefined;
      setRows(
        rows().map((r) => {
          if (r.id !== id) return r;
          updated = { ...r, ...clone(patch), id } as T;
          return updated;
        }),
      );
      return updated ? clone(updated) : undefined;
    },
    remove: (id) => {
      const before = rows();
      const next = before.filter((r) => r.id !== id);
      if (next.length === before.length) return false;
      setRows(next);
      return true;
    },
    removeWhere: (predicate) => {
      const before = rows();
      const next = before.filter((r) => !predicate(r));
      if (next.length !== before.length) setRows(next);
      return before.length - next.length;
    },
  };
}

export const db = {
  users: collection('users'),
  sessions: collection('sessions'),
  habits: collection('habits'),
  completions: collection('completions'),
  waterEntries: collection('waterEntries'),
};

export type Db = typeof db;
