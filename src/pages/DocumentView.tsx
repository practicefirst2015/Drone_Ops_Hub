import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Printer, AlertCircle } from "lucide-react";

const FUNCTIONS_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

/**
 * Public document viewer for emailed links (invoices, mission briefs,
 * post-flight reports). No login required — the link itself carries a
 * server-signed, expiring signature that view-document verifies.
 *
 * Supabase serves stored HTML as text/plain (anti-phishing), so the raw
 * document URL shows source code in a browser. This page fetches that text
 * and renders it inside an iframe, where it displays as a real document.
 */
export default function DocumentView() {
  const [params] = useSearchParams();
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const path = params.get("path") ?? "";
  const exp = params.get("exp") ?? "";
  const sig = params.get("sig") ?? "";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!path || !exp || !sig) {
        setError("This link is incomplete. Please request a new copy.");
        return;
      }
      try {
        const url = `${FUNCTIONS_BASE}/view-document?path=${encodeURIComponent(path)}&exp=${encodeURIComponent(exp)}&sig=${encodeURIComponent(sig)}`;
        const res = await fetch(url);
        const text = await res.text();
        if (cancelled) return;
        if (!res.ok) {
          setError(
            res.status === 410
              ? "This link has expired. Please request a new copy."
              : "This document could not be opened. Please request a new copy."
          );
          return;
        }
        setHtml(text);
      } catch {
        if (!cancelled) setError("Could not load the document. Check your connection and try again.");
      }
    })();
    return () => { cancelled = true; };
  }, [path, exp, sig]);

  const documentTitle = path.split("/").pop()?.replace(/_\d+\.html$/, "") ?? "Document";

  const print = () => {
    const frame = document.getElementById("doc-frame") as HTMLIFrameElement | null;
    frame?.contentWindow?.focus();
    frame?.contentWindow?.print();
  };

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <AlertCircle className="w-6 h-6 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-foreground mb-1">Document unavailable</p>
          <p className="text-xs text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      <div className="flex items-center justify-between px-4 py-2.5 bg-background border-b border-border">
        <span className="font-mono text-xs text-muted-foreground truncate">{documentTitle}</span>
        <button
          onClick={print}
          disabled={!html}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-border font-mono text-xs hover:bg-muted transition-colors disabled:opacity-50"
        >
          <Printer className="w-3.5 h-3.5" />
          Print / Save as PDF
        </button>
      </div>
      {html ? (
        <iframe
          id="doc-frame"
          title={documentTitle}
          srcDoc={html}
          className="flex-1 w-full bg-white border-0"
        />
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-3 h-3 bg-primary animate-pulse-glow" />
        </div>
      )}
    </div>
  );
}
