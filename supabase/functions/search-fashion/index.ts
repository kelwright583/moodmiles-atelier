import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { parseBody, searchFashionSchema, type SearchFashionBody, ValidationError } from "../_shared/validation.ts";
import { extractUserIdFromJwt } from "../_shared/auth.ts";
import { checkRateLimit, recordUsage, RateLimitError } from "../_shared/rate-limit.ts";

interface SerperShoppingResult {
  title?: string;
  price?: string;
  extractedPrice?: number;
  image?: string;
  link?: string;
  source?: string;
  productId?: string;
  rating?: number;
  reviews?: number;
}

interface SerperShoppingResponse {
  shopping_results?: SerperShoppingResult[];
  searchMetadata?: { totalResults?: string };
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
    const { trip_id, destination, country, trip_type, occasion, start_date, end_date } = parseBody<SearchFashionBody>(searchFashionSchema, body);

    const userId = extractUserIdFromJwt(req);
    if (userId) {
      await checkRateLimit(userId, "search-fashion", trip_id);
    }

    // Derive season from trip dates
    const dateStr = start_date || end_date || "";
    const month = dateStr ? parseInt(dateStr.slice(5, 7), 10) : new Date().getMonth() + 1;
    const season = month >= 3 && month <= 5 ? "spring" : month >= 6 && month <= 8 ? "summer" : month >= 9 && month <= 11 ? "fall" : "winter";

    // Build 2-3 targeted Google Shopping queries (fast, marketplace-style)
    const queries = [
      `chic ${season} travel outfit ${destination} ${country || ""}`.trim(),
      `elegant ${trip_type || "travel"} fashion ${season} 2025`.trim(),
      occasion ? `${occasion} outfit ${season}` : `street style ${destination} ${season}`.trim(),
    ].filter((q) => q.length > 10);

    const allProducts: SerperShoppingResult[] = [];
    const seenLinks = new Set<string>();

    // Run all Serper queries in parallel (faster than sequential)
    const searchPromises = queries.slice(0, 3).map(async (query) => {
      try {
        const res = await fetch("https://api.serper.dev/shopping", {
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

        const data = (await res.json()) as SerperShoppingResponse;
        return data.shopping_results || [];
      } catch (e) {
        console.error("Serper search error for query:", query, e);
        return [];
      }
    });

    const resultsArrays = await Promise.all(searchPromises);
    for (const results of resultsArrays) {
      for (const r of results) {
        const link = r.link || r.productId;
        if (link && !seenLinks.has(link) && r.title) {
          seenLinks.add(link);
          allProducts.push(r);
        }
      }
    }

    if (allProducts.length === 0) {
      return new Response(JSON.stringify({ success: true, count: 0, message: "No results found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Map to outfit_suggestions schema (marketplace product cards)
    const rows = allProducts.slice(0, 20).map((p) => {
      const base: Record<string, unknown> = {
        trip_id,
        title: p.title || "Fashion find",
        occasion: occasion || `${season} travel`,
        description: p.source ? `Shop at ${p.source}` : null,
        items: [{
          category: "Other",
          name: p.title || "",
          color: "",
          search_terms: p.title || "",
        }],
        image_url: p.image || null,
        pinned: false,
      };
      // Marketplace columns (require migration 20260226100000)
      if (p.price) base.price = p.price;
      if (p.source) base.store = p.source;
      if (p.link) base.product_url = p.link;
      return base;
    });

    const { error: insertError } = await supabase.from("outfit_suggestions").insert(rows);
    if (insertError) {
      // If new columns don't exist, retry with base columns only
      const isColumnError = insertError.message?.includes("column") || insertError.code === "42703";
      if (isColumnError) {
        const fallbackRows = allProducts.slice(0, 20).map((p) => ({
          trip_id,
          title: p.title || "Fashion find",
          occasion: occasion || `${season} travel`,
          description: p.source ? `Shop at ${p.source}` : null,
          items: [{ category: "Other", name: p.title || "", color: "", search_terms: p.title || "" }],
          image_url: p.image || null,
          pinned: false,
        }));
        const { error: fallbackError } = await supabase.from("outfit_suggestions").insert(fallbackRows);
        if (fallbackError) throw fallbackError;
      } else {
        throw insertError;
      }
    }

    if (userId) {
      await recordUsage(userId, "search-fashion", trip_id, 0, rows.length * 0.0003);
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
