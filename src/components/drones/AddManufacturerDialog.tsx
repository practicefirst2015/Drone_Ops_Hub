import { useState, useEffect } from "react";
import { useManufacturers } from "@/hooks/useDroneCatalog";
import { X } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddManufacturerDialog({ open, onOpenChange }: Props) {
  const { createManufacturer } = useManufacturers();
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [website, setWebsite] = useState("");

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onOpenChange(false); };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open, onOpenChange]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createManufacturer.mutateAsync({
      name,
      country: country || undefined,
      website: website || undefined,
    });
    setName(""); setCountry(""); setWebsite("");
    onOpenChange(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80" onClick={() => onOpenChange(false)}>
      <div className="surface border border-border w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-mono text-sm font-medium text-foreground">Add Manufacturer</h2>
          <button onClick={() => onOpenChange(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="stat-label block mb-2">Name *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required
              className="w-full bg-background border border-border px-3 py-2.5 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary" placeholder="DJI" />
          </div>
          <div>
            <label className="stat-label block mb-2">Country</label>
            <input type="text" value={country} onChange={(e) => setCountry(e.target.value)}
              className="w-full bg-background border border-border px-3 py-2.5 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary" placeholder="China" />
          </div>
          <div>
            <label className="stat-label block mb-2">Website</label>
            <input type="text" value={website} onChange={(e) => setWebsite(e.target.value)}
              className="w-full bg-background border border-border px-3 py-2.5 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary" placeholder="https://www.dji.com" />
          </div>
          <button type="submit" disabled={createManufacturer.isPending}
            className="w-full h-10 bg-primary text-primary-foreground font-mono text-sm tracking-wide hover:opacity-90 disabled:opacity-50">
            {createManufacturer.isPending ? "Adding..." : "Add Manufacturer"}
          </button>
        </form>
      </div>
    </div>
  );
}
