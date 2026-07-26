import { useState } from "react";
import { useOrg } from "@/contexts/OrgContext";
import { Plane } from "lucide-react";

const CreateOrg = () => {
  const { createOrganization } = useOrg();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setError("");
    setLoading(true);

    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (!slug) {
      setError("Please enter a valid organization name.");
      setLoading(false);
      return;
    }
    const result = await createOrganization(name.trim(), slug);

    if (!result) {
      setError("Failed to create organization. Please try a different name.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-10 justify-center">
          <div className="w-10 h-10 border border-primary flex items-center justify-center">
            <Plane className="w-5 h-5 text-primary" />
          </div>
          <span className="font-mono text-lg font-semibold tracking-widest uppercase text-foreground">
            AIRFRAME
          </span>
        </div>

        <div className="surface border border-border p-8">
          <h1 className="font-mono text-lg font-light text-foreground mb-1">
            Create Organization
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            Set up your drone operations workspace
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="stat-label block mb-2">Organization Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-background border border-border px-3 py-2.5 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                placeholder="Acme Drone Services"
                required
              />
            </div>

            {error && (
              <p className="font-mono text-xs text-destructive">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 bg-primary text-primary-foreground font-mono text-sm tracking-wide hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Organization"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateOrg;
