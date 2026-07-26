import { useState } from "react";
import { WifiOff } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useMissionMutations } from "@/hooks/useMissionData";
import { useOnlineStatus, useOfflineNotes } from "@/hooks/useOffline";
import { toast } from "sonner";

interface FieldPostflightSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  missionId: string;
  existingNotes: string | null;
}

export function FieldPostflightSheet({ open, onOpenChange, missionId, existingNotes }: FieldPostflightSheetProps) {
  const [notes, setNotes] = useState(existingNotes || "");
  const { updateMission } = useMissionMutations();
  const [saving, setSaving] = useState(false);
  const online = useOnlineStatus();
  const { save: saveOffline } = useOfflineNotes();

  const handleSave = async () => {
    setSaving(true);
    try {
      if (online) {
        await updateMission.mutateAsync({ id: missionId, postflight_notes: notes });
        toast.success("Postflight notes saved");
      } else {
        await saveOffline("mission", missionId, "postflight_notes", notes);
        toast.success("Notes saved offline — will sync when connected");
      }
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    }
    setSaving(false);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="font-mono text-sm uppercase tracking-widest">Postflight Notes</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-8 space-y-4">
          {!online && (
            <div className="flex items-center gap-2 px-3 py-2 bg-destructive/10 border border-destructive/20">
              <WifiOff className="w-3.5 h-3.5 text-destructive" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-destructive">
                Will sync when connected
              </span>
            </div>
          )}
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Observations, anomalies, conditions…"
            rows={6}
            className="w-full bg-secondary border border-border px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-14 bg-primary text-primary-foreground font-mono text-sm tracking-wide flex items-center justify-center gap-2 active:opacity-80 transition-opacity disabled:opacity-50"
          >
            {saving ? "Saving…" : online ? "Save Notes" : "Save Offline"}
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
