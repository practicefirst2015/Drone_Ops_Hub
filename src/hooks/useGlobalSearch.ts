import { useState, useEffect, useCallback } from "react";
import { useOrg } from "@/contexts/OrgContext";
import { supabase } from "@/integrations/supabase/client";

export interface SearchResult {
  id: string;
  type: "project" | "mission" | "client" | "drone" | "pilot" | "invoice" | "flight_log";
  title: string;
  subtitle?: string;
  url: string;
}

const TYPE_LABELS: Record<SearchResult["type"], string> = {
  project: "Projects",
  mission: "Missions",
  client: "Clients",
  drone: "Drones",
  pilot: "Pilots",
  invoice: "Invoices",
  flight_log: "Flight Logs",
};

export function useGlobalSearch() {
  const { currentOrg } = useOrg();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(
    async (q: string) => {
      if (!currentOrg || q.trim().length < 2) {
        setResults([]);
        return;
      }
      setLoading(true);
      const pattern = `%${q.trim()}%`;
      const orgId = currentOrg.id;

      const [projects, missions, clients, drones, pilots, invoices, flightLogs] =
        await Promise.all([
          supabase
            .from("projects")
            .select("id, name, status")
            .eq("organization_id", orgId)
            .ilike("name", pattern)
            .limit(5),
          supabase
            .from("missions")
            .select("id, title, status")
            .eq("organization_id", orgId)
            .ilike("title", pattern)
            .limit(5),
          supabase
            .from("clients")
            .select("id, name, contact_name")
            .eq("organization_id", orgId)
            .ilike("name", pattern)
            .limit(5),
          supabase
            .from("drones")
            .select("id, name, model")
            .eq("organization_id", orgId)
            .ilike("name", pattern)
            .limit(5),
          supabase
            .from("profiles")
            .select("id, full_name")
            .ilike("full_name", pattern)
            .limit(5),
          supabase
            .from("invoices")
            .select("id, invoice_number, status, amount")
            .eq("organization_id", orgId)
            .ilike("invoice_number", pattern)
            .limit(5),
          supabase
            .from("flight_logs")
            .select("id, title, flight_date")
            .eq("organization_id", orgId)
            .ilike("title", pattern)
            .limit(5),
        ]);

      const all: SearchResult[] = [
        ...(projects.data || []).map((r) => ({
          id: r.id,
          type: "project" as const,
          title: r.name,
          subtitle: r.status,
          url: `/projects/${r.id}`,
        })),
        ...(missions.data || []).map((r) => ({
          id: r.id,
          type: "mission" as const,
          title: r.title,
          subtitle: r.status,
          url: `/missions?id=${r.id}`,
        })),
        ...(clients.data || []).map((r) => ({
          id: r.id,
          type: "client" as const,
          title: r.name,
          subtitle: r.contact_name || undefined,
          url: `/clients/${r.id}`,
        })),
        ...(drones.data || []).map((r) => ({
          id: r.id,
          type: "drone" as const,
          title: r.name,
          subtitle: r.model,
          url: `/drones`,
        })),
        ...(pilots.data || []).map((r) => ({
          id: r.id,
          type: "pilot" as const,
          title: r.full_name || "Unknown",
          url: `/skills`,
        })),
        ...(invoices.data || []).map((r) => ({
          id: r.id,
          type: "invoice" as const,
          title: r.invoice_number,
          subtitle: `$${Number(r.amount).toLocaleString()} · ${r.status}`,
          url: `/invoices/${r.id}`,
        })),
        ...(flightLogs.data || []).map((r) => ({
          id: r.id,
          type: "flight_log" as const,
          title: r.title,
          subtitle: r.flight_date,
          url: `/flight-logs/${r.id}`,
        })),
      ];

      setResults(all);
      setLoading(false);
    },
    [currentOrg],
  );

  useEffect(() => {
    const t = setTimeout(() => search(query), 300); // Increased from 200ms to 300ms
    return () => clearTimeout(t);
  }, [query, search]);

  const grouped = results.reduce(
    (acc, r) => {
      if (!acc[r.type]) acc[r.type] = [];
      acc[r.type].push(r);
      return acc;
    },
    {} as Record<string, SearchResult[]>,
  );

  return { query, setQuery, results, grouped, loading, typeLabels: TYPE_LABELS };
}
