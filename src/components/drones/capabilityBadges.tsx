import { forwardRef } from "react";
import { Thermometer, Crosshair, ShieldCheck, CloudRain, Eye, Satellite } from "lucide-react";

export interface Capability {
  key: string;
  label: string;
  icon: React.ElementType;
  color: string; // tailwind text color token
}

/**
 * Derives capability badges from a drone model's stored fields.
 * Uses payloads data (optional) to detect thermal capability.
 */
export function getModelCapabilities(
  model: Record<string, any>,
  payloads?: Array<{ drone_payloads?: { type?: string; name?: string } }>
): Capability[] {
  const caps: Capability[] = [];

  // RTK — derived from gps_type containing "rtk"
  if (model.gps_type && /rtk/i.test(model.gps_type)) {
    caps.push({ key: "rtk", label: "RTK", icon: Satellite, color: "text-primary" });
  }

  // Obstacle avoidance — any value present
  if (model.obstacle_avoidance) {
    caps.push({ key: "obstacle", label: "Obstacle Avoid", icon: Eye, color: "text-primary" });
  }

  // Weather resistance — ip_rating present (IP45+)
  if (model.ip_rating) {
    caps.push({ key: "weather", label: model.ip_rating, icon: CloudRain, color: "text-primary" });
  }

  // Thermal — from payloads containing "thermal" in type or name
  const hasThermal = payloads?.some(
    (p) =>
      /thermal/i.test(p.drone_payloads?.type || "") ||
      /thermal/i.test(p.drone_payloads?.name || "")
  );
  if (hasThermal) {
    caps.push({ key: "thermal", label: "Thermal", icon: Thermometer, color: "text-primary" });
  }

  // Remote ID
  if (model.remote_id_capable) {
    caps.push({ key: "remote_id", label: "Remote ID", icon: ShieldCheck, color: "text-primary" });
  }

  return caps;
}

export const CapabilityBadges = forwardRef<HTMLDivElement, { capabilities: Capability[]; size?: "sm" | "xs" }>(
  function CapabilityBadges({ capabilities, size = "sm" }, ref) {
    if (capabilities.length === 0) return null;
    const iconSize = size === "xs" ? "w-2.5 h-2.5" : "w-3 h-3";
    const textSize = size === "xs" ? "text-[8px]" : "text-[9px]";

    return (
      <div ref={ref} className="flex flex-wrap gap-1">
        {capabilities.map((cap) => (
          <span
            key={cap.key}
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 border border-border font-mono ${textSize} ${cap.color}`}
            title={cap.label}
          >
            <cap.icon className={iconSize} />
            {cap.label}
          </span>
        ))}
      </div>
    );
  }
);
