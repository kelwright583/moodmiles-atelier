import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

function extractImageUrlsFromMarkdown(markdown: string): string[] {
  const regex = /!\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g;
  const urls: string[] = [];
  let m;
  while ((m = regex.exec(markdown)) !== null) {
    const url = m[2];
    if (url && !url.startsWith("data:") && urls.indexOf(url) === -1) urls.push(url);
  }
  return urls;
}
import { parseBody, searchFashionSchema, type SearchFashionBody, ValidationError } from "../_shared/validation.ts";
import { extractUserIdFromJwt } from "../_shared/auth.ts";
import { checkRateLimit, recordUsage, RateLimitError } from "../_shared/rate-limit.ts";

serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;

  const corsHeaders = getCorsHeaders(req);

  try {
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY not configured");

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) throw new Error("OPENAI_API_KEY required");

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
    const { trip_id, destination, country, trip_type, occasion, start_date, end_date } = parseBody<SearchFashionBody>(searchFashionSchema, body);

    const userId = extractUserIdFromJwt(req);
    if (userId) {
      await checkRateLimit(userId, "search-fashion", trip_id);
    }

    // Derive season from trip dates (Northern Hemisphere convention; works for most travel)
    const dateStr = start_date || end_date || "";
    const month = dateStr ? parseInt(dateStr.slice(5, 7), 10) : new Date().getMonth() + 1;
    const season = month >= 3 && month <= 5 ? "spring" : month >= 6 && month <= 8 ? "summer" : month >= 9 && month <= 11 ? "fall" : "winter";
    const seasonLabel = season.charAt(0).toUpperCase() + season.slice(1);

    // Region hint from country (for broader, chic results)
    const regionHint = country
      ? /france|italy|spain|portugal|greece|germany|uk|england|netherlands|switzerland|austria/i.test(country)
        ? "European"
        : /japan|korea|thailand|vietnam|singapore/i.test(country)
          ? "Asian"
          : /australia|new zealand/i.test(country)
            ? "Southern Hemisphere"
            : country
      : "travel";

    // Build search queries: chic, trending, broader scope (country, region, season) — not just destination
    const queries = [
      `chic trending street style fashion ${season} 2024`,
      `elegant travel outfit lookbook ${season} chic`,
      country ? `${country} ${season} fashion street style outfit` : `chic ${season} travel fashion outfit`,
      regionHint !== "travel" ? `${regionHint} ${season} fashion what to wear` : `${destination} ${season} style outfit`,
      occasion ? `${occasion} outfit chic ${season}` : `minimalist chic outfit ${trip_type || "travel"} ${season}`,
    ];

    // Search for real fashion content using Firecrawl (parallel)
    const searchResultsArrays = await Promise.all(
      queries.slice(0, 4).map(async (query) => {
        try {
          const searchRes = await fetch("https://api.firecrawl.dev/v1/search", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              query,
              limit: 5,
              scrapeOptions: { formats: ["markdown", "links"] },
            }),
          });
          if (searchRes.ok) {
            const data = await searchRes.json();
            return data.data || [];
          }
          return [];
        } catch (e) {
          console.error("Search error for query:", query, e);
          return [];
        }
      })
    );
    const searchResults = searchResultsArrays.flat();

    if (searchResults.length === 0) {
      return new Response(JSON.stringify({ success: true, count: 0, message: "No results found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Enrich each source with extracted image URLs from markdown
    const enrichedSources = searchResults.slice(0, 8).map((r: any, i: number) => {
      const markdown = r.markdown || r.description || "";
      const imageUrls = extractImageUrlsFromMarkdown(markdown);
      return { ...r, _index: i, _imageUrls: imageUrls };
    });

    const combinedContent = enrichedSources
      .map((r: any) => `[Source ${r._index + 1}]: ${r.title || ""}\nURL: ${r.url || ""}\nImages: ${r._imageUrls?.length ? r._imageUrls.join(", ") : "none"}\n${(r.markdown || r.description || "").slice(0, 800)}`)
      .join("\n\n---\n\n");

    const chatUrl = "https://api.openai.com/v1/chat/completions";
    const chatModel = "gpt-4o-mini";

    const aiResponse = await fetch(chatUrl, {
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
            content: "You are a fashion curator extracting chic, trending outfit inspiration from web content. Prioritise elegant, stylish, and aspirational looks — the kind that appear in fashion lookbooks and street style roundups. Avoid generic or basic outfits. Extract real, concrete outfit ideas with source attribution.",
          },
          {
            role: "user",
            content: `From these web sources about chic, trending fashion (for ${destination}${country ? `, ${country}` : ""}, ${seasonLabel} season), extract up to 10 distinct outfit ideas. Prioritise elegant, stylish, and aspirational looks — not generic or basic. For each outfit, use the source_url and when the source lists Images:, pick the best matching image URL for that outfit. Include image_url when you have one from the source.\n\n${combinedContent}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "save_web_outfits",
              description: "Save outfit ideas extracted from web sources",
              parameters: {
                type: "object",
                properties: {
                  outfits: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: "Catchy outfit name" },
                        occasion: { type: "string", description: "When to wear it" },
                        description: { type: "string", description: "2-3 sentences about the look" },
                        source_url: { type: "string", description: "URL where this was found" },
                        source_name: { type: "string", description: "Name of the source site" },
                        image_url: { type: "string", description: "Direct URL of a fashion/outfit image from the source content (Images: ...). Use one of the listed image URLs when the outfit matches that source. Required when available." },
                        items: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              category: { type: "string" },
                              name: { type: "string" },
                              color: { type: "string" },
                              brand_suggestion: { type: "string" },
                              search_terms: { type: "string" },
                            },
                            required: ["category", "name", "color", "search_terms"],
                          },
                        },
                      },
                      required: ["title", "occasion", "description", "source_url", "items"],
                    },
                  },
                },
                required: ["outfits"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "save_web_outfits" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI extraction failed");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const { outfits } = JSON.parse(toolCall.function.arguments);

    // Use real image URLs from web sources (no DALL-E). Fallback: match by source_url to get first image from that page.
    let rows = outfits.map((o: any) => {
      let imageUrl = o.image_url;
      if (!imageUrl && o.source_url) {
        const match = enrichedSources.find((s: any) => s.url === o.source_url);
        if (match?._imageUrls?.[0]) imageUrl = match._imageUrls[0];
      }
      return {
        trip_id,
        title: o.title,
        occasion: o.occasion,
        description: `${o.description}\n\n📎 Source: ${o.source_name || "Web"}`,
        items: o.items,
        image_url: imageUrl || null,
        pinned: false,
      };
    });

    // Vision step: for rows WITH an image, describe what's actually IN the image so items match the photo
    const visionModel = "gpt-4o-mini";
    const visionPrompt = `Describe this fashion/outfit image. Return a JSON object with exactly:
{
  "title": "Short catchy outfit name (e.g. Relaxed Travel Look)",
  "occasion": "When to wear it (e.g. Travel Day, Casual Day)",
  "description": "2-3 sentences describing the actual outfit in the image",
  "items": [
    { "category": "Top|Bottom|Outerwear|Shoes|Accessory|Bag", "name": "Specific item name", "color": "Color", "search_terms": "search query for shopping" }
  ]
}
Categories: Top, Bottom, Dresses, Outerwear, Shoes, Accessory, Bag. Be accurate to what you SEE in the image. Return ONLY valid JSON.`;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row.image_url) continue;
      try {
        const visionRes = await fetch(chatUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: visionModel,
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: visionPrompt },
                  { type: "image_url", image_url: { url: row.image_url } },
                ],
              },
            ],
          }),
        });
        if (!visionRes.ok) continue;
        const visionData = await visionRes.json();
        const content = visionData.choices?.[0]?.message?.content || "";
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          rows[i] = {
            ...row,
            title: parsed.title || row.title,
            occasion: parsed.occasion || row.occasion,
            description: `${parsed.description || row.description}\n\n📎 Source: ${(outfits[i] as any).source_name || "Web"}`,
            items: Array.isArray(parsed.items) && parsed.items.length > 0
              ? parsed.items.map((it: any) => ({
                  category: it.category || "Other",
                  name: it.name || "",
                  color: it.color || "",
                  brand_suggestion: it.brand_suggestion || null,
                  search_terms: it.search_terms || it.name || it.category || "",
                }))
              : row.items,
          };
        }
      } catch (e) {
        console.error("Vision describe failed for image:", row.image_url, e);
        // Keep original row; items may not match image but we don't drop the outfit
      }
    }

    const { error: insertError } = await supabase.from("outfit_suggestions").insert(rows);
    if (insertError) throw insertError;

    if (userId) {
      await recordUsage(userId, "search-fashion", trip_id, 0, rows.length * 0.002);
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
