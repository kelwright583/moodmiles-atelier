import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

serve(async (req) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;
  const headers = getCorsHeaders(req);

  try {
    const { event_id, flight_number, flight_date } = await req.json();
    if (!flight_number) {
      return new Response(JSON.stringify({ error: "flight_number is required" }), {
        status: 400, headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("AVIATIONSTACK_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AviationStack API key not configured" }), {
        status: 500, headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    const cleanFlight = flight_number.replace(/\s+/g, "").toUpperCase();
    const params = new URLSearchParams({
      access_key: apiKey,
      flight_iata: cleanFlight,
    });
    if (flight_date) params.set("flight_date", flight_date);

    const res = await fetch(`http://api.aviationstack.com/v1/flights?${params}`);
    const raw = await res.json();

    if (!raw.data || raw.data.length === 0) {
      return new Response(JSON.stringify({
        error: "Flight not found",
        flight_number: cleanFlight,
      }), { status: 200, headers: { ...headers, "Content-Type": "application/json" } });
    }

    const flight = raw.data[0];

    const statusMap: Record<string, string> = {
      scheduled: "scheduled",
      active: "en_route",
      landed: "landed",
      cancelled: "cancelled",
      incident: "cancelled",
      diverted: "delayed",
    };

    const flightStatus = statusMap[flight.flight_status] || "scheduled";
    const isDelayed = flight.departure?.delay && flight.departure.delay > 15;
    const finalStatus = isDelayed ? "delayed" : flightStatus;

    const result = {
      flight_number: cleanFlight,
      airline: flight.airline?.name || null,
      status: finalStatus,
      departure: {
        airport: flight.departure?.airport || null,
        iata: flight.departure?.iata || null,
        terminal: flight.departure?.terminal || null,
        gate: flight.departure?.gate || null,
        scheduled: flight.departure?.scheduled || null,
        estimated: flight.departure?.estimated || null,
        actual: flight.departure?.actual || null,
        delay_minutes: flight.departure?.delay || 0,
      },
      arrival: {
        airport: flight.arrival?.airport || null,
        iata: flight.arrival?.iata || null,
        terminal: flight.arrival?.terminal || null,
        gate: flight.arrival?.gate || null,
        baggage: flight.arrival?.baggage || null,
        scheduled: flight.arrival?.scheduled || null,
        estimated: flight.arrival?.estimated || null,
        actual: flight.arrival?.actual || null,
        delay_minutes: flight.arrival?.delay || 0,
      },
    };

    // Persist to trip_events if event_id provided
    if (event_id) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      await supabase.from("trip_events").update({
        flight_status: finalStatus,
        gate: result.departure.gate || result.arrival.gate,
        terminal: result.departure.terminal || result.arrival.terminal,
        baggage_claim: result.arrival.baggage,
        flight_status_updated_at: new Date().toISOString(),
      }).eq("id", event_id);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...headers, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...headers, "Content-Type": "application/json" },
    });
  }
});
