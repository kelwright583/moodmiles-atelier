import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

serve(async (req) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;
  const headers = getCorsHeaders(req);

  try {
    const { origin_lat, origin_lng, dest_lat, dest_lng, arrival_time, is_airport } = await req.json();

    if (!origin_lat || !origin_lng || !dest_lat || !dest_lng || !arrival_time) {
      return new Response(JSON.stringify({ error: "origin_lat, origin_lng, dest_lat, dest_lng, and arrival_time are required" }), {
        status: 400, headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Google Maps API key not configured" }), {
        status: 500, headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    const arrivalDate = new Date(arrival_time);
    const arrivalEpoch = Math.floor(arrivalDate.getTime() / 1000);

    const params = new URLSearchParams({
      origins: `${origin_lat},${origin_lng}`,
      destinations: `${dest_lat},${dest_lng}`,
      arrival_time: String(arrivalEpoch),
      mode: "driving",
      key: apiKey,
    });

    const res = await fetch(`https://maps.googleapis.com/maps/api/distancematrix/json?${params}`);
    const data = await res.json();

    if (data.status !== "OK" || !data.rows?.[0]?.elements?.[0]) {
      return new Response(JSON.stringify({ error: "Could not calculate route", raw_status: data.status }), {
        status: 200, headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    const element = data.rows[0].elements[0];
    if (element.status !== "OK") {
      return new Response(JSON.stringify({ error: "No route found", element_status: element.status }), {
        status: 200, headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    const travelSeconds = element.duration_in_traffic?.value || element.duration.value;
    const travelMinutes = Math.ceil(travelSeconds / 60);
    const distanceKm = Math.round(element.distance.value / 100) / 10;

    // Airport buffer: 20 min to get through airport + 90 min check-in
    // Regular venue: 15 min general buffer
    const bufferMinutes = is_airport ? 110 : 15;
    const totalMinutes = travelMinutes + bufferMinutes;

    const leaveAt = new Date(arrivalDate.getTime() - totalMinutes * 60 * 1000);

    return new Response(JSON.stringify({
      leave_at: leaveAt.toISOString(),
      travel_minutes: travelMinutes,
      buffer_minutes: bufferMinutes,
      total_minutes: totalMinutes,
      distance_km: distanceKm,
      distance_text: element.distance.text,
      duration_text: element.duration.text,
    }), {
      headers: { ...headers, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...headers, "Content-Type": "application/json" },
    });
  }
});
