import { useMissionFiles } from "@/hooks/useExportedFiles";
import { ExportedFilesPanel } from "@/components/exports/ExportedFilesPanel";

interface Props {
  missionId: string;
  files?: any[];
}

export function MissionExportedFiles({ missionId, files: propFiles }: Props) {
  const { data: fetchedFiles = [], isLoading } = useMissionFiles(
    propFiles ? undefined : missionId
  );

  const files = propFiles ?? fetchedFiles;

  return (
    <ExportedFilesPanel
      files={files}
      isLoading={!propFiles && isLoading}
      entityType="mission"
    />
  );
}
