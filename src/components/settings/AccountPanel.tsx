import { useState } from "react";
import { Download, Trash2, Loader2, AlertTriangle, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

/**
 * Account-level data rights: export everything, or delete the account.
 * Both call the `account-data` edge function, which enforces the rules
 * (notably: a sole owner of a shared organisation can't delete themselves).
 */
export function AccountPanel() {
  const { user, signOut } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [blocker, setBlocker] = useState<string | null>(null);

  const handleExport = async () => {
    setExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke("account-data", {
        body: { action: "export" },
      });
      if (error) throw error;
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `airframe-export-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Your data has been downloaded.");
    } catch (err: any) {
      toast.error(err?.message || "Could not export your data. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setBlocker(null);
    try {
      const { data, error } = await supabase.functions.invoke("account-data", {
        body: { action: "delete", confirm_email: confirmEmail },
      });
      if (error) {
        // Supabase wraps non-2xx; try to surface the structured reason.
        const ctx = (error as any)?.context;
        const body = typeof ctx?.body === "string" ? JSON.parse(ctx.body) : ctx?.body;
        if (body?.error === "sole_owner") { setBlocker(body.message); return; }
        throw error;
      }
      if (data?.error === "sole_owner") { setBlocker(data.message); return; }
      if (data?.error) throw new Error(data.error);

      toast.success("Your account has been deleted.");
      await signOut();
      window.location.href = "/";
    } catch (err: any) {
      toast.error(err?.message || "Could not delete the account. Please contact support.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Export */}
      <section>
        <p className="section-title mb-2">Your Data</p>
        <div className="surface border border-border p-4">
          <p className="text-xs text-muted-foreground leading-relaxed mb-3">
            Download everything associated with your account as a JSON file — your profile, skills and
            certifications, plus the records of every organisation you belong to.
          </p>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 h-10 px-4 border border-border font-mono text-xs hover:border-foreground/40 transition-colors disabled:opacity-50"
          >
            {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            {exporting ? "Preparing…" : "Export my data"}
          </button>
        </div>
      </section>

      {/* Legal */}
      <section>
        <p className="section-title mb-2">Policies</p>
        <div className="surface border border-border p-4 flex flex-wrap gap-4">
          <a href="/privacy" target="_blank" rel="noreferrer"
             className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-foreground">
            Privacy Policy <ExternalLink className="w-3 h-3" />
          </a>
          <a href="/terms" target="_blank" rel="noreferrer"
             className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-foreground">
            Terms of Service <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </section>

      {/* Danger zone */}
      <section>
        <p className="section-title mb-2 text-destructive">Danger Zone</p>
        <div className="surface border border-destructive/40 p-4">
          <p className="text-xs text-muted-foreground leading-relaxed mb-1">
            Deleting your account is permanent. Organisations where you are the only member are
            removed entirely, along with their projects, missions, flight logs, invoices, and files.
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed mb-3">
            If you are the sole owner of an organisation with other members, promote another owner
            first — we won't orphan their data.
          </p>

          {!confirmOpen ? (
            <button
              onClick={() => setConfirmOpen(true)}
              className="flex items-center gap-2 h-10 px-4 border border-destructive text-destructive font-mono text-xs hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete my account
            </button>
          ) : (
            <div className="space-y-3">
              <label className="stat-label block">
                Type <span className="text-foreground">{user?.email}</span> to confirm
              </label>
              <input
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                autoComplete="off"
                className="w-full bg-background border border-border px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-destructive"
                placeholder={user?.email ?? ""}
              />
              {blocker && (
                <div className="flex gap-2 p-3 border border-destructive/40 bg-destructive/5">
                  <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground leading-relaxed">{blocker}</p>
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => { setConfirmOpen(false); setConfirmEmail(""); setBlocker(null); }}
                  className="h-10 px-4 border border-border font-mono text-xs hover:border-foreground/40"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting || confirmEmail.trim().toLowerCase() !== (user?.email ?? "").toLowerCase()}
                  className="flex items-center gap-2 h-10 px-4 bg-destructive text-destructive-foreground font-mono text-xs hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  {deleting ? "Deleting…" : "Permanently delete"}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
