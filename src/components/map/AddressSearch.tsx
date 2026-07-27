import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Search } from "lucide-react";

export type GeocodeResult = {
  lat: number;
  lon: number;
  displayName: string;
};

type Props = {
  /** Called when the user picks a search result. */
  onSelect: (result: GeocodeResult) => void;
  className?: string;
};

/**
 * Address → coordinates search box backed by OpenStreetMap Nominatim
 * (free, no API key). Type an address, press Enter or click Search,
 * then pick a match to fill in latitude/longitude.
 */
export const AddressSearch = ({ onSelect, className }: Props) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const search = async () => {
    const q = query.trim();
    if (!q || searching) return;
    setSearching(true);
    setMessage(null);
    setResults([]);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(q)}`,
        { headers: { Accept: "application/json" } }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Array<{ lat: string; lon: string; display_name: string }> = await res.json();
      const mapped = data
        .map((d) => ({ lat: parseFloat(d.lat), lon: parseFloat(d.lon), displayName: d.display_name }))
        .filter((d) => Number.isFinite(d.lat) && Number.isFinite(d.lon));
      setResults(mapped);
      if (mapped.length === 0) setMessage("No matches found — try adding a city, state, or ZIP.");
    } catch {
      setMessage("Address lookup failed. Check your connection and try again.");
    } finally {
      setSearching(false);
    }
  };

  const pick = (r: GeocodeResult) => {
    setResults([]);
    setMessage(null);
    setQuery(r.displayName);
    onSelect(r);
  };

  return (
    <div className={className}>
      <label className="stat-label block mb-1.5">Search Address</label>
      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              search();
            }
          }}
          placeholder="e.g. 123 Main St, Riverside, CA"
          className="h-8 text-xs font-mono bg-background border-border"
        />
        <Button
          type="button"
          variant="outline"
          onClick={search}
          disabled={searching || !query.trim()}
          className="h-8 px-3 font-mono text-xs shrink-0"
        >
          {searching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
          <span className="ml-1.5">Search</span>
        </Button>
      </div>
      {message && <p className="text-xs text-muted-foreground mt-1.5 font-mono">{message}</p>}
      {results.length > 0 && (
        <div className="mt-1.5 border border-border rounded-md divide-y divide-border bg-background max-h-44 overflow-y-auto">
          {results.map((r, i) => (
            <button
              key={i}
              type="button"
              onClick={() => pick(r)}
              className="w-full flex items-start gap-2 p-2 text-left text-xs hover:bg-muted/50 transition-colors"
            >
              <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
              <span className="flex-1 leading-snug">{r.displayName}</span>
            </button>
          ))}
        </div>
      )}
      <p className="text-[10px] text-muted-foreground mt-1 font-mono">Search © OpenStreetMap contributors</p>
    </div>
  );
};

/** First few segments of a Nominatim display name — a friendlier short label. */
export const shortPlaceName = (displayName: string, segments = 3): string =>
  displayName.split(",").slice(0, segments).map((s) => s.trim()).join(", ");
