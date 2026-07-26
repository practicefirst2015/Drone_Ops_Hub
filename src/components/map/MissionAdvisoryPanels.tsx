import { Cloud, Wind, Thermometer, Eye, Droplets, AlertTriangle, Info, TreePine, Leaf, Volume2 } from "lucide-react";
import { MissionMapItem } from "./mapTypes";

interface Props {
  mission: MissionMapItem | null;
}

/**
 * Weather & Airspace advisory panels for a selected mission.
 * Currently displays user-entered notes from the mission record.
 * Structured to accept external data feeds when integrations are connected.
 */
export function MissionAdvisoryPanels({ mission }: Props) {
  if (!mission) return null;

  const locationName = mission.launch_location || mission.projects?.location_name || "Mission area";

  return (
    <div className="space-y-3">
      {/* Weather Advisory */}
      <div className="surface border border-border">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
          <Cloud className="w-3 h-3 text-primary" />
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground flex-1">
            Weather Advisory
          </p>
          <span className="font-mono text-[8px] px-1 py-0.5 text-muted-foreground bg-muted">MANUAL</span>
        </div>
        <div className="p-3 space-y-2">
          {mission.weather_notes ? (
            <div>
              <p className="font-mono text-[9px] text-muted-foreground uppercase mb-1">Operator Notes</p>
              <p className="font-mono text-[10px] text-foreground leading-relaxed">{mission.weather_notes}</p>
            </div>
          ) : (
            <p className="font-mono text-[10px] text-muted-foreground italic">
              No weather notes recorded. Add notes via Edit Mission.
            </p>
          )}

          {/* Placeholder data fields for future weather integration */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
            <WeatherField icon={Wind} label="Wind" value="—" sublabel="Surface wind" />
            <WeatherField icon={Eye} label="Visibility" value="—" sublabel="Statute miles" />
            <WeatherField icon={Thermometer} label="Temp" value="—" sublabel="°C / Dew pt" />
            <WeatherField icon={Droplets} label="Precip" value="—" sublabel="Probability" />
          </div>

          <div className="px-2 py-1.5 bg-secondary/30">
            <p className="font-mono text-[9px] text-muted-foreground leading-relaxed">
              <Info className="w-2.5 h-2.5 inline mr-1" />
              Automated weather data will appear here when a weather service integration is configured.
              Always verify conditions independently before flight.
            </p>
          </div>
        </div>
      </div>

      {/* Airspace Advisory */}
      <div className="surface border border-border">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
          <AlertTriangle className="w-3 h-3 text-warning" />
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground flex-1">
            Airspace Advisory
          </p>
          <span className="font-mono text-[8px] px-1 py-0.5 text-muted-foreground bg-muted">MANUAL</span>
        </div>
        <div className="p-3 space-y-2">
          {mission.airspace_notes ? (
            <div>
              <p className="font-mono text-[9px] text-muted-foreground uppercase mb-1">Operator Notes</p>
              <p className="font-mono text-[10px] text-foreground leading-relaxed">{mission.airspace_notes}</p>
            </div>
          ) : (
            <p className="font-mono text-[10px] text-muted-foreground italic">
              No airspace notes recorded. Add notes via Edit Mission.
            </p>
          )}

          {/* Placeholder fields for future airspace integration */}
          <div className="space-y-1.5 pt-2 border-t border-border">
            <AirspaceField label="Airspace Class" value="—" status="unknown" />
            <AirspaceField label="LAANC Status" value="—" status="unknown" />
            <AirspaceField label="Active TFRs" value="—" status="unknown" />
            <AirspaceField label="Max Altitude" value="—" status="unknown" />
          </div>

          <div className="px-2 py-1.5 bg-secondary/30">
            <p className="font-mono text-[9px] text-muted-foreground leading-relaxed">
              <Info className="w-2.5 h-2.5 inline mr-1" />
              Automated airspace checks will appear here when FAA LAANC or airspace service integration is configured.
              Always verify authorization through official channels.
            </p>
          </div>
        </div>
      </div>

      {/* Environmental Considerations */}
      <div className="surface border border-border">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
          <TreePine className="w-3 h-3 text-success" />
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground flex-1">
            Environmental Advisory
          </p>
          <span className="font-mono text-[8px] px-1 py-0.5 text-muted-foreground bg-muted">PLANNED</span>
        </div>
        <div className="p-3 space-y-2">
          <div className="space-y-1.5">
            <EnvironmentalField icon={Leaf} label="Vegetation / Wildlife" value="—" sublabel="Seasonal restrictions" />
            <EnvironmentalField icon={Volume2} label="Noise Sensitivity" value="—" sublabel="Area classification" />
            <EnvironmentalField icon={TreePine} label="Protected Areas" value="—" sublabel="National parks, reserves" />
          </div>

          <div className="px-2 py-1.5 bg-secondary/30">
            <p className="font-mono text-[9px] text-muted-foreground leading-relaxed">
              <Info className="w-2.5 h-2.5 inline mr-1" />
              Environmental data will appear here when geospatial advisory integrations are configured.
              Check local regulations for wildlife and noise restrictions before operations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function WeatherField({ icon: Icon, label, value, sublabel }: {
  icon: typeof Wind;
  label: string;
  value: string;
  sublabel: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-3 h-3 text-muted-foreground shrink-0" />
      <div>
        <p className="font-mono text-[10px] text-foreground">{value}</p>
        <p className="font-mono text-[8px] text-muted-foreground">{sublabel}</p>
      </div>
    </div>
  );
}

function AirspaceField({ label, value, status }: {
  label: string;
  value: string;
  status: "clear" | "caution" | "restricted" | "unknown";
}) {
  const statusColor = {
    clear: "text-success",
    caution: "text-warning",
    restricted: "text-destructive",
    unknown: "text-muted-foreground",
  }[status];

  return (
    <div className="flex items-center justify-between">
      <span className="font-mono text-[10px] text-muted-foreground">{label}</span>
      <span className={`font-mono text-[10px] ${statusColor}`}>{value}</span>
    </div>
  );
}

function EnvironmentalField({ icon: Icon, label, value, sublabel }: {
  icon: typeof Wind;
  label: string;
  value: string;
  sublabel: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className="w-3 h-3 text-muted-foreground shrink-0" />
        <span className="font-mono text-[10px] text-muted-foreground">{label}</span>
      </div>
      <div className="text-right">
        <p className="font-mono text-[10px] text-foreground">{value}</p>
        <p className="font-mono text-[8px] text-muted-foreground">{sublabel}</p>
      </div>
    </div>
  );
}
