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
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { trip_id, destination, country, trip_type, latitude, longitude } = await req.json();
    if (!trip_id || !destination) throw new Error("Missing trip_id or destination");

    const locationStr = `${destination}${country ? `, ${country}` : ""}`;

    // Step 1: Search for real experiences via Firecrawl
    let webExperiences: any[] = [];
    if (FIRECRAWL_API_KEY) {
      try {
        const searches = [
          `best ${trip_type || "luxury"} experiences ${locationStr} 2025 2026 booking`,
          `top things to do ${locationStr} tours activities book online`,
          `${locationStr} restaurant reservations fine dining booking`,
        ];

        for (const query of searches) {
          const searchRes = await fetch("https://api.firecrawl.dev/v1/search", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              query,
              limit: 5,
              scrapeOptions: { formats: ["markdown"] },
            }),
          });

          if (searchRes.ok) {
            const searchData = await searchRes.json();
            if (searchData.data) {
              webExperiences.push(...searchData.data);
            }
          }
        }
        console.log(`Firecrawl returned ${webExperiences.length} results`);
      } catch (e) {
        console.error("Firecrawl search failed:", e);
      }
    }

    // Step 2: AI processes web results + generates structured suggestions
    const webContext = webExperiences.length > 0
      ? `\n\nHere are REAL experiences found online. Extract and prioritize these, keeping their source URLs and booking links:\n${webExperiences
          .slice(0, 12)
          .map((r: any) => `- Title: ${r.title || "Unknown"}\n  URL: ${r.url || ""}\n  Content: ${(r.markdown || r.description || "").slice(0, 500)}`)
          .join("\n\n")}`
      : "";

    const prompt = `You are a luxury travel concierge for ${locationStr}. Suggest 12 REAL, bookable experiences for a ${trip_type || "leisure"} trip.

CRITICAL: These must be REAL places and experiences that actually exist. Include actual venue/tour names, real addresses, and real booking or website URLs.

Include a mix of:
- Cultural experiences (museums, galleries, historic sites, tours)
- Fine dining & restaurants (with reservation links if possible)
- Nightlife & entertainment
- Shopping (boutiques, markets, designer stores)
- Outdoor activities and day trips
- Unique local experiences (cooking classes, wine tastings, etc.)

For each, provide:
- name: The actual name of the venue/experience
- description: 2-3 sentences about what makes it special
- category: One of Culture, Dining, Nightlife, Shopping, Outdoor, Experience
- location: Real address or area
- price_level: Free, $, $$, $$$
- source_url: The website URL where more info can be found
- booking_url: Direct booking/reservation URL if available (or website URL)
${webContext}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a luxury travel concierge. Return REAL, verifiable experiences with actual URLs." },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "save_activities",
              description: "Save real activity suggestions with booking links",
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
                        source_url: { type: "string", description: "Website URL for more info" },
                        booking_url: { type: "string", description: "Direct booking/reservation URL" },
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

    // Step 3: Enrich with Google Places for ratings and images
    let enrichedActivities = activities;
    if (GOOGLE_MAPS_API_KEY && latitude && longitude) {
      try {
        enrichedActivities = await Promise.all(
          activities.map(async (activity: any) => {
            const searchUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(activity.name + " " + destination)}&inputtype=textquery&fields=rating,photos,formatted_address,place_id&locationbias=circle:5000@${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`;
            const res = await fetch(searchUrl);
            const data = await res.json();
            const candidate = data.candidates?.[0];
            let imageUrl = null;
            if (candidate?.photos?.[0]?.photo_reference) {
              imageUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=600&photo_reference=${candidate.photos[0].photo_reference}&key=${GOOGLE_MAPS_API_KEY}`;
            }
            // Use Google Maps URL as fallback source
            const googleMapsUrl = candidate?.place_id
              ? `https://www.google.com/maps/place/?q=place_id:${candidate.place_id}`
              : null;
            return {
              ...activity,
              rating: candidate?.rating || null,
              image_url: imageUrl,
              location: candidate?.formatted_address || activity.location,
              source_url: activity.source_url || googleMapsUrl,
              booking_url: activity.booking_url || activity.source_url || googleMapsUrl,
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
      source_url: a.source_url || null,
      booking_url: a.booking_url || null,
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
