import { Users, Plane, Clock, Activity } from "lucide-react";
import { usePilotUtilization, useDroneUtilization } from "@/hooks/useUtilization";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";

export function UtilizationWidget() {
  const { currentOrg } = useOrg();
  const { pilots, hasData: hasPilotData } = usePilotUtilization();
  const { drones, hasData: hasDroneData } = useDroneUtilization();

  // Fetch pilot names
  const pilotIds = pilots.slice(0, 5).map(p => p.userId);
  const { data: profiles = [] } = useQuery({
    queryKey: ["utilization_profiles", pilotIds],
    queryFn: async () => {
      if (pilotIds.length === 0) return [];
      const { data } = await supabase.from("profiles").select("id, full_name").in("id", pilotIds);
      return data ?? [];
    },
    enabled: pilotIds.length > 0,
  });

  // Fetch drone model names
  const droneIds = drones.slice(0, 5).map(d => d.droneModelId);
  const { data: droneModels = [] } = useQuery({
    queryKey: ["utilization_drone_models", droneIds],
    queryFn: async () => {
      if (droneIds.length === 0) return [];
      const { data } = await supabase.from("drone_models").select("id, name").in("id", droneIds);
      return data ?? [];
    },
    enabled: droneIds.length > 0,
  });

  if (!hasPilotData && !hasDroneData) return null;

  const totalFlightHours = pilots.reduce((s, p) => s + p.totalFlightHours, 0);
  const totalFlights = pilots.reduce((s, p) => s + p.totalFlights, 0);
  const last30Flights = pilots.reduce((s, p) => s + p.last30DaysFlights, 0);
  const last30Hours = pilots.reduce((s, p) => s + p.last30DaysHours, 0);

  const getName = (id: string) => (profiles as any[]).find(p => p.id === id)?.full_name || "Unknown";
  const getDroneName = (id: string) => (droneModels as any[]).find(d => d.id === id)?.name || "Unknown";

  return (
    <div className="surface border border-border">
      <div className="px-6 py-4 border-b border-border flex items-center gap-2">
        <Activity className="w-4 h-4 shrink-0 text-primary" />
        <span className="section-title mb-0">Utilization</span>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-px bg-border">
        <div className="bg-card p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Total Hours</p>
          <p className="font-mono text-lg text-foreground">{totalFlightHours.toFixed(1)}</p>
        </div>
        <div className="bg-card p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Total Flights</p>
          <p className="font-mono text-lg text-foreground">{totalFlights}</p>
        </div>
        <div className="bg-card p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-primary mb-1">30d Flights</p>
          <p className="font-mono text-lg text-primary">{last30Flights}</p>
        </div>
        <div className="bg-card p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-primary mb-1">30d Hours</p>
          <p className="font-mono text-lg text-primary">{last30Hours.toFixed(1)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 divide-x divide-border">
        {/* Top Pilots */}
        <div className="p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <Users className="w-3 h-3 text-muted-foreground" />
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Top Pilots</p>
          </div>
          {pilots.length === 0 ? (
            <p className="font-mono text-[11px] text-muted-foreground">No flight data yet</p>
          ) : (
            <div className="space-y-2">
              {pilots.slice(0, 5).map(p => (
                <div key={p.userId} className="flex items-center justify-between">
                  <span className="font-mono text-[11px] text-foreground truncate">{getName(p.userId)}</span>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono text-[10px] text-muted-foreground">{p.totalFlights} flights</span>
                    <span className="font-mono text-[10px] text-primary">{p.totalFlightHours.toFixed(1)}h</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Drones */}
        <div className="p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <Plane className="w-3 h-3 text-muted-foreground" />
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Top Drone Models</p>
          </div>
          {drones.length === 0 ? (
            <p className="font-mono text-[11px] text-muted-foreground">No flight data yet</p>
          ) : (
            <div className="space-y-2">
              {drones.slice(0, 5).map(d => (
                <div key={d.droneModelId} className="flex items-center justify-between">
                  <span className="font-mono text-[11px] text-foreground truncate">{getDroneName(d.droneModelId)}</span>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono text-[10px] text-muted-foreground">{d.totalFlights} flights</span>
                    <span className="font-mono text-[10px] text-primary">{d.totalFlightHours.toFixed(1)}h</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
