import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useMissionReadiness, MissionReadinessDimension } from "./useMissionReadiness";

/** Standard checklist template — items auto-generated per mission */
export const CHECKLIST_TEMPLATE = [
  { check_key: "location_confirmed", label: "Project location confirmed", is_critical: true, is_auto: true },
  { check_key: "operators_assigned", label: "Operators assigned", is_critical: true, is_auto: true },
  { check_key: "skills_covered", label: "Required skills covered", is_critical: true, is_auto: true },
  { check_key: "certs_valid", label: "Certifications valid", is_critical: true, is_auto: true },
  { check_key: "drone_assigned", label: "Drone assigned", is_critical: true, is_auto: true },
  { check_key: "capability_matched", label: "Required capabilities matched", is_critical: false, is_auto: true },
  { check_key: "notes_complete", label: "Mission notes complete", is_critical: false, is_auto: true },
  { check_key: "risk_reviewed", label: "Risk notes reviewed", is_critical: true, is_auto: false },
  { check_key: "flight_zone_defined", label: "Flight zone defined", is_critical: true, is_auto: true },
] as const;

/** Map readiness dimension keys to checklist keys */
const READINESS_TO_CHECKLIST: Record<string, string> = {
  location: "location_confirmed",
  operators: "operators_assigned",
  skills: "skills_covered",
  certs: "certs_valid",
  drones: "drone_assigned",
  capability: "capability_matched",
  planning: "notes_complete",
};

export interface ChecklistItem {
  id: string;
  mission_id: string;
  check_key: string;
  label: string;
  is_critical: boolean;
  is_auto: boolean;
  auto_status: string; // "ready" | "needs_review" | "blocked" | "pending"
  manual_checked: boolean;
  override_note: string | null;
  checked_by: string | null;
  checked_at: string | null;
}

export interface PreflightResult {
  items: ChecklistItem[];
  isLoading: boolean;
  goStatus: "go" | "no_go" | "pending";
  blockedReasons: string[];
  passedCount: number;
  totalCount: number;
}

export function usePreflightChecklist(missionId: string | undefined, mission?: any) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const readiness = useMissionReadiness(missionId, mission);

  // Fetch existing checklist items
  const { data: dbItems = [], isLoading } = useQuery({
    queryKey: ["preflight_checklist", missionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("preflight_checklist_items")
        .select("*")
        .eq("mission_id", missionId!);
      if (error) throw error;
      return data as ChecklistItem[];
    },
    enabled: !!missionId,
  });

  // Ensure checklist items exist (upsert template)
  const ensureChecklist = useMutation({
    mutationFn: async (mid: string) => {
      const rows = CHECKLIST_TEMPLATE.map((t) => ({
        mission_id: mid,
        check_key: t.check_key,
        label: t.label,
        is_critical: t.is_critical,
        is_auto: t.is_auto,
        auto_status: "pending",
        manual_checked: false,
      }));
      const { error } = await supabase
        .from("preflight_checklist_items")
        .upsert(rows, { onConflict: "mission_id,check_key", ignoreDuplicates: true });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["preflight_checklist", missionId] }),
  });

  // Toggle manual check
  const toggleCheck = useMutation({
    mutationFn: async ({ itemId, checked }: { itemId: string; checked: boolean }) => {
      const { error } = await supabase
        .from("preflight_checklist_items")
        .update({
          manual_checked: checked,
          checked_by: checked ? user?.id : null,
          checked_at: checked ? new Date().toISOString() : null,
        })
        .eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["preflight_checklist", missionId] }),
  });

  // Save override note
  const saveOverride = useMutation({
    mutationFn: async ({ itemId, note }: { itemId: string; note: string }) => {
      const { error } = await supabase
        .from("preflight_checklist_items")
        .update({ override_note: note || null })
        .eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["preflight_checklist", missionId] }),
  });

  // Merge auto-status from readiness dimensions into items
  const readinessMap = new Map<string, MissionReadinessDimension>();
  readiness.dimensions.forEach((d) => {
    const checkKey = READINESS_TO_CHECKLIST[d.key];
    if (checkKey) readinessMap.set(checkKey, d);
  });

  // Also handle flight_zone_defined from mission data
  const flightZoneDefined = !!(mission?.planned_flight_zone || (mission?.latitude && mission?.longitude));

  const enrichedItems: ChecklistItem[] = dbItems.map((item) => {
    let auto_status = item.auto_status;
    if (item.is_auto) {
      if (item.check_key === "flight_zone_defined") {
        auto_status = flightZoneDefined ? "ready" : "blocked";
      } else {
        const dim = readinessMap.get(item.check_key);
        if (dim) auto_status = dim.status;
      }
    }
    return { ...item, auto_status };
  });

  // Compute go/no-go
  const itemIsPassed = (item: ChecklistItem) => {
    if (item.override_note) return true; // manual override
    if (item.is_auto) return item.auto_status === "ready";
    return item.manual_checked;
  };

  const passedCount = enrichedItems.filter(itemIsPassed).length;
  const totalCount = enrichedItems.length;

  const blockedReasons: string[] = [];
  enrichedItems.forEach((item) => {
    if (item.is_critical && !itemIsPassed(item)) {
      const dim = readinessMap.get(item.check_key);
      blockedReasons.push(`${item.label}${dim ? `: ${dim.detail}` : ""}`);
    }
  });

  const criticalMissing = enrichedItems.filter((i) => i.is_critical && !itemIsPassed(i)).length;
  const goStatus: "go" | "no_go" | "pending" =
    totalCount === 0 ? "pending" :
    criticalMissing > 0 ? "no_go" : 
    passedCount === totalCount ? "go" : "pending";

  return {
    items: enrichedItems,
    isLoading: isLoading || readiness.loading,
    goStatus,
    blockedReasons,
    passedCount,
    totalCount,
    ensureChecklist,
    toggleCheck,
    saveOverride,
  };
}
