import { lazy, Suspense } from "react";
import { Box } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const DroneModelViewer = lazy(() => import("@/components/drones/DroneModelViewer"));

interface Props {
  missionId: string;
}

export function MissionDroneViewer({ missionId }: Props) {
  const { data: assignedModels } = useQuery({
    queryKey: ["mission_drone_models_3d", missionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mission_drone_models")
        .select("drone_model_id, drone_models(id, name, image_url)")
        .eq("mission_id", missionId);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Find first model with a .glb/.gltf URL
  const viewerModel = assignedModels?.find(
    (m: any) => m.drone_models?.image_url && /\.gl(b|tf)$/i.test(m.drone_models.image_url)
  );

  if (!viewerModel) return null;

  const model = (viewerModel as any).drone_models;

  return (
    <div>
      <p className="font-mono text-[9px] text-muted-foreground uppercase mb-1.5">Assigned Drone · 3D</p>
      <Suspense
        fallback={
          <div className="h-40 flex items-center justify-center bg-muted/30 border border-border">
            <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
              <Box className="w-4 h-4 animate-pulse" />
              <p className="font-mono text-[10px]">Loading 3D…</p>
            </div>
          </div>
        }
      >
        <DroneModelViewer modelUrl={model.image_url} modelName={model.name} />
      </Suspense>
    </div>
  );
}
