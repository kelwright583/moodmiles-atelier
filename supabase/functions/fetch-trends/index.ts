import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

const fallbackTrends = [
  { city: "Milan", trend: "Quiet luxury & structured tailoring", category: "Fashion", image_url: null },
  { city: "Paris", trend: "Layered neutrals & statement coats", category: "Style", image_url: null },
  { city: "Amalfi", trend: "Linen resort & gold accessories", category: "Destination", image_url: null },
  { city: "Tokyo", trend: "Streetwear meets minimalist travel", category: "Style", image_url: null },
  { city: "Marrakech", trend: "Earthy tones & artisan textiles", category: "Experience", image_url: null },
  { city: "Santorini", trend: "Breezy whites & statement swim", category: "Destination", image_url: null },
];

const allowedCategories = new Set(["Style", "Destination", "Experience", "Fashion"]);

let _corsHeaders: Record<string, string> = {};

const jsonResponse = (body: unknown) =>
  new Response(JSON.stringify(body), {
    headers: { ..._corsHeaders, "Content-Type": "application/json" },
  });

const parseTrends = (content: string) => {
  try {
    const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) return [];

    return parsed.slice(0, 6).map((item: any) => ({
      city: (item?.city || "Unknown").toString().trim(),
      trend: (item?.trend || "Travel style trend").toString().trim().slice(0, 120),
      category: allowedCategories.has(item?.category) ? item.category : "Style",
      image_url: null,
    }));
  } catch {
    return [];
  }
};

serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;

  _corsHeaders = getCorsHeaders(req);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ..._corsHeaders, "Content-Type": "application/json" },
      });
    }

    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    const googleMapsKey = Deno.env.get("GOOGLE_MAPS_API_KEY");

    if (!apiKey) {
      console.error("OPENAI_API_KEY not configured");
      return jsonResponse({ trends: fallbackTrends });
    }

    const chatUrl = "https://api.openai.com/v1/chat/completions";
    const chatModel = "gpt-4o-mini";

    const searches = [
      "trending travel destinations this week 2026 fashion style",
      "luxury travel trends what to wear 2026",
    ];

    const searchResults: string[] = [];

    if (firecrawlKey) {
      for (const query of searches) {
        try {
          const res = await fetch("https://api.firecrawl.dev/v1/search", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${firecrawlKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              query,
              limit: 5,
              tbs: "qdr:w",
            }),
          });

          if (!res.ok) {
            console.error("Firecrawl search failed:", res.status);
            continue;
          }

          const data = await res.json();
          if (Array.isArray(data?.data)) {
            for (const r of data.data) {
              searchResults.push(`${r.title || ""}: ${r.description || ""}`);
            }
          }
        } catch (e) {
          console.error("Search error:", e);
        }
      }
    }

    let trends = fallbackTrends;

    try {
      const aiRes = await fetch(chatUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: chatModel,
          messages: [
            {
              role: "system",
              content:
                'You curate travel and fashion trends. Return exactly 6 items as JSON array with fields: city, trend, category. category must be one of "Style", "Destination", "Experience", "Fashion". No markdown.',
            },
            {
              role: "user",
              content: `Curate this week's trends from:\n\n${searchResults.join("\n\n") || "Global luxury travel and fashion trends."}`,
            },
          ],
          temperature: 0.7,
        }),
      });

      if (aiRes.ok) {
        const aiData = await aiRes.json();
        const content = aiData?.choices?.[0]?.message?.content || "[]";
        const parsed = parseTrends(content);
        if (parsed.length > 0) {
          trends = parsed;
        }
      } else {
        const text = await aiRes.text();
        console.error("AI trends request failed:", aiRes.status, text.slice(0, 250));
      }
    } catch (e) {
      console.error("AI trends error:", e);
    }

    const unsplashKey = Deno.env.get("UNSPLASH_ACCESS_KEY");

    const getTrendImage = async (city: string): Promise<string | null> => {
      // Try Google Places first if key is set
      if (googleMapsKey && city) {
        try {
          const query = `${city} iconic city view`;
          const placesRes = await fetch(
            `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${googleMapsKey}`
          );
          if (placesRes.ok) {
            const placesData = await placesRes.json();
            const firstPhotoRef = placesData?.results?.[0]?.photos?.[0]?.photo_reference;
            if (firstPhotoRef) {
              return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1200&photo_reference=${firstPhotoRef}&key=${googleMapsKey}`;
            }
          }
        } catch {
          /* fall through to Unsplash */
        }
      }

      // Fallback: Unsplash search for city/destination
      if (unsplashKey && city) {
        try {
          const res = await fetch(
            `https://api.unsplash.com/search/photos?query=${encodeURIComponent(city + " travel")}&per_page=1&orientation=landscape&client_id=${unsplashKey}`
          );
          if (res.ok) {
            const data = await res.json();
            const photo = data?.results?.[0];
            if (photo?.urls?.regular) return photo.urls.regular;
          }
        } catch {
          /* fall through */
        }
      }

      // Last resort: deterministic placeholder (Picsum)
      const slug = city.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || "travel";
      return `https://picsum.photos/seed/${slug}/800/600`;
    };

    const enriched = await Promise.all(
      trends.slice(0, 6).map(async (trend) => ({
        ...trend,
        image_url: trend.image_url || (await getTrendImage(trend.city)),
      }))
    );

    return jsonResponse({ trends: enriched });
  } catch (error) {
    console.error("Error:", error);
    // Never bubble 500 to UI for this non-critical widget
    return jsonResponse({ trends: fallbackTrends });
  }
});
