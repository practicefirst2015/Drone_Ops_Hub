/**
 * Core offline hooks: connectivity detection, sync status, offline CRUD operations.
 */

import { useState, useEffect, useCallback, useSyncExternalStore } from "react";
import {
  offlineFlightLogs,
  offlineNotes,
  offlineFiles,
  cachedMissions,
  cachedChecklists,
  type OfflineFlightLog,
  type OfflineNote,
  type OfflineFile,
  type CachedMission,
} from "@/lib/offlineDb";
import { runSync, onSyncComplete, isSyncing, type SyncResult } from "@/lib/syncEngine";
import { toast } from "sonner";

// ─── Online/Offline Detection ───

function subscribeOnline(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

function getOnline() {
  return navigator.onLine;
}

export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribeOnline, getOnline, () => true);
}

// ─── Sync Manager ───

export function useSyncManager() {
  const online = useOnlineStatus();
  const [lastSync, setLastSync] = useState<SyncResult | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const refreshPending = useCallback(async () => {
    try {
      const [logs, notes, files] = await Promise.all([
        offlineFlightLogs.getPending(),
        offlineNotes.getPending(),
        offlineFiles.getPending(),
      ]);
      setPendingCount(logs.length + notes.length + files.length);
    } catch {
      // IndexedDB may fail in incognito
    }
  }, []);

  useEffect(() => {
    refreshPending();
    const interval = setInterval(refreshPending, 5000);
    return () => clearInterval(interval);
  }, [refreshPending]);

  useEffect(() => {
    const unsub = onSyncComplete((result) => {
      setLastSync(result);
      setSyncing(false);
      refreshPending();
    });
    return () => { unsub(); };
  }, [refreshPending]);

  // Auto-sync when coming online
  useEffect(() => {
    if (online && pendingCount > 0 && !isSyncing()) {
      triggerSync();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online, pendingCount]);

  const triggerSync = useCallback(async () => {
    if (!navigator.onLine) {
      toast.error("No internet connection");
      return;
    }
    setSyncing(true);
    try {
      const result = await runSync();
      const total = result.flightLogs.synced + result.notes.synced + result.files.synced;
      const errors = result.flightLogs.errors + result.notes.errors + result.files.errors;
      if (total > 0) toast.success(`Synced ${total} item${total > 1 ? "s" : ""}`);
      if (errors > 0) toast.error(`${errors} item${errors > 1 ? "s" : ""} failed to sync`);
    } catch {
      toast.error("Sync failed");
    }
    setSyncing(false);
  }, []);

  return { online, syncing, lastSync, pendingCount, triggerSync, refreshPending };
}

// ─── Offline Flight Log Operations ───

export function useOfflineFlightLogs() {
  const [logs, setLogs] = useState<OfflineFlightLog[]>([]);

  const refresh = useCallback(async () => {
    try {
      const all = await offlineFlightLogs.getAll();
      setLogs(all.sort((a, b) => b.createdAt - a.createdAt));
    } catch { /* */ }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const create = useCallback(async (data: Record<string, any>) => {
    const localId = `offline_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const log: OfflineFlightLog = {
      localId,
      data,
      status: "pending",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await offlineFlightLogs.put(log);
    await refresh();
    return log;
  }, [refresh]);

  const update = useCallback(async (localId: string, updates: Record<string, any>) => {
    const existing = await offlineFlightLogs.get(localId);
    if (!existing) return;
    const updated: OfflineFlightLog = {
      ...existing,
      data: { ...existing.data, ...updates },
      updatedAt: Date.now(),
      status: existing.status === "synced" ? "synced" : "pending",
    };
    await offlineFlightLogs.put(updated);
    await refresh();
  }, [refresh]);

  const remove = useCallback(async (localId: string) => {
    await offlineFlightLogs.delete(localId);
    await refresh();
  }, [refresh]);

  return { logs, create, update, remove, refresh };
}

// ─── Offline Notes ───

export function useOfflineNotes() {
  const [notes, setNotes] = useState<OfflineNote[]>([]);

  const refresh = useCallback(async () => {
    try {
      const all = await offlineNotes.getAll();
      setNotes(all.sort((a, b) => b.createdAt - a.createdAt));
    } catch { /* */ }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const save = useCallback(async (
    entityType: "mission" | "flight_log",
    entityId: string,
    field: string,
    value: string
  ) => {
    const localId = `note_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const note: OfflineNote = {
      localId,
      entityType,
      entityId,
      field,
      value,
      status: "pending",
      createdAt: Date.now(),
    };
    await offlineNotes.put(note);
    await refresh();
    return note;
  }, [refresh]);

  return { notes, save, refresh };
}

// ─── Offline File Queue ───

export function useOfflineFiles() {
  const [files, setFiles] = useState<OfflineFile[]>([]);

  const refresh = useCallback(async () => {
    try {
      const all = await offlineFiles.getAll();
      setFiles(all.sort((a, b) => b.createdAt - a.createdAt));
    } catch { /* */ }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const queue = useCallback(async (
    projectId: string,
    file: File,
    missionId?: string
  ) => {
    const localId = `file_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const entry: OfflineFile = {
      localId,
      projectId,
      missionId,
      fileName: file.name,
      mimeType: file.type,
      size: file.size,
      blob: file,
      status: "pending",
      createdAt: Date.now(),
    };
    await offlineFiles.put(entry);
    await refresh();
    return entry;
  }, [refresh]);

  return { files, queue, refresh };
}

// ─── Mission Cache ───

export function useCachedMissions(orgId: string | undefined) {
  const [missions, setMissions] = useState<CachedMission[]>([]);

  const refresh = useCallback(async () => {
    if (!orgId) return;
    try {
      const cached = await cachedMissions.getByOrg(orgId);
      setMissions(cached);
    } catch { /* */ }
  }, [orgId]);

  useEffect(() => { refresh(); }, [refresh]);

  return { missions, refresh };
}

export function useCacheMissionsEffect(missions: any[] | undefined, orgId: string | undefined) {
  useEffect(() => {
    if (missions && missions.length > 0 && orgId) {
      cachedMissions.cacheMany(missions, orgId).catch(() => {});
    }
  }, [missions, orgId]);
}
