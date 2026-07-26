import { type LucideIcon } from "lucide-react";

interface StatusCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  accent?: "primary" | "warning" | "success";
}

export function StatusCard({ label, value, icon: Icon, trend, accent = "primary" }: StatusCardProps) {
  const accentColors = {
    primary: "text-primary border-primary/20",
    warning: "text-warning border-warning/20",
    success: "text-success border-success/20",
  };

  return (
    <div className="surface border border-border p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="stat-label">{label}</p>
        <Icon className={`w-4 h-4 ${accentColors[accent]}`} />
      </div>
      <div className="flex items-end justify-between">
        <span className="stat-value">{value}</span>
        {trend && (
          <span className={`font-mono text-xs ${accentColors[accent]}`}>{trend}</span>
        )}
      </div>
    </div>
  );
}
