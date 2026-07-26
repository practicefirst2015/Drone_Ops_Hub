import { useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useCreateFlightLog } from "@/hooks/useFlightLogs";
import { useAuth } from "@/contexts/AuthContext";
import { useOrg } from "@/contexts/OrgContext";
import { useOnlineStatus, useOfflineFlightLogs } from "@/hooks/useOffline";
import { toast } from "sonner";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { WifiOff } from "lucide-react";

interface FieldStartFlightDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mission: any;
}

export function FieldStartFlightDialog({ open, onOpenChange, mission }: FieldStartFlightDialogProps) {
  const { user } = useAuth();
  const { currentOrg } = useOrg();
  const createLog = useCreateFlightLog();
  const navigate = useNavigate();
  const online = useOnlineStatus();
  const { create: createOffline } = useOfflineFlightLogs();
  const [title, setTitle] = useState(`${mission.title} — Flight`);
  const [saving, setSaving] = useState(false);

  const handleStart = async () => {
    if (!user || !currentOrg) return;
    setSaving(true);

    const logData = {
      organization_id: currentOrg.id,
      project_id: mission.project_id,
      mission_id: mission.id,
      pilot_id: user.id,
      title,
      flight_date: format(new Date(), "yyyy-MM-dd"),
      launch_location: mission.launch_location || null,
      launch_time: format(new Date(), "HH:mm"),
      preflight_completed: true,
    };

    try {
      if (online) {
        const data = await createLog.mutateAsync(logData);
        toast.success("Flight log started");
        onOpenChange(false);
        navigate(`/flight-logs/${data.id}`);
      } else {
        await createOffline(logData);
        toast.success("Flight log saved offline — will sync when connected");
        onOpenChange(false);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create flight log");
    }
    setSaving(false);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="font-mono text-sm uppercase tracking-widest">Start Flight Log</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-8 space-y-4">
          {!online && (
            <div className="flex items-center gap-2 px-3 py-2 bg-destructive/10 border border-destructive/20">
              <WifiOff className="w-3.5 h-3.5 text-destructive" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-destructive">
                Offline — will sync later
              </span>
            </div>
          )}

          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground block mb-1">
              Flight Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-12 bg-secondary border border-border px-4 font-mono text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-secondary border border-border px-3 py-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground block">Mission</span>
              <span className="font-mono text-xs text-foreground truncate block">{mission.title}</span>
            </div>
            <div className="bg-secondary border border-border px-3 py-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground block">Project</span>
              <span className="font-mono text-xs text-foreground truncate block">{mission.projects?.name || "—"}</span>
            </div>
          </div>

          <div className="bg-secondary border border-border px-3 py-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground block">Launch Time</span>
            <span className="font-mono text-xs text-foreground">{format(new Date(), "HH:mm")} — Now</span>
          </div>

          <button
            onClick={handleStart}
            disabled={saving || !title.trim()}
            className="w-full h-14 bg-primary text-primary-foreground font-mono text-sm tracking-wide flex items-center justify-center gap-2 active:opacity-80 transition-opacity disabled:opacity-50"
          >
            {saving ? "Creating…" : online ? "Start Flight" : "Save Offline"}
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
