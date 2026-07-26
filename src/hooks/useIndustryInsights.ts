import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface IndustryInsights {
  available: boolean;
  reason?: string;
  minimumRequired?: number;
  currentParticipants?: number;
  participatingOrganizations?: number;
  generatedAt?: string;
  missions?: {
    totalAcrossIndustry: number;
    successRate: number;
  };
  flights?: {
    totalAcrossIndustry: number;
    avgDurationMinutes: number;
    medianDurationMinutes: number;
    outcomeDistribution: { name: string; percentage: number }[];
  };
  fleet?: {
    totalDronesTracked: number;
    avgFlightHoursPerDrone: number;
    popularModels: { name: string; count: number }[];
  };
  inspections?: {
    totalIssuesReported: number;
    resolutionRate: number;
    severityDistribution: { name: string; percentage: number }[];
    topIssueCategories: { name: string; count: number }[];
  };
}

export function useIndustryInsights() {
  return useQuery({
    queryKey: ["industry-insights"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("aggregate-insights");
      if (error) throw error;
      return data as IndustryInsights;
    },
    staleTime: 1000 * 60 * 30, // 30 min cache
    refetchOnWindowFocus: false,
  });
}
