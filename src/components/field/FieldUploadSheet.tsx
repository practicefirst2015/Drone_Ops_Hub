import { useRef, useState } from "react";
import { Camera, Upload, Loader2, WifiOff } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { STORAGE_BUCKET, MAX_FILE_SIZE_BYTES, BLOCKED_FILE_EXTENSIONS } from "@/lib/constants";
import { useOnlineStatus, useOfflineFiles } from "@/hooks/useOffline";

interface FieldUploadSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  missionId: string;
  projectId: string;
  userId: string;
}

function getExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.substring(dot).toLowerCase() : "";
}

export function FieldUploadSheet({ open, onOpenChange, missionId, projectId, userId }: FieldUploadSheetProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const online = useOnlineStatus();
  const { queue: queueOffline } = useOfflineFiles();

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    let success = 0;

    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast.error(`${file.name} exceeds 20MB limit`);
        continue;
      }
      const ext = getExtension(file.name);
      if (BLOCKED_FILE_EXTENSIONS.includes(ext)) {
        toast.error(`${file.name}: blocked file type`);
        continue;
      }

      if (!online) {
        // Queue for offline sync
        try {
          await queueOffline(projectId, file, missionId);
          success++;
        } catch {
          toast.error(`Failed to queue ${file.name}`);
        }
        continue;
      }

      const storagePath = `project/${projectId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error: uploadErr } = await supabase.storage.from(STORAGE_BUCKET).upload(storagePath, file);
      if (uploadErr) {
        toast.error(`Upload failed: ${uploadErr.message}`);
        continue;
      }

      const { data: signedData } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(storagePath, 60 * 60 * 24 * 365);

      const { error: dbErr } = await supabase.from("project_documents").insert({
        project_id: projectId,
        uploaded_by: userId,
        file_name: file.name,
        file_url: signedData?.signedUrl || storagePath,
        file_size_bytes: file.size,
        mime_type: file.type || null,
        storage_path: storagePath,
      });

      if (dbErr) {
        await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
        toast.error(`Save failed: ${dbErr.message}`);
        continue;
      }
      success++;
    }

    if (success > 0) {
      toast.success(
        online
          ? `${success} file${success > 1 ? "s" : ""} uploaded`
          : `${success} file${success > 1 ? "s" : ""} queued for upload`
      );
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    if (cameraRef.current) cameraRef.current.value = "";
    if (success > 0) onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="font-mono text-sm uppercase tracking-widest">Upload Files</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-8 space-y-3">
          {!online && (
            <div className="flex items-center gap-2 px-3 py-2 bg-destructive/10 border border-destructive/20">
              <WifiOff className="w-3.5 h-3.5 text-destructive" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-destructive">
                Files will be queued offline
              </span>
            </div>
          )}

          {uploading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
              <span className="ml-2 font-mono text-sm text-muted-foreground">
                {online ? "Uploading…" : "Saving…"}
              </span>
            </div>
          ) : (
            <>
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
              <input ref={fileRef} type="file" multiple accept="image/*,.pdf,.kml,.kmz,.tif,.tiff,.las,.laz" className="hidden" onChange={(e) => handleFiles(e.target.files)} />

              <button
                onClick={() => cameraRef.current?.click()}
                className="w-full h-14 bg-primary text-primary-foreground font-mono text-sm tracking-wide flex items-center justify-center gap-3 active:opacity-80 transition-opacity"
              >
                <Camera className="w-5 h-5" />
                Take Photo
              </button>
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full h-14 bg-secondary text-foreground font-mono text-sm tracking-wide flex items-center justify-center gap-3 active:bg-secondary/70 transition-colors"
              >
                <Upload className="w-5 h-5" />
                Choose Files
              </button>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
