import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { trip_id } = await req.json();
    if (!trip_id) throw new Error("trip_id required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all context in parallel
    const [tripRes, weatherRes, eventsRes, activitiesRes, outfitsRes] = await Promise.all([
      supabase.from("trips").select("*").eq("id", trip_id).single(),
      supabase.from("weather_data").select("*").eq("trip_id", trip_id).order("date"),
      supabase.from("trip_events").select("*").eq("trip_id", trip_id),
      supabase.from("activity_suggestions").select("name,category,location").eq("trip_id", trip_id),
      supabase.from("outfit_suggestions").select("title,occasion,items").eq("trip_id", trip_id),
    ]);

    const trip = tripRes.data;
    if (!trip) throw new Error("Trip not found");

    const weather = weatherRes.data || [];
    const events = eventsRes.data || [];
    const activities = activitiesRes.data || [];
    const outfits = outfitsRes.data || [];

    // Calculate trip duration
    const start = new Date(trip.start_date);
    const end = new Date(trip.end_date);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Weather summary
    const tempHigh = weather.length ? Math.max(...weather.map((w: any) => w.temperature_high || 0)) : null;
    const tempLow = weather.length ? Math.min(...weather.map((w: any) => w.temperature_low || 30)) : null;
    const maxRain = weather.length ? Math.max(...weather.map((w: any) => w.rain_probability || 0)) : 0;
    const hasSnow = weather.some((w: any) => (w.weather_code || 0) >= 71 && (w.weather_code || 0) <= 77);
    const avgWind = weather.length ? weather.reduce((s: number, w: any) => s + (w.wind_speed || 0), 0) / weather.length : 0;

    const weatherSummary = weather.length
      ? `Temperature range: ${tempLow}°C to ${tempHigh}°C. Max rain probability: ${maxRain}%. ${hasSnow ? "Snow expected." : ""} Average wind: ${Math.round(avgWind)} km/h. Daily forecasts: ${weather.map((w: any) => `${w.date}: ${w.description}, ${w.temperature_low}°-${w.temperature_high}°C, rain ${w.rain_probability}%`).join("; ")}`
      : "No weather data available - suggest general items for the destination and season.";

    const eventsSummary = events.length
      ? `Planned events: ${events.map((e: any) => `${e.event_name} (${e.event_type || "general"}${e.location ? `, at ${e.location}` : ""})`).join("; ")}`
      : "No specific events planned.";

    const activitiesSummary = activities.length
      ? `Suggested activities: ${activities.map((a: any) => `${a.name} (${a.category})`).join("; ")}`
      : "";

    const outfitsSummary = outfits.length
      ? `Planned outfits: ${outfits.map((o: any) => `${o.title} for ${o.occasion}`).join("; ")}`
      : "";

    const originContext = trip.origin_city
      ? `Travelling FROM: ${trip.origin_city}, ${trip.origin_country || "unknown country"}.`
      : "Origin not specified.";

    const prompt = `You are an expert travel packing consultant. Generate a comprehensive, smart packing list.

TRIP CONTEXT:
- Destination: ${trip.destination}, ${trip.country || ""}
- ${originContext}
- Dates: ${trip.start_date} to ${trip.end_date} (${days} days)
- Trip type: ${trip.trip_type || "General"}
- Accommodation: ${trip.accommodation || "Not specified"}

WEATHER AT DESTINATION:
${weatherSummary}

EVENTS & ACTIVITIES:
${eventsSummary}
${activitiesSummary}
${outfitsSummary}

INSTRUCTIONS:
1. Consider the CLIMATE DIFFERENCE between origin and destination. If travelling from a warm climate (e.g. South Africa in summer) to a cold climate (e.g. Europe in winter), include layering advice, flight comfort wear, and transition clothing.
2. Consider the trip duration (${days} days) for quantities - don't overpack but ensure enough.
3. Include items for ALL planned events and activities (e.g. outdoor shoes for hikes, formal wear for dinners).
4. Include TRAVEL ESSENTIALS: passport, visas if needed between origin/destination countries, travel adapters (consider different plug types), currency, travel insurance docs.
5. Include FLIGHT COMFORT items for long-haul if origin and destination are far apart.
6. Weather-appropriate items: rain gear if rain likely, warm layers if cold, sun protection if hot.
7. Include toiletries, tech, and documents categories.
8. For each item, specify a sensible quantity based on trip length.

Return a JSON array of objects with this exact structure:
[{"name": "Item name", "category": "Category", "quantity": 1}]

Categories MUST be one of: Tops, Bottoms, Dresses, Outerwear, Shoes, Accessories, Underwear, Sleepwear, Swimwear, Toiletries, Tech, Documents, Flight Comfort, Layering

Be specific with item names (e.g. "Lightweight waterproof jacket" not just "jacket").
Return ONLY the JSON array, no other text.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a travel packing expert. Return only valid JSON arrays." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits depleted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "[]";

    // Parse the JSON from the response
    let items: any[];
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      items = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      console.error("Failed to parse AI response:", content);
      items = [];
    }

    if (items.length === 0) {
      return new Response(JSON.stringify({ error: "Could not generate suggestions. Try again." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Delete existing unpacked items (keep packed ones)
    await supabase.from("packing_items").delete().eq("trip_id", trip_id).eq("is_packed", false);

    // Insert new suggestions
    const packingItems = items.map((item: any, idx: number) => ({
      trip_id,
      name: item.name,
      category: item.category || "Other",
      quantity: item.quantity || 1,
      is_packed: false,
      order_index: idx,
    }));

    const { error: insertError } = await supabase.from("packing_items").insert(packingItems);
    if (insertError) throw insertError;

    return new Response(JSON.stringify({ success: true, count: items.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("suggest-packing error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
