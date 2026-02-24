import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const fallbackTrends = [
  { city: "Milan", trend: "Quiet luxury & structured tailoring", category: "Fashion", image_url: null },
  { city: "Paris", trend: "Layered neutrals & statement coats", category: "Style", image_url: null },
  { city: "Amalfi", trend: "Linen resort & gold accessories", category: "Destination", image_url: null },
  { city: "Tokyo", trend: "Streetwear meets minimalist travel", category: "Style", image_url: null },
  { city: "Marrakech", trend: "Earthy tones & artisan textiles", category: "Experience", image_url: null },
  { city: "Santorini", trend: "Breezy whites & statement swim", category: "Destination", image_url: null },
];

const allowedCategories = new Set(["Style", "Destination", "Experience", "Fashion"]);

const jsonResponse = (body: unknown) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const googleMapsKey = Deno.env.get("GOOGLE_MAPS_API_KEY");

    if (!lovableKey) {
      console.error("LOVABLE_API_KEY not configured");
      return jsonResponse({ trends: fallbackTrends });
    }

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
      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
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

    const getTrendImage = async (city: string): Promise<string | null> => {
      if (!googleMapsKey || !city) return null;

      try {
        const query = `${city} iconic city view`;
        const placesRes = await fetch(
          `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${googleMapsKey}`
        );

        if (!placesRes.ok) return null;

        const placesData = await placesRes.json();
        const firstPhotoRef = placesData?.results?.[0]?.photos?.[0]?.photo_reference;
        if (!firstPhotoRef) return null;

        return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1200&photo_reference=${firstPhotoRef}&key=${googleMapsKey}`;
      } catch {
        return null;
      }
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
