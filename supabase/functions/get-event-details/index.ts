import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { getServiceClient } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;

  const corsHeaders = getCorsHeaders(req);

  try {
    const { share_token } = await req.json();
    if (!share_token) {
      return new Response(JSON.stringify({ error: "share_token required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = getServiceClient();

    const { data: event } = await supabase
      .from("trip_events")
      .select("id, event_name, category, event_date, event_time, venue_name, venue_address, dress_code, notes, trip_id")
      .eq("share_token", share_token)
      .maybeSingle();

    if (!event) {
      return new Response(JSON.stringify({ error: "Event not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: trip } = await supabase
      .from("trips")
      .select("id, destination, country, image_url")
      .eq("id", event.trip_id)
      .single();

    return new Response(
      JSON.stringify({
        event_name: event.event_name,
        category: event.category,
        event_date: event.event_date,
        event_time: event.event_time,
        venue_name: event.venue_name,
        venue_address: event.venue_address,
        dress_code: event.dress_code,
        notes: event.notes,
        trip_id: trip?.id,
        destination: trip?.destination,
        country: trip?.country,
        trip_image_url: trip?.image_url,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
