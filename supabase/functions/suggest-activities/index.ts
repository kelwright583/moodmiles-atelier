import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const GOOGLE_MAPS_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { trip_id, destination, country, trip_type, latitude, longitude } = await req.json();
    if (!trip_id || !destination) throw new Error("Missing trip_id or destination");

    // Step 1: AI generates activity suggestions
    const prompt = `You are a luxury travel concierge. Suggest 10 must-do activities for a ${trip_type || "leisure"} trip to ${destination}${country ? `, ${country}` : ""}.

Include a mix of:
- Cultural experiences (museums, galleries, historic sites)
- Food & dining (restaurants, food tours, markets)
- Nightlife & entertainment
- Shopping districts and boutiques
- Outdoor activities and day trips
- Hidden gems and local favorites

For each, provide: name, description (2 sentences), category (one of: Culture, Dining, Nightlife, Shopping, Outdoor, Experience), location (specific area/address if known), and price_level (Free, $, $$, $$$).`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a luxury travel concierge. Return structured activity suggestions." },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "save_activities",
              description: "Save activity suggestions",
              parameters: {
                type: "object",
                properties: {
                  activities: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        description: { type: "string" },
                        category: { type: "string" },
                        location: { type: "string" },
                        price_level: { type: "string" },
                      },
                      required: ["name", "description", "category", "location"],
                    },
                  },
                },
                required: ["activities"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "save_activities" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI generation failed");
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const { activities } = JSON.parse(toolCall.function.arguments);

    // Step 2: Optionally enrich with Google Places ratings
    let enrichedActivities = activities;
    if (GOOGLE_MAPS_API_KEY && latitude && longitude) {
      try {
        enrichedActivities = await Promise.all(
          activities.map(async (activity: any) => {
            const searchUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(activity.name + " " + destination)}&inputtype=textquery&fields=rating,photos,formatted_address&locationbias=circle:5000@${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`;
            const res = await fetch(searchUrl);
            const data = await res.json();
            const candidate = data.candidates?.[0];
            let imageUrl = null;
            if (candidate?.photos?.[0]?.photo_reference) {
              imageUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${candidate.photos[0].photo_reference}&key=${GOOGLE_MAPS_API_KEY}`;
            }
            return {
              ...activity,
              rating: candidate?.rating || null,
              image_url: imageUrl,
              location: candidate?.formatted_address || activity.location,
            };
          })
        );
      } catch (e) {
        console.error("Google Places enrichment failed:", e);
      }
    }

    // Delete old and insert new
    await supabase.from("activity_suggestions").delete().eq("trip_id", trip_id);

    const rows = enrichedActivities.map((a: any) => ({
      trip_id,
      name: a.name,
      description: a.description,
      category: a.category,
      location: a.location,
      rating: a.rating || null,
      price_level: a.price_level || null,
      image_url: a.image_url || null,
    }));

    const { error: insertError } = await supabase.from("activity_suggestions").insert(rows);
    if (insertError) throw insertError;

    return new Response(JSON.stringify({ success: true, count: rows.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
