import { useState } from "react";
import { FileText, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PostflightReportExportProps {
  flightLogId: string;
  flightLogTitle: string;
}

export function PostflightReportExport({ flightLogId, flightLogTitle }: PostflightReportExportProps) {
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async (action: "download" | "print") => {
    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("You must be logged in to generate a report");
        return;
      }

      const { data, error } = await supabase.functions.invoke("generate-postflight-report", {
        body: { flight_log_id: flightLogId },
      });

      if (error) throw error;

      const html = data?.html;
      if (!html) {
        toast.error("No report content returned");
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
        a.download = `${flightLogTitle} - Postflight Report.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      toast.success("Postflight report generated");
    } catch (err: any) {
      console.error("Report generation error:", err);
      toast.error(err.message || "Failed to generate postflight report");
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
      {generating ? "Generating…" : "Export Report as PDF"}
    </Button>
  );
}
