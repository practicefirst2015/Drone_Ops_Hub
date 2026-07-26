import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { getModelCapabilities } from "@/components/drones/capabilityBadges";
import { CapabilityBadges } from "@/components/drones/capabilityBadges";
import { Zap, ChevronRight, Plane, AlertTriangle, Filter } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Props {
  projectId: string;
}

interface ScoredModel {
  model: any;
  capabilities: ReturnType<typeof getModelCapabilities>;
  score: number;
  reasons: string[];
  inFleet: boolean;
}

/**
 * Scores drone models against project requirements and shows ranked recommendations.
 * Shows clear empty states when data is missing or no matches are found.
 */
export function DroneRecommendations({ projectId }: Props) {
  const { currentOrg } = useOrg();
  const navigate = useNavigate();
  const orgId = currentOrg?.id;
  const [fleetOnly, setFleetOnly] = useState(false);

  const { data: projectSkills = [] } = useQuery({
    queryKey: ["project_skills_recs", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_skills")
        .select("*, skills(name)")
        .eq("project_id", projectId);
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const { data: project } = useQuery({
    queryKey: ["project_rec_meta", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("flight_altitude_m, flight_radius_m, description, name")
        .eq("id", projectId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const { data: models = [], isLoading: modelsLoading } = useQuery({
    queryKey: ["drone_models_recs", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drone_models")
        .select("*, drone_manufacturers(name), drone_model_payloads(*, drone_payloads(id, name, type, weight_kg))")
        .eq("organization_id", orgId!);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  // Fetch org fleet drones to know which models are owned
  const { data: fleetDrones = [] } = useQuery({
    queryKey: ["fleet_drones_recs", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drones")
        .select("id, drone_model_id")
        .eq("organization_id", orgId!);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const { data: assignedDrones = [] } = useQuery({
    queryKey: ["project_drones_recs", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_drones")
        .select("drones(drone_model_id)")
        .eq("project_id", projectId);
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const fleetModelIds = useMemo(
    () => new Set(fleetDrones.map((d: any) => d.drone_model_id).filter(Boolean)),
    [fleetDrones]
  );

  const assignedModelIds = useMemo(
    () => new Set(assignedDrones.map((d: any) => d.drones?.drone_model_id).filter(Boolean)),
    [assignedDrones]
  );

  // Infer project needs from skill names + description
  const { needsThermal, needsRTK, needsWeather, needsEndurance, needsObstacle, hasAnyRequirement } = useMemo(() => {
    const skillNames = projectSkills.map((ps: any) => (ps.skills?.name || "").toLowerCase());
    const projectText = `${project?.name || ""} ${project?.description || ""}`.toLowerCase();
    const allText = [...skillNames, projectText].join(" ");

    const thermal = /thermal|infrared|heat/i.test(allText);
    const rtk = /rtk|survey|mapping|photogrammetry|volumetric/i.test(allText);
    const weather = /weather|rain|wind|outdoor|inspection/i.test(allText);
    const endurance = /endurance|long.?range|large.?area|solar.?farm/i.test(allText);
    const obstacle = /obstacle|indoor|confined|close.?range|inspection/i.test(allText);

    return {
      needsThermal: thermal,
      needsRTK: rtk,
      needsWeather: weather,
      needsEndurance: endurance,
      needsObstacle: obstacle,
      hasAnyRequirement: thermal || rtk || weather || endurance || obstacle || projectSkills.length > 0,
    };
  }, [projectSkills, project]);

  // Score each model
  const ranked = useMemo(() => {
    const scored: ScoredModel[] = models.map((m: any) => {
      const caps = getModelCapabilities(m, m.drone_model_payloads || []);
      const capKeys = new Set(caps.map((c) => c.key));
      let score = 0;
      const reasons: string[] = [];

      score += 1; // baseline

      if (needsThermal && capKeys.has("thermal")) {
        score += 3;
        reasons.push("Thermal payload");
      } else if (needsThermal && !capKeys.has("thermal")) {
        score -= 1;
      }

      if (needsRTK && capKeys.has("rtk")) {
        score += 3;
        reasons.push("RTK positioning");
      } else if (needsRTK && !capKeys.has("rtk")) {
        score -= 1;
      }

      if (needsWeather && capKeys.has("weather")) {
        score += 2;
        reasons.push(`Weather rated (${m.ip_rating})`);
      }

      if (needsObstacle && capKeys.has("obstacle")) {
        score += 2;
        reasons.push("Obstacle avoidance");
      }

      if (needsEndurance && m.max_flight_time_min && m.max_flight_time_min >= 35) {
        score += 2;
        reasons.push(`${m.max_flight_time_min} min endurance`);
      }

      const flightRadius = project?.flight_radius_m;
      if (flightRadius && m.max_range_km) {
        const rangeM = Number(m.max_range_km) * 1000;
        if (rangeM >= Number(flightRadius)) {
          score += 1;
          reasons.push("Range sufficient");
        }
      }

      const payloadCount = (m.drone_model_payloads || []).length;
      if (payloadCount > 0) {
        score += Math.min(payloadCount, 2);
        if (payloadCount > 1) reasons.push(`${payloadCount} payloads`);
      }

      if (reasons.length === 0) reasons.push("General capability match");

      return {
        model: m,
        capabilities: caps,
        score,
        reasons,
        inFleet: fleetModelIds.has(m.id),
      };
    });

    let filtered = scored.filter((s) => s.score > 0);
    if (fleetOnly) filtered = filtered.filter((s) => s.inFleet);

    return filtered.sort((a, b) => b.score - a.score).slice(0, 6);
  }, [models, needsThermal, needsRTK, needsWeather, needsEndurance, needsObstacle, project, fleetModelIds, fleetOnly]);

  const maxScore = ranked.length > 0 ? ranked[0].score : 0;
  const fleetCount = useMemo(() => models.filter((m: any) => fleetModelIds.has(m.id)).length, [models, fleetModelIds]);

  // --- Empty states ---

  if (modelsLoading) {
    return (
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-primary" />
          <p className="section-title mb-0">Recommended Models</p>
        </div>
        <div className="surface border border-border p-8 flex items-center justify-center">
          <div className="w-2 h-2 bg-primary animate-pulse-glow" />
        </div>
      </div>
    );
  }

  if (models.length === 0) {
    return (
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-primary" />
          <p className="section-title mb-0">Recommended Models</p>
        </div>
        <div className="surface border border-border p-8 text-center">
          <Plane className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
          <p className="font-mono text-sm text-muted-foreground">No drone models in database.</p>
          <p className="font-mono text-[10px] text-muted-foreground mt-1">Add drone models to the catalog to generate recommendations.</p>
        </div>
      </div>
    );
  }

  if (!hasAnyRequirement) {
    return (
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-primary" />
          <p className="section-title mb-0">Recommended Models</p>
        </div>
        <div className="surface border border-border p-8 text-center">
          <AlertTriangle className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
          <p className="font-mono text-sm text-muted-foreground">Insufficient project data for recommendations.</p>
          <p className="font-mono text-[10px] text-muted-foreground mt-1">
            Add required skills, description keywords (e.g. thermal, RTK, mapping), or flight parameters to generate recommendations.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          <p className="section-title mb-0">Recommended Models</p>
        </div>
        <button
          onClick={() => setFleetOnly((v) => !v)}
          className={`h-7 px-3 font-mono text-[10px] tracking-wide flex items-center gap-1.5 border transition-colors ${
            fleetOnly
              ? "border-primary text-primary bg-primary/5"
              : "border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          <Filter className="w-3 h-3" />
          Fleet Only{fleetCount > 0 ? ` (${fleetCount})` : ""}
        </button>
      </div>

      {ranked.length === 0 ? (
        <div className="surface border border-border p-8 text-center">
          <AlertTriangle className="w-6 h-6 text-warning mx-auto mb-2" />
          <p className="font-mono text-sm text-muted-foreground">
            {fleetOnly
              ? "No fleet drones match the project requirements."
              : "No drone models match the project requirements."}
          </p>
          <p className="font-mono text-[10px] text-muted-foreground mt-1">
            {fleetOnly
              ? "Try viewing all catalog models or update your fleet inventory."
              : "Add more drone models to the catalog with matching capabilities."}
          </p>
          {fleetOnly && (
            <button
              onClick={() => setFleetOnly(false)}
              className="mt-3 h-7 px-3 bg-secondary text-secondary-foreground font-mono text-[10px] tracking-wide hover:opacity-90 transition-opacity"
            >
              Show All Models
            </button>
          )}
        </div>
      ) : (
        <div className="surface border border-border divide-y divide-border">
          {ranked.map(({ model, capabilities, score, reasons, inFleet }) => {
            const isAssigned = assignedModelIds.has(model.id);
            const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

            return (
              <div
                key={model.id}
                className="px-6 py-4 flex items-center gap-4 hover:bg-secondary/50 transition-colors cursor-pointer"
                onClick={() => navigate(`/drones?model=${model.id}`)}
              >
                {/* Score indicator */}
                <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center border border-border">
                  <span className="font-mono text-xs text-primary font-semibold">{pct}%</span>
                </div>

                {/* Model info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-foreground font-medium truncate">{model.name}</span>
                    {isAssigned && (
                      <span className="font-mono text-[9px] px-1.5 py-0.5 bg-success/10 text-success border border-success/20">
                        ASSIGNED
                      </span>
                    )}
                    {inFleet && !isAssigned && (
                      <span className="font-mono text-[9px] px-1.5 py-0.5 bg-primary/10 text-primary border border-primary/20">
                        IN FLEET
                      </span>
                    )}
                  </div>
                  <p className="font-mono text-[10px] text-muted-foreground mt-0.5">
                    {model.drone_manufacturers?.name || "Unknown"} · {model.category}
                    {model.max_flight_time_min ? ` · ${model.max_flight_time_min} min` : ""}
                  </p>
                  <div className="mt-1.5">
                    <CapabilityBadges capabilities={capabilities} size="xs" />
                  </div>
                </div>

                {/* Reasons */}
                <div className="hidden md:flex flex-col items-end gap-0.5 flex-shrink-0">
                  {reasons.slice(0, 3).map((r, i) => (
                    <span key={i} className="font-mono text-[10px] text-muted-foreground">{r}</span>
                  ))}
                </div>

                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              </div>
            );
          })}
        </div>
      )}

      <p className="font-mono text-[10px] text-muted-foreground mt-2">
        Recommendations based on project skills, flight parameters, and drone capabilities. Only real stored data is used.
      </p>
    </div>
  );
}
