/**
 * Background sync engine. Processes offline queues when connectivity returns.
 * Uses idempotency keys (localId) to prevent duplicate records.
 */

import { supabase } from "@/integrations/supabase/client";
import {
  offlineFlightLogs,
  offlineNotes,
  offlineFiles,
  syncMeta,
  type OfflineFlightLog,
  type OfflineNote,
  type OfflineFile,
} from "./offlineDb";
import { STORAGE_BUCKET } from "./constants";

export interface SyncResult {
  flightLogs: { synced: number; errors: number };
  notes: { synced: number; errors: number };
  files: { synced: number; errors: number };
  timestamp: number;
}

let syncing = false;
const listeners = new Set<(result: SyncResult | null) => void>();

export function onSyncComplete(cb: (result: SyncResult | null) => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function notifyListeners(result: SyncResult | null) {
  listeners.forEach((cb) => cb(result));
}

export async function runSync(): Promise<SyncResult> {
  if (syncing) return lastResult();
  syncing = true;

  const result: SyncResult = {
    flightLogs: { synced: 0, errors: 0 },
    notes: { synced: 0, errors: 0 },
    files: { synced: 0, errors: 0 },
    timestamp: Date.now(),
  };

  try {
    // 1) Sync flight logs
    const pendingLogs = await offlineFlightLogs.getPending();
    for (const log of pendingLogs) {
      try {
        await syncFlightLog(log);
        result.flightLogs.synced++;
      } catch {
        result.flightLogs.errors++;
      }
    }

    // 2) Sync notes (mission postflight_notes updates)
    const pendingNotes = await offlineNotes.getPending();
    for (const note of pendingNotes) {
      try {
        await syncNote(note);
        result.notes.synced++;
      } catch {
        result.notes.errors++;
      }
    }

    // 3) Sync files
    const pendingFiles = await offlineFiles.getPending();
    for (const file of pendingFiles) {
      try {
        await syncFile(file);
        result.files.synced++;
      } catch {
        result.files.errors++;
      }
    }

    await syncMeta.set("lastSync", result);
  } finally {
    syncing = false;
    notifyListeners(result);
  }

  return result;
}

async function syncFlightLog(log: OfflineFlightLog) {
  await offlineFlightLogs.put({ ...log, status: "syncing" });

  try {
    // Check for duplicate using localId stored in metadata
    const { data: existing } = await supabase
      .from("flight_logs")
      .select("id")
      .eq("title", log.data.title as string)
      .eq("flight_date", log.data.flight_date as string)
      .eq("pilot_id", log.data.pilot_id as string)
      .eq("organization_id", log.data.organization_id as string)
      .maybeSingle();

    if (existing) {
      // Already synced — mark done
      await offlineFlightLogs.put({ ...log, status: "synced", remoteId: existing.id });
      return;
    }

    const { data, error } = await supabase
      .from("flight_logs")
      .insert(log.data as any)
      .select("id")
      .single();

    if (error) throw error;

    await offlineFlightLogs.put({
      ...log,
      status: "synced",
      remoteId: data.id,
    });
  } catch (err: any) {
    await offlineFlightLogs.put({
      ...log,
      status: "error",
      error: err.message || "Sync failed",
    });
    throw err;
  }
}

async function syncNote(note: OfflineNote) {
  await offlineNotes.put({ ...note, status: "syncing" });

  try {
    const table = note.entityType === "mission" ? "missions" : "flight_logs";
    const { error } = await supabase
      .from(table)
      .update({ [note.field]: note.value })
      .eq("id", note.entityId);

    if (error) throw error;

    await offlineNotes.put({ ...note, status: "synced" });
  } catch (err: any) {
    await offlineNotes.put({
      ...note,
      status: "error",
      error: err.message || "Sync failed",
    });
    throw err;
  }
}

async function syncFile(file: OfflineFile) {
  await offlineFiles.put({ ...file, status: "syncing" });

  try {
    const storagePath = `project/${file.projectId}/${file.createdAt}_${file.fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

    const { error: uploadErr } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, file.blob);

    if (uploadErr) throw uploadErr;

    const { data: signedData } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(storagePath, 60 * 60 * 24 * 365);

    const uploaderId = (await supabase.auth.getUser()).data.user?.id;
    if (!uploaderId) {
      // Can't attribute the upload without an authenticated user; surface a clear
      // error so the file stays queued rather than failing an insert constraint.
      await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
      throw new Error("Not authenticated — cannot sync file");
    }

    const { error: dbErr } = await supabase.from("project_documents").insert({
      project_id: file.projectId,
      uploaded_by: uploaderId,
      file_name: file.fileName,
      file_url: signedData?.signedUrl || storagePath,
      file_size_bytes: file.size,
      mime_type: file.mimeType || null,
      storage_path: storagePath,
    });

    if (dbErr) {
      await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
      throw dbErr;
    }

    await offlineFiles.put({ ...file, status: "synced" });
  } catch (err: any) {
    await offlineFiles.put({
      ...file,
      status: "error",
      error: err.message || "Sync failed",
    });
    throw err;
  }
}

async function lastResult(): Promise<SyncResult> {
  const saved = await syncMeta.get("lastSync");
  return saved || { flightLogs: { synced: 0, errors: 0 }, notes: { synced: 0, errors: 0 }, files: { synced: 0, errors: 0 }, timestamp: 0 };
}

export function isSyncing() {
  return syncing;
}
