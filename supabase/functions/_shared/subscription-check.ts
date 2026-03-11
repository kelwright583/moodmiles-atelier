import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface SubscriptionCheck {
  allowed: boolean;
  fullTripsUsed: number;
  tier: string;
  upgradeRequired: boolean;
}

function getServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

/**
 * Check whether a user is allowed to create a new trip.
 * Free users get exactly one full-featured trip at no cost.
 * On their second attempt, upgradeRequired is true.
 */
export async function checkFreeTrip(userId: string): Promise<SubscriptionCheck> {
  const supabase = getServiceClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("user_id", userId)
    .single();

  const tier = profile?.subscription_tier || "free";

  if (tier !== "free") {
    return { allowed: true, fullTripsUsed: 0, tier, upgradeRequired: false };
  }

  const { data: freeTrips } = await supabase
    .from("user_free_trips")
    .select("full_trips_used")
    .eq("user_id", userId)
    .maybeSingle();

  const fullTripsUsed = freeTrips?.full_trips_used ?? 0;

  return {
    allowed: fullTripsUsed === 0,
    fullTripsUsed,
    tier,
    upgradeRequired: fullTripsUsed >= 1,
  };
}

/**
 * Record that a free user has consumed their one included trip.
 * Safe to call multiple times — uses upsert with increment.
 */
export async function incrementFreeTripUsage(userId: string): Promise<void> {
  const supabase = getServiceClient();

  const { data: existing } = await supabase
    .from("user_free_trips")
    .select("full_trips_used")
    .eq("user_id", userId)
    .maybeSingle();

  await supabase.from("user_free_trips").upsert(
    { user_id: userId, full_trips_used: (existing?.full_trips_used ?? 0) + 1 },
    { onConflict: "user_id" },
  );
}
