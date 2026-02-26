import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { parseBody, suggestActivitiesSchema, type SuggestActivitiesBody, ValidationError } from "../_shared/validation.ts";
import { extractUserIdFromJwt } from "../_shared/auth.ts";
import { checkRateLimit, recordUsage, RateLimitError } from "../_shared/rate-limit.ts";

const VIATOR_BASE = "https://api.viator.com/partner";

interface ViatorProduct {
  productCode?: string;
  title?: string;
  shortDescription?: string;
  webURL?: string;
  productPhotos?: { url?: string }[];
  rating?: { value?: number; count?: number };
  price?: { formattedPrice?: string };
  priceFrom?: { formattedPrice?: string };
}

interface ActivityRow {
  name: string;
  description: string;
  category: string;
  location: string;
  price_level: string | null;
  price_from?: string | null;
  source_url: string | null;
  booking_url: string | null;
  image_url?: string | null;
  rating?: number | null;
}

interface ViatorSearchResponse {
  products?: ViatorProduct[];
}

serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;

  const corsHeaders = getCorsHeaders(req);

  try {
    const VIATOR_API_KEY = Deno.env.get("VIATOR_API_KEY");
    const GOOGLE_MAPS_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");
    const apiKey = Deno.env.get("OPENAI_API_KEY");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { trip_id, destination, country, trip_type, latitude, longitude } = parseBody<SuggestActivitiesBody>(suggestActivitiesSchema, body);

    const userId = extractUserIdFromJwt(req);
    if (userId) {
      await checkRateLimit(userId, "suggest-activities", trip_id);
    }

    const locationStr = `${destination}${country ? `, ${country}` : ""}`;

    let activities: ActivityRow[] = [];

    // Step 1: Try Viator API first (fast, real bookable experiences)
    if (VIATOR_API_KEY) {
      try {
        const searchTerm = `things to do ${locationStr} ${trip_type || "tours"}`;
        const viatorRes = await fetch(`${VIATOR_BASE}/search/freetext`, {
          method: "POST",
          headers: {
            "exp-api-key": VIATOR_API_KEY,
            "Accept-Language": "en-US",
            "Accept": "application/json;version=2.0",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            searchTerm,
            searchType: "PRODUCTS",
            currencyCode: "USD",
            topX: "1-20",
          }),
        });

        if (viatorRes.ok) {
          const viatorData = (await viatorRes.json()) as ViatorSearchResponse;
          const products = viatorData.products || [];

          activities = products.slice(0, 15).map((p) => {
            const priceStr = p.priceFrom?.formattedPrice || p.price?.formattedPrice;
            return {
              name: p.title || "Experience",
              description: p.shortDescription || "",
              category: "Experience",
              location: locationStr,
              price_level: priceStr ? "$$" : null,
              price_from: priceStr || null,
              source_url: p.webURL || null,
              booking_url: p.webURL || null,
              image_url: p.productPhotos?.[0]?.url || null,
              rating: p.rating?.value || null,
            };
          });
          console.log(`Viator returned ${activities.length} products`);
        } else {
          console.error("Viator API error:", viatorRes.status, await viatorRes.text());
        }
      } catch (e) {
        console.error("Viator search failed:", e);
      }
    }

    // Step 2: Fallback to GPT + Google Places when no Viator or empty results
    if (activities.length === 0 && apiKey) {
      const prompt = `You are a luxury travel concierge for ${locationStr}. Suggest 12 REAL, bookable experiences for a ${trip_type || "leisure"} trip.

CRITICAL: These must be REAL places and experiences that actually exist. Include actual venue/tour names, real addresses.

Include a mix of: Cultural experiences, Fine dining, Nightlife, Shopping, Outdoor activities, Unique local experiences.

For each, provide: name, description (2-3 sentences), category (Culture, Dining, Nightlife, Shopping, Outdoor, Experience), location, price_level (Free, $, $$, $$$), source_url, booking_url.`;

      const chatUrl = "https://api.openai.com/v1/chat/completions";
      const response = await fetch(chatUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "You are a luxury travel concierge. Return REAL, verifiable experiences." },
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
                          source_url: { type: "string" },
                          booking_url: { type: "string" },
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

      const { activities: aiActivities } = JSON.parse(toolCall.function.arguments);
      activities = aiActivities.map((a: any) => ({
        ...a,
        image_url: null,
        rating: null,
        price_from: null,
      }));
    }

    if (activities.length === 0) {
      return new Response(JSON.stringify({ error: "No experiences found. Add VIATOR_API_KEY for real bookable activities, or OPENAI_API_KEY for AI suggestions." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 3: Enrich with Google Places for ratings and images (when not from Viator)
    let enrichedActivities = activities;
    if (GOOGLE_MAPS_API_KEY && latitude && longitude) {
      try {
        enrichedActivities = await Promise.all(
          activities.map(async (activity) => {
            if (activity.image_url) return activity;
            const searchUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(activity.name + " " + destination)}&inputtype=textquery&fields=rating,photos,formatted_address,place_id&locationbias=circle:5000@${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`;
            const res = await fetch(searchUrl);
            const data = await res.json();
            const candidate = data.candidates?.[0];
            let imageUrl = activity.image_url;
            if (candidate?.photos?.[0]?.photo_reference) {
              imageUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=600&photo_reference=${candidate.photos[0].photo_reference}&key=${GOOGLE_MAPS_API_KEY}`;
            }
            const googleMapsUrl = candidate?.place_id
              ? `https://www.google.com/maps/place/?q=place_id:${candidate.place_id}`
              : null;
            return {
              ...activity,
              rating: activity.rating ?? candidate?.rating ?? null,
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

    await supabase.from("activity_suggestions").delete().eq("trip_id", trip_id);

    const rows = enrichedActivities.map((a: any) => ({
      trip_id,
      name: a.name,
      description: a.description,
      category: a.category,
      location: a.location,
      rating: a.rating ?? null,
      price_level: a.price_level ?? null,
      price_from: a.price_from ?? null,
      image_url: a.image_url ?? null,
      source_url: a.source_url ?? null,
      booking_url: a.booking_url ?? null,
    }));

    const { error: insertError } = await supabase.from("activity_suggestions").insert(rows);
    if (insertError) throw insertError;

    if (userId) {
      await recordUsage(userId, "suggest-activities", trip_id, 0, 0.05);
    }

    return new Response(JSON.stringify({ success: true, count: rows.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const status = err instanceof RateLimitError ? 429 : err instanceof ValidationError ? 400 : 500;
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: msg }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
