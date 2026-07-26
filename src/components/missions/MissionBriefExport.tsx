import { useState } from "react";
import { FileText, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MissionBriefExportProps {
  missionId: string;
  missionTitle: string;
}

export function MissionBriefExport({ missionId, missionTitle }: MissionBriefExportProps) {
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async (action: "download" | "print") => {
    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("You must be logged in to generate a mission brief");
        return;
      }

      const { data, error } = await supabase.functions.invoke("generate-mission-brief", {
        body: { mission_id: missionId },
      });

      if (error) throw error;

      const html = data?.html;
      if (!html) {
        toast.error("No brief content returned");
        return;
      }

      const briefWindow = window.open("", "_blank");
      if (briefWindow) {
        briefWindow.document.write(html);
        briefWindow.document.close();
        briefWindow.focus();
        setTimeout(() => briefWindow.print(), 600);
      } else {
        const blob = new Blob([html], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${missionTitle} - Mission Brief.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      toast.success("Mission brief generated");
    } catch (err: any) {
      console.error("Brief generation error:", err);
      toast.error(err.message || "Failed to generate mission brief");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => handleGenerate("print")}
      disabled={generating}
    >
      {generating ? <Loader2 className="animate-spin" /> : <Printer />}
      {generating ? "Generating…" : "Export Brief as PDF"}
    </Button>
  );
}
