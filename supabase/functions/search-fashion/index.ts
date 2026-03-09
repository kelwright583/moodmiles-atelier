import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { parseBody, searchFashionSchema, type SearchFashionBody, ValidationError } from "../_shared/validation.ts";
import { extractUserIdFromJwt } from "../_shared/auth.ts";
import { checkRateLimit, recordUsage, RateLimitError } from "../_shared/rate-limit.ts";

interface SerperImageResult {
  title?: string;
  imageUrl?: string;
  imageWidth?: number;
  imageHeight?: number;
  thumbnailUrl?: string;
  thumbnailWidth?: number;
  thumbnailHeight?: number;
  source?: string;
  link?: string;
  googleUrl?: string;
}

interface SerperImageResponse {
  images?: SerperImageResult[];
}

serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;

  const corsHeaders = getCorsHeaders(req);

  try {
    const SERPER_API_KEY = Deno.env.get("SERPER_API_KEY");
    if (!SERPER_API_KEY) throw new Error("SERPER_API_KEY not configured");

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
    const { trip_id, destination, country, trip_type, occasion, start_date, end_date, user_search_query } = parseBody<SearchFashionBody>(searchFashionSchema, body);

    const userId = extractUserIdFromJwt(req);
    if (userId) {
      await checkRateLimit(userId, "search-fashion", trip_id);
    }

    // Derive season from trip dates
    const dateStr = start_date || end_date || "";
    const month = dateStr ? parseInt(dateStr.slice(5, 7), 10) : new Date().getMonth() + 1;
    const season = month >= 3 && month <= 5 ? "spring" : month >= 6 && month <= 8 ? "summer" : month >= 9 && month <= 11 ? "fall" : "winter";

    const siteScope = "site:vogue.com OR site:harpersbazaar.com OR site:net-a-porter.com OR site:farfetch.com OR site:ssense.com OR site:mytheresa.com OR site:matchesfashion.com OR site:editorialist.com";
    const userPrefix = user_search_query ? `${user_search_query} ` : "";

    const queries = [
      `${userPrefix}${season} ${destination} editorial fashion campaign ${siteScope}`,
      `${userPrefix}${trip_type || "travel"} outfit ${season} 2024 luxury editorial ${siteScope}`,
      `${userPrefix}${destination} street style ${season} high fashion ${siteScope}`,
      occasion
        ? `${userPrefix}${occasion} outfit ${season} luxury editorial ${siteScope}`
        : `${userPrefix}resort wear ${season} editorial ${siteScope}`,
      `${userPrefix}${destination} ${country || ""} fashion week street style ${season} ${siteScope}`.trim(),
      `${userPrefix}elevated ${season} travel wardrobe ${destination} editorial ${siteScope}`,
    ].filter((q) => q.length > 10);

    const allResults: SerperImageResult[] = [];
    const seenLinks = new Set<string>();

    // Run all 6 queries in parallel
    const searchPromises = queries.map(async (query) => {
      try {
        const res = await fetch("https://google.serper.dev/images", {
          method: "POST",
          headers: {
            "X-API-KEY": SERPER_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            q: query,
            gl: "us",
            hl: "en",
            num: 15,
          }),
        });

        if (!res.ok) {
          console.error("Serper error:", res.status, await res.text());
          return [];
        }

        const data = (await res.json()) as SerperImageResponse;
        return data.images || [];
      } catch (e) {
        console.error("Serper image search error for query:", query, e);
        return [];
      }
    });

    const resultsArrays = await Promise.all(searchPromises);
    for (const results of resultsArrays) {
      for (const r of results) {
        const linkKey = r.link || r.imageUrl;
        if (linkKey && !seenLinks.has(linkKey) && r.title) {
          seenLinks.add(linkKey);
          allResults.push(r);
        }
      }
    }

    if (allResults.length === 0) {
      return new Response(JSON.stringify({ success: true, count: 0, message: "No results found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rows = allResults.slice(0, 20).map((r) => ({
      trip_id,
      title: r.title || "Style inspiration",
      occasion: occasion || `${season} ${trip_type || "travel"}`,
      description: r.source ? `From ${r.source}` : null,
      items: [{
        category: "Other",
        name: r.title || "",
        color: "",
        search_terms: r.title || "",
      }],
      image_url: r.imageUrl || r.thumbnailUrl || null,
      product_url: r.link || null,
      store: r.source || null,
      pinned: false,
    }));

    let insertErrorMessage: string | null = null;
    const { error: insertError } = await supabase.from("outfit_suggestions").insert(rows);
    if (insertError) {
      insertErrorMessage = insertError.message;
      // If new columns don't exist, retry with base columns only
      const isColumnError = insertError.message?.includes("column") || insertError.code === "42703";
      if (isColumnError) {
        const fallbackRows = allResults.slice(0, 20).map((r) => ({
          trip_id,
          title: r.title || "Style inspiration",
          occasion: occasion || `${season} ${trip_type || "travel"}`,
          description: r.source ? `From ${r.source}` : null,
          items: [{ category: "Other", name: r.title || "", color: "", search_terms: r.title || "" }],
          image_url: r.imageUrl || r.thumbnailUrl || null,
          pinned: false,
        }));
        const { error: fallbackError } = await supabase.from("outfit_suggestions").insert(fallbackRows);
        if (fallbackError) throw fallbackError;
        insertErrorMessage = `column error → fallback used: ${insertError.message}`;
      } else {
        throw insertError;
      }
    }

    if (userId) {
      await recordUsage(userId, "search-fashion", trip_id, 0, rows.length * 0.0003);
    }

    return new Response(JSON.stringify({
      success: true,
      count: allResults.length,
      serper_results: allResults.length,
      insert_attempted: rows.length,
      sample_row: rows[0] || null,
      insert_error: insertErrorMessage,
    }), {
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
