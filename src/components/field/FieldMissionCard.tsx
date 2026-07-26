import { useState } from "react";
import { ChevronDown, ChevronUp, MapPin, Plane, Users, Clock, ShieldCheck, ShieldAlert } from "lucide-react";
import { format } from "date-fns";
import { useMissionReadiness } from "@/hooks/useMissionReadiness";
import { useMissionOperators, useMissionDroneModels } from "@/hooks/useMissionData";
import { FieldChecklist } from "./FieldChecklist";
import { FieldQuickActions } from "./FieldQuickActions";
import { FieldStartFlightDialog } from "./FieldStartFlightDialog";
import { FieldUploadSheet } from "./FieldUploadSheet";
import { FieldPostflightSheet } from "./FieldPostflightSheet";

interface FieldMissionCardProps {
  mission: any;
  isSelected: boolean;
  onSelect: () => void;
  userId: string;
}

export function FieldMissionCard({ mission, isSelected, onSelect, userId }: FieldMissionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showFlight, setShowFlight] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showPostflight, setShowPostflight] = useState(false);

  const readiness = useMissionReadiness(mission.id, mission);
  const { operators } = useMissionOperators(mission.id);
  const { droneModels } = useMissionDroneModels(mission.id);

  const operatorsList = operators.data || [];
  const dronesList = droneModels.data || [];

  return (
    <>
      <div
        className={`border transition-colors ${
          isSelected ? "border-primary/50 bg-card" : "border-border bg-card"
        }`}
        onClick={onSelect}
      >
        {/* Header */}
        <div className="px-4 py-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-mono text-sm font-medium text-foreground truncate">{mission.title}</h3>
              <p className="font-mono text-[11px] text-muted-foreground truncate">{mission.projects?.name}</p>
            </div>
            <div className="ml-3 shrink-0">
              {readiness.loading ? (
                <div className="w-2 h-2 bg-primary animate-pulse-glow" />
              ) : (
                <span
                  className={`inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest px-2 py-1 ${
                    readiness.overall === "ready"
                      ? "bg-success/20 text-success"
                      : readiness.overall === "blocked"
                      ? "bg-destructive/20 text-destructive"
                      : "bg-warning/20 text-warning"
                  }`}
                >
                  {readiness.overall === "ready" ? (
                    <ShieldCheck className="w-3 h-3" />
                  ) : (
                    <ShieldAlert className="w-3 h-3" />
                  )}
                  {readiness.overall === "ready" ? "GO" : readiness.overall === "blocked" ? "NO-GO" : "REVIEW"}
                  <span className="ml-1">{readiness.score}%</span>
                </span>
              )}
            </div>
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
            {mission.mission_date && (
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="font-mono text-xs text-muted-foreground">
                  {format(new Date(mission.mission_date), "HH:mm")}
                </span>
              </div>
            )}
            {mission.launch_location && (
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="font-mono text-xs text-muted-foreground truncate max-w-[160px]">
                  {mission.launch_location}
                </span>
              </div>
            )}
            {dronesList.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Plane className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="font-mono text-xs text-muted-foreground truncate max-w-[120px]">
                  {dronesList.map((d: any) => d.drone_models?.name).filter(Boolean).join(", ") || "—"}
                </span>
              </div>
            )}
            {operatorsList.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="font-mono text-xs text-muted-foreground">
                  {operatorsList.length} operator{operatorsList.length > 1 ? "s" : ""}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Expand toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          className="w-full h-10 flex items-center justify-center border-t border-border text-muted-foreground active:bg-secondary/50 transition-colors"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          <span className="font-mono text-[10px] uppercase tracking-widest ml-1.5">
            {expanded ? "Hide" : "Checklist"}
          </span>
        </button>

        {/* Expandable checklist */}
        {expanded && (
          <div className="border-t border-border">
            <FieldChecklist missionId={mission.id} mission={mission} />
          </div>
        )}
      </div>

      {/* Bottom actions — only for selected mission */}
      {isSelected && (
        <FieldQuickActions
          onStartFlight={() => setShowFlight(true)}
          onUpload={() => setShowUpload(true)}
          onPostflight={() => setShowPostflight(true)}
          missionTitle={mission.title}
        />
      )}

      {/* Sheets */}
      <FieldStartFlightDialog open={showFlight} onOpenChange={setShowFlight} mission={mission} />
      <FieldUploadSheet
        open={showUpload}
        onOpenChange={setShowUpload}
        missionId={mission.id}
        projectId={mission.project_id}
        userId={userId}
      />
      <FieldPostflightSheet
        open={showPostflight}
        onOpenChange={setShowPostflight}
        missionId={mission.id}
        existingNotes={mission.postflight_notes}
      />
    </>
  );
}
