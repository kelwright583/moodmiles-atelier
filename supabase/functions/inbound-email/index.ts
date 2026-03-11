import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  // Postmark sends POST with JSON body — no CORS needed (server-to-server)
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const payload = await req.json();

    // Postmark inbound webhook fields
    const toAddress: string = payload.ToFull?.[0]?.Email || payload.To || "";
    const subject: string = payload.Subject || "";
    const textBody: string = payload.TextBody || "";
    const htmlBody: string = payload.HtmlBody || "";
    const rawEmail = `Subject: ${subject}\n\n${textBody || htmlBody}`;

    // Extract import token from address: import+TOKEN@concierge-styled.com
    const tokenMatch = toAddress.match(/import\+([a-z0-9]+)@/i);
    if (!tokenMatch) {
      return new Response(JSON.stringify({ error: "Invalid import address" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const importToken = tokenMatch[1].toLowerCase();

    // Look up user by import_token
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("import_token", importToken)
      .single();

    if (profileErr || !profile) {
      return new Response(JSON.stringify({ error: "Unknown import token" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const userId = profile.user_id;

    // Parse with GPT-4o-mini
    let parsedType = "other";
    let parsedData: Record<string, any> = {};

    if (openaiKey) {
      const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          max_tokens: 500,
          messages: [
            {
              role: "system",
              content: `You parse travel booking confirmation emails. Extract structured data and return ONLY valid JSON with these fields:
{
  "type": "flight" | "hotel" | "restaurant" | "activity" | "transfer" | "other",
  "event_name": "string — short name for itinerary (e.g. 'BA 235 LHR→JFK', 'The Ritz London', 'Noma Reservation')",
  "event_date": "YYYY-MM-DD or null",
  "event_time": "HH:MM or null (24h format)",
  "location": "string or null (full address or city)",
  "venue_name": "string or null",
  "booking_reference": "string or null",
  "notes": "string or null — any other useful details (check-in time, meal type, etc.)",
  "flight_number": "string or null (only for flights)",
  "airline": "string or null (only for flights)",
  "departure_airport": "string or null (IATA code)",
  "arrival_airport": "string or null (IATA code)"
}
Return ONLY valid JSON, no markdown or explanation.`,
            },
            {
              role: "user",
              content: rawEmail.slice(0, 4000),
            },
          ],
        }),
      });

      const aiData = await aiRes.json();
      const content = aiData.choices?.[0]?.message?.content?.trim() || "";

      try {
        const cleaned = content.replace(/^```json?\s*/, "").replace(/```\s*$/, "");
        parsedData = JSON.parse(cleaned);
        parsedType = parsedData.type || "other";
      } catch {
        parsedData = { raw_response: content };
      }
    }

    // Check for single upcoming/active trip → auto-assign
    const { data: trips } = await supabase
      .from("trips")
      .select("id, destination, status")
      .eq("user_id", userId)
      .in("status", ["upcoming", "active"]);

    let autoTripId: string | null = null;
    let autoEventId: string | null = null;

    if (trips && trips.length === 1) {
      autoTripId = trips[0].id;

      // Auto-create trip_event
      const eventPayload: Record<string, any> = {
        trip_id: autoTripId,
        event_name: parsedData.event_name || `Imported: ${subject.slice(0, 60)}`,
        event_type: parsedType === "flight" ? "flight" : parsedType === "hotel" ? "accommodation" : parsedType === "restaurant" ? "dining" : "activity",
        event_date: parsedData.event_date || null,
        event_time: parsedData.event_time || null,
        location: parsedData.location || null,
        venue_name: parsedData.venue_name || null,
        booking_reference: parsedData.booking_reference || null,
        booking_status: "confirmed",
        notes: parsedData.notes || null,
      };

      if (parsedType === "flight" && parsedData.flight_number) {
        eventPayload.flight_number = parsedData.flight_number;
      }

      const { data: newEvent } = await supabase
        .from("trip_events")
        .insert(eventPayload)
        .select("id")
        .single();

      autoEventId = newEvent?.id || null;
    }

    // Insert imported booking record
    await supabase.from("imported_bookings").insert({
      user_id: userId,
      raw_email: rawEmail.slice(0, 10000),
      parsed_type: parsedType,
      parsed_data: parsedData,
      trip_id: autoTripId,
      event_id: autoEventId,
      status: autoTripId ? "assigned" : "pending",
    });

    return new Response(
      JSON.stringify({
        success: true,
        auto_assigned: !!autoTripId,
        trip_id: autoTripId,
        event_id: autoEventId,
        parsed_type: parsedType,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
