import { useOrg } from "@/contexts/OrgContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useIntegrations } from "@/hooks/useIntegrations";

export interface WeatherData {
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  visibility: number;
  description: string;
  icon: string;
  weatherId: number;
  isFlySafe: boolean;
  flySafeReasons: string[];
  tempUnit: string;
  windUnit: string;
  forecast: Array<{
    time: string;
    temp: number;
    windSpeed: number;
    description: string;
    icon: string;
  }>;
}

export function useWeather(lat?: number | null, lon?: number | null) {
  const { currentOrg } = useOrg();
  const { getIntegration, isEnabled } = useIntegrations();
  const orgId = currentOrg?.id;

  const weatherEnabled = isEnabled("openweather");
  const integration = getIntegration("openweather");
  const units = (integration?.config as any)?.units || "metric";

  return useQuery<WeatherData>({
    queryKey: ["weather", orgId, lat, lon, units],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("get-weather", {
        body: { lat, lon, org_id: orgId, units },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as WeatherData;
    },
    enabled: !!orgId && !!lat && !!lon && weatherEnabled,
    staleTime: 10 * 60 * 1000, // 10 min — weather doesn't change that fast
    retry: 1,
  });
}
