import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

let _corsHeaders: Record<string, string> = {};

const jsonResponse = (body: unknown) =>
  new Response(JSON.stringify(body), {
    headers: { ..._corsHeaders, "Content-Type": "application/json" },
  });

interface TrendDestination {
  city: string;
  country: string;
  tagline: string;
  why_trending: string;
  highlights: string[];
  vibe: string;
  best_for: string[];
}

const parseTrends = (content: string): TrendDestination[] => {
  try {
    const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, 6).filter(
      (d: any) => d && typeof d.city === "string" && d.city.trim()
    );
  } catch {
    return [];
  }
};

serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;

  _corsHeaders = getCorsHeaders(req);

  try {
    const serperKey = Deno.env.get("SERPER_API_KEY");
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    const googleMapsKey = Deno.env.get("GOOGLE_MAPS_API_KEY");

    if (!serperKey) {
      console.error("SERPER_API_KEY not configured for trends");
      return jsonResponse({ trends: [] });
    }

    const searchResults: string[] = [];
    const searches = [
      "trending luxury travel destinations 2026",
      "best stylish places to travel this year",
      "most exciting destinations for fashion and culture 2026",
    ];

    for (const query of searches) {
      try {
        const res = await fetch("https://api.serper.dev/search", {
          method: "POST",
          headers: {
            "X-API-KEY": serperKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ q: query, num: 8 }),
        });
        if (!res.ok) continue;
        const data = await res.json();
        const organic = data.organic || [];
        for (const r of organic) {
          searchResults.push(`${r.title || ""} ${r.snippet || ""} ${r.link || ""}`);
        }
      } catch (e) {
        console.error("Serper search error:", e);
      }
    }

    if (searchResults.length === 0) {
      return jsonResponse({ trends: [] });
    }

    let destinations: TrendDestination[] = [];
    if (apiKey) {
      try {
        const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: `You are a luxury travel editorial writer for a high-end travel styling platform called Concierge Global. From the web search results provided, identify up to 6 destinations that are genuinely trending right now.

For each destination, produce a rich editorial entry that would make a style-conscious traveller want to visit. Write with authority and aspiration — think Condé Nast Traveller meets Net-a-Porter.

Return ONLY a JSON array with this exact structure (no other text):
[
  {
    "city": "City Name",
    "country": "Country",
    "tagline": "A short, punchy editorial line — max 8 words. E.g. 'The new capital of quiet luxury'",
    "why_trending": "2-3 sentences explaining WHY this destination is trending RIGHT NOW. Reference real events, openings, cultural moments, or seasonal relevance. Be specific, not generic.",
    "highlights": ["3-4 short bullet points about what makes this place extraordinary — think architecture, dining scene, fashion, art, natural beauty"],
    "vibe": "A 2-3 word mood descriptor, e.g. 'Coastal Minimalism', 'Cultural Renaissance', 'Alpine Elegance', 'Mediterranean Grandeur'",
    "best_for": ["2-3 trip types this suits, e.g. 'City Break', 'Fashion Week', 'Beach Escape', 'Art & Culture'"]
  }
]

Be specific and editorial. Avoid clichés like 'hidden gem' or 'something for everyone'. Write like you're curating for someone who has been everywhere and needs a reason to go.`,
              },
              {
                role: "user",
                content: searchResults.join("\n\n"),
              },
            ],
            temperature: 0.4,
          }),
        });
        if (aiRes.ok) {
          const aiData = await aiRes.json();
          const content = aiData?.choices?.[0]?.message?.content || "[]";
          destinations = parseTrends(content);
        }
      } catch (e) {
        console.error("AI parse error:", e);
      }
    }

    if (destinations.length === 0) {
      return jsonResponse({ trends: [] });
    }

    const unsplashKey = Deno.env.get("UNSPLASH_ACCESS_KEY");

    const getTrendImage = async (city: string, country: string, vibe: string): Promise<string | null> => {
      if (googleMapsKey && city) {
        try {
          const query = `${city} ${country} landmark architecture`;
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

      if (unsplashKey && city) {
        try {
          const searchQuery = `${city} ${country} architecture luxury`;
          const res = await fetch(
            `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchQuery)}&per_page=1&orientation=portrait&content_filter=high&client_id=${unsplashKey}`
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

      return null;
    };

    const trends = await Promise.all(
      destinations.map(async (dest) => ({
        ...dest,
        image_url: await getTrendImage(dest.city, dest.country, dest.vibe),
      }))
    );

    return jsonResponse({ trends });
  } catch (error) {
    console.error("Error:", error);
    return jsonResponse({ trends: [] });
  }
});
