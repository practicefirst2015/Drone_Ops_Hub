import { supabase } from "@/integrations/supabase/client";

export type ErrorSeverity = "warning" | "error" | "critical";
export type ErrorType = "runtime" | "query" | "network" | "render" | "validation";

export interface ErrorLogEntry {
  id: string;
  errorType: ErrorType;
  errorMessage: string;
  errorStack?: string;
  component?: string;
  queryKey?: string;
  url?: string;
  severity: ErrorSeverity;
  metadata?: Record<string, any>;
  timestamp: number;
}

const MAX_IN_MEMORY = 200;
const DEDUPE_WINDOW_MS = 5_000;

let inMemoryLogs: ErrorLogEntry[] = [];
let recentHashes = new Map<string, number>();
let counter = 0;

function hashEntry(msg: string, component?: string): string {
  return `${msg}::${component || ""}`;
}

function isDuplicate(hash: string): boolean {
  const last = recentHashes.get(hash);
  if (last && Date.now() - last < DEDUPE_WINDOW_MS) return true;
  recentHashes.set(hash, Date.now());
  if (recentHashes.size > 100) {
    const oldest = Array.from(recentHashes.entries())
      .sort((a, b) => a[1] - b[1])
      .slice(0, 50);
    oldest.forEach(([k]) => recentHashes.delete(k));
  }
  return false;
}

export function logError(params: {
  errorType: ErrorType;
  errorMessage: string;
  errorStack?: string;
  component?: string;
  queryKey?: string;
  severity?: ErrorSeverity;
  metadata?: Record<string, any>;
  organizationId?: string;
}): ErrorLogEntry | null {
  const hash = hashEntry(params.errorMessage, params.component);
  if (isDuplicate(hash)) return null;

  const entry: ErrorLogEntry = {
    id: `err_${++counter}_${Date.now()}`,
    errorType: params.errorType,
    errorMessage: params.errorMessage.slice(0, 2000),
    errorStack: params.errorStack?.slice(0, 4000),
    component: params.component,
    queryKey: params.queryKey,
    url: window.location.pathname,
    severity: params.severity || "error",
    metadata: params.metadata,
    timestamp: Date.now(),
  };

  inMemoryLogs.unshift(entry);
  if (inMemoryLogs.length > MAX_IN_MEMORY) {
    inMemoryLogs = inMemoryLogs.slice(0, MAX_IN_MEMORY);
  }

  // Persist to DB (fire-and-forget)
  if (params.organizationId) {
    persistError(entry, params.organizationId);
  }

  return entry;
}

async function persistError(entry: ErrorLogEntry, organizationId: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("error_logs").insert({
      organization_id: organizationId,
      user_id: user.id,
      error_type: entry.errorType,
      error_message: entry.errorMessage,
      error_stack: entry.errorStack || null,
      component: entry.component || null,
      query_key: entry.queryKey || null,
      url: entry.url || null,
      severity: entry.severity,
      metadata: entry.metadata || {},
    });
  } catch {
    // Never let error logging break the app
  }
}

export function getInMemoryErrors(): ErrorLogEntry[] {
  return inMemoryLogs;
}

export function clearInMemoryErrors(): void {
  inMemoryLogs = [];
}

export function getErrorStats() {
  const now = Date.now();
  const last5min = inMemoryLogs.filter((e) => now - e.timestamp < 5 * 60_000);
  const lastHour = inMemoryLogs.filter((e) => now - e.timestamp < 60 * 60_000);

  return {
    total: inMemoryLogs.length,
    last5min: last5min.length,
    lastHour: lastHour.length,
    bySeverity: {
      critical: inMemoryLogs.filter((e) => e.severity === "critical").length,
      error: inMemoryLogs.filter((e) => e.severity === "error").length,
      warning: inMemoryLogs.filter((e) => e.severity === "warning").length,
    },
    byType: {
      runtime: inMemoryLogs.filter((e) => e.errorType === "runtime").length,
      query: inMemoryLogs.filter((e) => e.errorType === "query").length,
      network: inMemoryLogs.filter((e) => e.errorType === "network").length,
      render: inMemoryLogs.filter((e) => e.errorType === "render").length,
    },
  };
}
