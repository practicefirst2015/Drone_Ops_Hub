import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { ProjectWithLocation } from "./mapTypes";

type Props = {
  project: ProjectWithLocation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
};

export const EditLocationDialog = ({ project, open, onOpenChange, orgId }: Props) => {
  const qc = useQueryClient();
  const [locationName, setLocationName] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [radius, setRadius] = useState("");
  const [altitude, setAltitude] = useState("");
  const [saving, setSaving] = useState(false);

  // Reset fields when project changes
  const resetFields = (p: ProjectWithLocation | null) => {
    setLocationName(p?.location_name || "");
    setLat(p?.latitude?.toString() || "");
    setLng(p?.longitude?.toString() || "");
    setRadius(p?.flight_radius_m?.toString() || "500");
    setAltitude(p?.flight_altitude_m?.toString() || "120");
  };

  const handleOpenChange = (o: boolean) => {
    if (o && project) resetFields(project);
    onOpenChange(o);
  };

  const handleSave = async () => {
    if (!project) return;
    const latVal = lat ? parseFloat(lat) : null;
    const lngVal = lng ? parseFloat(lng) : null;
    if (lat && (isNaN(latVal!) || latVal! < -90 || latVal! > 90)) {
      toast.error("Latitude must be between -90 and 90"); return;
    }
    if (lng && (isNaN(lngVal!) || lngVal! < -180 || lngVal! > 180)) {
      toast.error("Longitude must be between -180 and 180"); return;
    }

    setSaving(true);
    const { error } = await supabase.from("projects").update({
      location_name: locationName.trim() || null,
      latitude: latVal,
      longitude: lngVal,
      flight_radius_m: radius ? parseFloat(radius) : null,
      flight_altitude_m: altitude ? parseFloat(altitude) : null,
    }).eq("id", project.id);

    setSaving(false);
    if (error) { toast.error("Failed to update location"); return; }
    toast.success("Location updated");
    qc.invalidateQueries({ queryKey: ["map_projects", orgId] });
    qc.invalidateQueries({ queryKey: ["project", project.id] });
    onOpenChange(false);
  };

  const inputClass = "h-8 text-xs font-mono bg-background border-border";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-mono text-sm tracking-wide">Edit Project Location</DialogTitle>
          <DialogDescription className="font-mono text-xs text-muted-foreground">
            {project?.name}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <label className="stat-label block mb-1.5">Location Name</label>
            <Input value={locationName} onChange={e => setLocationName(e.target.value)} placeholder="e.g. Downtown Site A" className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="stat-label block mb-1.5">Latitude</label>
              <Input type="number" step="any" value={lat} onChange={e => setLat(e.target.value)} placeholder="33.9534" className={inputClass} />
            </div>
            <div>
              <label className="stat-label block mb-1.5">Longitude</label>
              <Input type="number" step="any" value={lng} onChange={e => setLng(e.target.value)} placeholder="-117.3962" className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="stat-label block mb-1.5">Flight Radius (m)</label>
              <Input type="number" value={radius} onChange={e => setRadius(e.target.value)} placeholder="500" className={inputClass} />
            </div>
            <div>
              <label className="stat-label block mb-1.5">Altitude (m AGL)</label>
              <Input type="number" value={altitude} onChange={e => setAltitude(e.target.value)} placeholder="120" className={inputClass} />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 h-8 font-mono text-xs">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1 h-8 font-mono text-xs">{saving ? "Saving…" : "Save Location"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
