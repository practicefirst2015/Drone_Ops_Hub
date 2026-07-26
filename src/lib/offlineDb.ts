/**
 * IndexedDB-backed offline storage for field operations.
 * Stores cached missions, offline flight logs, notes, file queue, and sync metadata.
 */

const DB_NAME = "airframe_offline";
const DB_VERSION = 1;

export interface OfflineFlightLog {
  localId: string;
  remoteId?: string;
  data: Record<string, any>;
  status: "pending" | "syncing" | "synced" | "error";
  error?: string;
  createdAt: number;
  updatedAt: number;
}

export interface OfflineNote {
  localId: string;
  entityType: "mission" | "flight_log";
  entityId: string;
  field: string;
  value: string;
  status: "pending" | "syncing" | "synced" | "error";
  error?: string;
  createdAt: number;
}

export interface OfflineFile {
  localId: string;
  projectId: string;
  missionId?: string;
  fileName: string;
  mimeType: string;
  size: number;
  blob: Blob;
  status: "pending" | "syncing" | "synced" | "error";
  error?: string;
  createdAt: number;
}

export interface CachedMission {
  id: string;
  orgId: string;
  data: any;
  cachedAt: number;
}

export interface CachedChecklist {
  missionId: string;
  items: any[];
  cachedAt: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains("cached_missions")) {
        const ms = db.createObjectStore("cached_missions", { keyPath: "id" });
        ms.createIndex("orgId", "orgId", { unique: false });
      }
      if (!db.objectStoreNames.contains("cached_checklists")) {
        db.createObjectStore("cached_checklists", { keyPath: "missionId" });
      }
      if (!db.objectStoreNames.contains("offline_flight_logs")) {
        const fl = db.createObjectStore("offline_flight_logs", { keyPath: "localId" });
        fl.createIndex("status", "status", { unique: false });
      }
      if (!db.objectStoreNames.contains("offline_notes")) {
        const n = db.createObjectStore("offline_notes", { keyPath: "localId" });
        n.createIndex("status", "status", { unique: false });
      }
      if (!db.objectStoreNames.contains("offline_files")) {
        const f = db.createObjectStore("offline_files", { keyPath: "localId" });
        f.createIndex("status", "status", { unique: false });
      }
      if (!db.objectStoreNames.contains("sync_meta")) {
        db.createObjectStore("sync_meta", { keyPath: "key" });
      }
    };
  });
}

// Generic helpers
async function getAll<T>(storeName: string): Promise<T[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

async function getByKey<T>(storeName: string, key: string): Promise<T | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

async function put<T>(storeName: string, item: T): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    store.put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function deleteByKey(storeName: string, key: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    store.delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getAllByIndex<T>(storeName: string, indexName: string, value: IDBValidKey): Promise<T[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const idx = store.index(indexName);
    const req = idx.getAll(value);
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

// ─── Cached Missions ───
export const cachedMissions = {
  getAll: () => getAll<CachedMission>("cached_missions"),
  getByOrg: (orgId: string) => getAllByIndex<CachedMission>("cached_missions", "orgId", orgId),
  get: (id: string) => getByKey<CachedMission>("cached_missions", id),
  put: (mission: CachedMission) => put("cached_missions", mission),
  delete: (id: string) => deleteByKey("cached_missions", id),
  async cacheMany(missions: any[], orgId: string) {
    const db = await openDb();
    const tx = db.transaction("cached_missions", "readwrite");
    const store = tx.objectStore("cached_missions");
    const now = Date.now();
    for (const m of missions) {
      store.put({ id: m.id, orgId, data: m, cachedAt: now });
    }
    return new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },
};

// ─── Cached Checklists ───
export const cachedChecklists = {
  get: (missionId: string) => getByKey<CachedChecklist>("cached_checklists", missionId),
  put: (item: CachedChecklist) => put("cached_checklists", item),
};

// ─── Offline Flight Logs ───
export const offlineFlightLogs = {
  getAll: () => getAll<OfflineFlightLog>("offline_flight_logs"),
  getPending: () => getAllByIndex<OfflineFlightLog>("offline_flight_logs", "status", "pending"),
  get: (localId: string) => getByKey<OfflineFlightLog>("offline_flight_logs", localId),
  put: (log: OfflineFlightLog) => put("offline_flight_logs", log),
  delete: (localId: string) => deleteByKey("offline_flight_logs", localId),
};

// ─── Offline Notes ───
export const offlineNotes = {
  getAll: () => getAll<OfflineNote>("offline_notes"),
  getPending: () => getAllByIndex<OfflineNote>("offline_notes", "status", "pending"),
  put: (note: OfflineNote) => put("offline_notes", note),
  delete: (localId: string) => deleteByKey("offline_notes", localId),
};

// ─── Offline Files ───
export const offlineFiles = {
  getAll: () => getAll<OfflineFile>("offline_files"),
  getPending: () => getAllByIndex<OfflineFile>("offline_files", "status", "pending"),
  put: (file: OfflineFile) => put("offline_files", file),
  delete: (localId: string) => deleteByKey("offline_files", localId),
};

// ─── Sync Meta ───
export const syncMeta = {
  get: async (key: string): Promise<any> => {
    const item = await getByKey<{ key: string; value: any }>("sync_meta", key);
    return item?.value;
  },
  set: (key: string, value: any) => put("sync_meta", { key, value }),
};
