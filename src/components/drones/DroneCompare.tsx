import { X } from "lucide-react";

interface Props {
  modelIds: string[];
  allModels: any[];
  onRemove: (id: string) => void;
}

const COMPARE_FIELDS = [
  { key: "category", label: "Category" },
  { key: "manufacturer", label: "Manufacturer", getter: (m: any) => m.drone_manufacturers?.name },
  { key: "max_flight_time_min", label: "Flight Time", suffix: " min" },
  { key: "max_range_km", label: "Range", suffix: " km" },
  { key: "max_speed_ms", label: "Max Speed", suffix: " m/s" },
  { key: "max_altitude_m", label: "Max Altitude", suffix: " m" },
  { key: "max_wind_resistance_ms", label: "Wind Resist", suffix: " m/s" },
  { key: "weight_kg", label: "Weight", suffix: " kg" },
  { key: "max_payload_kg", label: "Max Payload", suffix: " kg" },
  { key: "dimensions", label: "Dimensions" },
  { key: "propeller_count", label: "Propellers" },
  { key: "gps_type", label: "GPS" },
  { key: "obstacle_avoidance", label: "Obstacle Avoid" },
  { key: "has_built_in_camera", label: "Built-in Camera", getter: (m: any) => m.has_built_in_camera ? "Yes" : "No" },
  { key: "camera_sensor", label: "Camera Sensor" },
  { key: "camera_resolution", label: "Photo Resolution" },
  { key: "video_resolution", label: "Video Resolution" },
  { key: "ip_rating", label: "IP Rating" },
  { key: "operating_temp_range", label: "Temp Range" },
  { key: "faa_category", label: "FAA Category" },
  { key: "remote_id_capable", label: "Remote ID", getter: (m: any) => m.remote_id_capable ? "Yes" : "No" },
];

// Determine which value is "best" for numeric fields (higher is better for most)
const HIGHER_BETTER = ["max_flight_time_min", "max_range_km", "max_speed_ms", "max_altitude_m", "max_wind_resistance_ms", "max_payload_kg"];
const LOWER_BETTER = ["weight_kg"];

export function DroneCompare({ modelIds, allModels, onRemove }: Props) {
  const models = modelIds.map((id) => allModels.find((m: any) => m.id === id)).filter(Boolean);

  if (models.length === 0) {
    return (
      <div className="surface border border-border p-12 text-center">
        <p className="font-mono text-sm text-muted-foreground">Select models from the catalog to compare.</p>
        <p className="font-mono text-xs text-muted-foreground mt-1">Use the checkboxes on model cards (up to 4).</p>
      </div>
    );
  }

  const getBestValue = (field: typeof COMPARE_FIELDS[0], values: (number | null)[]) => {
    const nums = values.filter((v) => v !== null) as number[];
    if (nums.length === 0) return null;
    if (HIGHER_BETTER.includes(field.key)) return Math.max(...nums);
    if (LOWER_BETTER.includes(field.key)) return Math.min(...nums);
    return null;
  };

  return (
    <div className="surface border border-border overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="px-4 py-4 text-left stat-label w-40 sticky left-0 bg-card z-10">Specification</th>
            {models.map((m: any) => (
              <th key={m.id} className="px-4 py-4 text-left min-w-[180px]">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-mono text-[10px] text-muted-foreground uppercase">{m.drone_manufacturers?.name}</p>
                    <p className="font-mono text-sm text-foreground mt-0.5">{m.name}</p>
                  </div>
                  <button onClick={() => onRemove(m.id)} className="text-muted-foreground hover:text-foreground ml-2">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {COMPARE_FIELDS.map((field) => {
            const values = models.map((m: any) => {
              if (field.getter) return field.getter(m);
              return m[field.key];
            });

            // Skip rows where all values are null/empty
            if (values.every((v) => v === null || v === undefined || v === "")) return null;

            const numericValues = models.map((m: any) => {
              const v = m[field.key];
              return typeof v === "number" ? v : parseFloat(v);
            }).map((v) => isNaN(v) ? null : v);

            const bestValue = getBestValue(field, numericValues);

            return (
              <tr key={field.key} className="hover:bg-secondary/30">
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground uppercase tracking-wider sticky left-0 bg-card">
                  {field.label}
                </td>
                {models.map((m: any, i: number) => {
                  const val = field.getter ? field.getter(m) : m[field.key];
                  const displayVal = val !== null && val !== undefined && val !== ""
                    ? `${val}${field.suffix || ""}`
                    : "—";
                  const isNumeric = typeof m[field.key] === "number" || !isNaN(parseFloat(m[field.key]));
                  const isBest = bestValue !== null && isNumeric && numericValues[i] === bestValue && models.length > 1;

                  return (
                    <td key={m.id} className={`px-4 py-3 font-mono text-xs ${isBest ? "text-primary font-medium" : "text-foreground"}`}>
                      {displayVal}
                      {isBest && <span className="ml-1 text-[9px] text-primary">★</span>}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
