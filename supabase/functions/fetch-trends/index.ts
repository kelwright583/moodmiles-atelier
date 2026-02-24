import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!firecrawlKey) throw new Error("FIRECRAWL_API_KEY not configured");

    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) throw new Error("LOVABLE_API_KEY not configured");

    // Search for trending travel + fashion content
    const searches = [
      "trending travel destinations this week 2026 fashion style",
      "luxury travel trends what to wear 2026",
    ];

    const searchResults: string[] = [];

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
            tbs: "qdr:w", // last week
          }),
        });
        const data = await res.json();
        if (data.data) {
          for (const r of data.data) {
            searchResults.push(`${r.title || ""}: ${r.description || ""}`);
          }
        }
      } catch (e) {
        console.error("Search error:", e);
      }
    }

    // Use AI to curate into structured trending items
    const aiRes = await fetch("https://api.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You curate travel & fashion trends. Given web search results, produce exactly 6 trending items as a JSON array. Each item has: "city" (destination name), "trend" (one-line fashion/travel insight, max 15 words), "category" (one of: "Style", "Destination", "Experience", "Fashion"). Only output the JSON array, no markdown.`,
          },
          {
            role: "user",
            content: `Here are this week's search results:\n\n${searchResults.join("\n\n")}\n\nProduce 6 curated trending items.`,
          },
        ],
        temperature: 0.7,
      }),
    });

    const aiData = await aiRes.json();
    let trends = [];
    try {
      const content = aiData.choices?.[0]?.message?.content || "[]";
      // Strip markdown code fences if present
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      trends = JSON.parse(cleaned);
    } catch (e) {
      console.error("AI parse error:", e, aiData);
      trends = [
        { city: "Milan", trend: "Quiet luxury & structured tailoring", category: "Fashion" },
        { city: "Paris", trend: "Layered neutrals & statement coats", category: "Style" },
        { city: "Amalfi", trend: "Linen resort & gold accessories", category: "Destination" },
      ];
    }

    return new Response(JSON.stringify({ trends }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
