import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export class RateLimitError extends Error {
  retryAfterSeconds: number;
  constructor(message: string, retryAfterSeconds = 60) {
    super(message);
    this.name = "RateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

interface RateLimitConfig {
  maxCallsPerDay: number;
  maxCallsPerTrip?: number;
}

const DEFAULT_LIMITS: Record<string, RateLimitConfig> = {
  "generate-outfits": { maxCallsPerDay: 20, maxCallsPerTrip: 5 },
  "search-fashion": { maxCallsPerDay: 15, maxCallsPerTrip: 3 },
  "suggest-activities": { maxCallsPerDay: 20, maxCallsPerTrip: 5 },
  "suggest-packing": { maxCallsPerDay: 20, maxCallsPerTrip: 5 },
  "fetch-weather": { maxCallsPerDay: 50 },
  "fetch-trends": { maxCallsPerDay: 30 },
  "google-places": { maxCallsPerDay: 100 },
  "fetch-destination-image": { maxCallsPerDay: 30 },
};

function getServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

export async function checkRateLimit(
  userId: string,
  functionName: string,
  tripId?: string,
): Promise<void> {
  const config = DEFAULT_LIMITS[functionName];
  if (!config) return;

  const supabase = getServiceClient();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { count: dailyCount, error: dailyError } = await supabase
    .from("api_usage")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("function_name", functionName)
    .gte("called_at", todayStart.toISOString());

  if (dailyError) {
    console.error("Rate limit check failed:", dailyError);
    return;
  }

  if ((dailyCount ?? 0) >= config.maxCallsPerDay) {
    throw new RateLimitError(
      `Daily limit reached for ${functionName}. Try again tomorrow.`,
      3600,
    );
  }

  if (config.maxCallsPerTrip && tripId) {
    const { count: tripCount, error: tripError } = await supabase
      .from("api_usage")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("function_name", functionName)
      .eq("trip_id", tripId);

    if (tripError) {
      console.error("Trip rate limit check failed:", tripError);
      return;
    }

    if ((tripCount ?? 0) >= config.maxCallsPerTrip) {
      throw new RateLimitError(
        `Usage limit reached for this trip. Upgrade for more generations.`,
        86400,
      );
    }
  }
}

export async function recordUsage(
  userId: string,
  functionName: string,
  tripId?: string,
  tokensUsed = 0,
  costEstimate = 0,
): Promise<void> {
  const supabase = getServiceClient();

  const { error } = await supabase.from("api_usage").insert({
    user_id: userId,
    function_name: functionName,
    trip_id: tripId || null,
    tokens_used: tokensUsed,
    cost_estimate: costEstimate,
  });

  if (error) {
    console.error("Failed to record API usage:", error);
  }
}
