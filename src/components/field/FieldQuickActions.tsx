import { Plane, Upload, FileText, WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOffline";

interface FieldQuickActionsProps {
  onStartFlight: () => void;
  onUpload: () => void;
  onPostflight: () => void;
  missionTitle: string;
}

export function FieldQuickActions({ onStartFlight, onUpload, onPostflight, missionTitle }: FieldQuickActionsProps) {
  const online = useOnlineStatus();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border px-4 py-3 safe-area-bottom">
      {!online && (
        <div className="flex items-center justify-center gap-1.5 mb-2 max-w-lg mx-auto">
          <WifiOff className="w-3 h-3 text-destructive" />
          <span className="font-mono text-[9px] uppercase tracking-widest text-destructive">
            Offline — data saved locally
          </span>
        </div>
      )}
      <div className="flex items-center gap-2 max-w-lg mx-auto">
        <button
          onClick={onStartFlight}
          className="flex-1 h-12 bg-primary text-primary-foreground font-mono text-xs tracking-wide flex items-center justify-center gap-2 active:opacity-80 transition-opacity"
        >
          <Plane className="w-4 h-4" />
          {online ? "Start Flight" : "Log Offline"}
        </button>
        <button
          onClick={onUpload}
          className="h-12 w-12 bg-secondary text-foreground flex items-center justify-center active:bg-secondary/70 transition-colors"
        >
          <Upload className="w-4 h-4" />
        </button>
        <button
          onClick={onPostflight}
          className="h-12 w-12 bg-secondary text-foreground flex items-center justify-center active:bg-secondary/70 transition-colors"
        >
          <FileText className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
