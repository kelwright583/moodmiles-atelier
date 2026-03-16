/// <reference path="../deno.d.ts" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { requireAuth, getServiceClient } from "../_shared/auth.ts";

serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;

  const corsHeaders = getCorsHeaders(req);

  try {
    const { userId } = await requireAuth(req);
    const supabase = getServiceClient();

    // Collect all user data in parallel
    const [
      { data: profile },
      { data: trips },
      { data: outfits },
      { data: packingItems },
      { data: boardItems },
      { data: events },
      { data: messages },
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", userId).single(),
      supabase.from("trips").select("*").eq("user_id", userId),
      supabase.from("outfit_suggestions").select("*").eq("user_id", userId),
      supabase.from("packing_items").select("*"),
      supabase.from("board_items").select("*"),
      supabase.from("trip_events").select("*"),
      supabase.from("trip_messages").select("content, created_at").eq("user_id", userId),
    ]);

    // Get trip IDs owned by this user to filter related records
    const tripIds = (trips || []).map((t: { id: string }) => t.id);

    // Filter related data to only this user's trips
    const userPackingItems = (packingItems || []).filter((p: { trip_id: string }) =>
      tripIds.includes(p.trip_id)
    );
    const userBoardItems = (boardItems || []).filter((b: { trip_id: string }) =>
      tripIds.includes(b.trip_id)
    );
    const userEvents = (events || []).filter((e: { trip_id: string }) =>
      tripIds.includes(e.trip_id)
    );

    const exportData = {
      exported_at: new Date().toISOString(),
      profile: profile
        ? {
            name: profile.name,
            handle: profile.handle,
            bio: profile.bio,
            home_city: profile.home_city,
            nationality: profile.nationality,
            style_vibe: profile.style_vibe,
            style_profile: profile.style_profile,
            luggage_size: profile.luggage_size,
            subscription_tier: profile.subscription_tier,
            created_at: profile.created_at,
          }
        : null,
      trips: (trips || []).map((trip: Record<string, unknown>) => ({
        destination: trip.destination,
        country: trip.country,
        start_date: trip.start_date,
        end_date: trip.end_date,
        trip_type: trip.trip_type,
        status: trip.status,
        notes: trip.notes,
        created_at: trip.created_at,
        events: userEvents.filter((e: { trip_id: string }) => e.trip_id === trip.id),
        packing_items: userPackingItems.filter((p: { trip_id: string }) => p.trip_id === trip.id),
        board_items: userBoardItems
          .filter((b: { trip_id: string }) => b.trip_id === trip.id)
          .map((b: { image_url: string; caption: string; created_at: string }) => ({
            image_url: b.image_url,
            caption: b.caption,
            created_at: b.created_at,
          })),
        outfit_suggestions: (outfits || []).filter(
          (o: { trip_id: string }) => o.trip_id === trip.id
        ),
      })),
      chat_messages: messages || [],
    };

    return new Response(JSON.stringify(exportData, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("export-user-data error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
