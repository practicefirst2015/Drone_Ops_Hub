import { Wind, Eye, Thermometer, Droplets, CheckCircle2, XCircle, AlertTriangle, Cloud } from "lucide-react";
import { useWeather } from "@/hooks/useWeather";
import { useIntegrations } from "@/hooks/useIntegrations";
import { Link } from "react-router-dom";

interface Props {
  lat?: number | null;
  lon?: number | null;
  locationName?: string | null;
}

function WindArrow({ deg }: { deg: number }) {
  return (
    <span
      style={{ display: "inline-block", transform: `rotate(${deg}deg)` }}
      title={`${deg}°`}
    >
      ↑
    </span>
  );
}

export function WeatherPanel({ lat, lon, locationName }: Props) {
  const { isEnabled } = useIntegrations();
  const weatherEnabled = isEnabled("openweather");
  const { data: weather, isLoading, error } = useWeather(lat, lon);

  if (!weatherEnabled) {
    return (
      <div className="surface border border-border p-4">
        <div className="flex items-center gap-2 mb-2">
          <Cloud className="w-3.5 h-3.5 text-muted-foreground" />
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Weather</p>
        </div>
        <p className="font-mono text-xs text-muted-foreground">
          OpenWeather not connected.{" "}
          <Link to="/settings" className="text-primary hover:underline">Configure in Settings →</Link>
        </p>
      </div>
    );
  }

  if (!lat || !lon) {
    return (
      <div className="surface border border-border p-4">
        <div className="flex items-center gap-2 mb-2">
          <Cloud className="w-3.5 h-3.5 text-muted-foreground" />
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Weather</p>
        </div>
        <p className="font-mono text-xs text-muted-foreground">No location coordinates. Add mission location to see weather.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="surface border border-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <Cloud className="w-3.5 h-3.5 text-muted-foreground" />
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Weather</p>
        </div>
        <div className="flex justify-center py-4">
          <div className="w-2 h-2 bg-primary animate-pulse-glow" />
        </div>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="surface border border-border p-4">
        <div className="flex items-center gap-2 mb-2">
          <Cloud className="w-3.5 h-3.5 text-muted-foreground" />
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Weather</p>
        </div>
        <p className="font-mono text-xs text-destructive">
          {(error as any)?.message || "Weather unavailable"}
        </p>
      </div>
    );
  }

  const FlyIcon = weather.isFlySafe ? CheckCircle2 : weather.flySafeReasons.length > 0 ? XCircle : AlertTriangle;
  const flyColor = weather.isFlySafe ? "text-success" : "text-destructive";
  const flyBg = weather.isFlySafe ? "bg-success/10" : "bg-destructive/10";

  return (
    <div className="surface border border-border">
      {/* Header */}
      <div className="px-5 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cloud className="w-3.5 h-3.5 text-muted-foreground" />
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Weather {locationName ? `— ${locationName}` : ""}
          </p>
        </div>
        <div className={`flex items-center gap-1.5 font-mono text-[10px] px-2 py-0.5 ${flyColor} ${flyBg}`}>
          <FlyIcon className={`w-3 h-3 ${flyColor}`} />
          {weather.isFlySafe ? "Fly Safe" : "Fly Caution"}
        </div>
      </div>

      <div className="p-5">
        {/* Main stats */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Thermometer className="w-3.5 h-3.5 text-muted-foreground" />
            <div>
              <p className="font-mono text-xs text-muted-foreground">Temp</p>
              <p className="font-mono text-sm text-foreground">{weather.temperature}{weather.tempUnit}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Wind className="w-3.5 h-3.5 text-muted-foreground" />
            <div>
              <p className="font-mono text-xs text-muted-foreground">Wind</p>
              <p className="font-mono text-sm text-foreground">
                {weather.windSpeed} {weather.windUnit} <WindArrow deg={weather.windDirection} />
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Eye className="w-3.5 h-3.5 text-muted-foreground" />
            <div>
              <p className="font-mono text-xs text-muted-foreground">Visibility</p>
              <p className="font-mono text-sm text-foreground">{weather.visibility} km</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Droplets className="w-3.5 h-3.5 text-muted-foreground" />
            <div>
              <p className="font-mono text-xs text-muted-foreground">Humidity</p>
              <p className="font-mono text-sm text-foreground">{weather.humidity}%</p>
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="font-mono text-xs text-muted-foreground capitalize mb-3">{weather.description}</p>

        {/* Fly caution reasons */}
        {!weather.isFlySafe && weather.flySafeReasons.length > 0 && (
          <div className="mb-3 space-y-1">
            {weather.flySafeReasons.map((reason, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3 text-destructive shrink-0" />
                <span className="font-mono text-[10px] text-destructive">{reason}</span>
              </div>
            ))}
          </div>
        )}

        {/* Forecast */}
        {weather.forecast.length > 0 && (
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Forecast</p>
            <div className="grid grid-cols-4 gap-2">
              {weather.forecast.map((p, i) => {
                const time = new Date(p.time);
                const h = time.getHours();
                const label = h === 0 ? "12a" : h < 12 ? `${h}a` : h === 12 ? "12p" : `${h - 12}p`;
                return (
                  <div key={i} className="text-center">
                    <p className="font-mono text-[9px] text-muted-foreground">{label}</p>
                    <p className="font-mono text-xs text-foreground">{p.temp}°</p>
                    <p className="font-mono text-[9px] text-muted-foreground">{p.windSpeed.toFixed(0)} {weather.windUnit}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
