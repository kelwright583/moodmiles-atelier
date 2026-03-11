/// <reference path="../deno.d.ts" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { extractUserIdFromJwt } from "../_shared/auth.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

interface OutfitConcept {
  title: string;
  occasion: string;
  description: string;
  items: {
    category: string;
    name: string;
    color: string;
    brand_suggestion: string;
    search_terms: string;
  }[];
}

interface ResolvedProduct {
  id?: string;
  name: string;
  brand: string | null;
  price: number | null;
  currency: string;
  image_url: string | null;
  affiliate_url: string | null;
  category: string;
  source: string;
  is_rental: boolean;
  is_resale: boolean;
  original_price: number | null;
  original_currency: string | null;
}

// ── GPT-4o-mini: generate outfit concepts ─────────────────────────────────
async function generateOutfitConcepts(
  destination: string,
  country: string | null,
  tripType: string | null,
  styleKeywords: string[],
  openaiKey: string,
): Promise<OutfitConcept[]> {
  const styleContext = styleKeywords.length > 0 ? `Style preferences: ${styleKeywords.join(", ")}.` : "";

  const prompt = `You are a luxury fashion stylist creating shoppable outfit concepts for a ${tripType || "leisure"} trip to ${destination}${country ? `, ${country}` : ""}.
${styleContext}

Generate exactly 5 complete, buyable outfit concepts. Each outfit should be cohesive and stylish.

Respond with a JSON array (no markdown, no code blocks):
[
  {
    "title": "Riviera Dinner",
    "occasion": "Evening dinner",
    "description": "Effortlessly elegant for a warm evening out.",
    "items": [
      { "category": "Top", "name": "Silk slip top", "color": "Ivory", "brand_suggestion": "Vince", "search_terms": "ivory silk slip camisole" },
      { "category": "Bottom", "name": "Wide-leg trousers", "color": "Cream", "brand_suggestion": "The Row", "search_terms": "cream wide leg trousers" },
      { "category": "Shoes", "name": "Strappy sandals", "color": "Gold", "brand_suggestion": "Jimmy Choo", "search_terms": "gold strappy heeled sandals" },
      { "category": "Bag", "name": "Mini clutch", "color": "Gold", "brand_suggestion": "Saint Laurent", "search_terms": "gold mini evening clutch" }
    ]
  }
]

Rules: items must be 3–5 per outfit, categories: Top/Bottom/Dress/Shoes/Bag/Outerwear/Accessory`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
      max_tokens: 2000,
    }),
  });

  if (!res.ok) throw new Error(`OpenAI error: ${res.status}`);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || "[]";

  try {
    return JSON.parse(text);
  } catch {
    // Try to extract JSON array from text
    const match = text.match(/\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]);
    return [];
  }
}

// ── Map nationality string to region code ──────────────────────────────────
function nationalityToRegion(nationality: string | null): string {
  if (!nationality) return "global";
  const n = nationality.toLowerCase();
  if (n.includes("south africa") || n.includes("southern africa") || n === "za") return "za";
  if (n.includes("united kingdom") || n.includes("britain") || n.includes("england") || n.includes("scotland") || n.includes("wales") || n === "uk") return "uk";
  if (n.includes("united states") || n.includes("america") || n === "us" || n === "usa") return "us";
  if (n.includes("emirates") || n.includes("uae") || n.includes("dubai") || n === "ae") return "ae";
  if (n.includes("australia") || n === "au") return "au";
  return "global";
}

// ── Find product in DB via full-text/ilike search ─────────────────────────
async function findProductInDb(searchTerms: string, category: string, userRegion: string): Promise<ResolvedProduct | null> {
  const query = supabase
    .from("affiliate_products")
    .select("id, name, brand, price, currency, image_url, affiliate_url, category, source, is_rental, is_resale, metadata")
    .ilike("name", `%${searchTerms.split(" ").slice(0, 3).join("%")}%`)
    .eq("category", category)
    .not("image_url", "is", null)
    .not("affiliate_url", "is", null);

  // Filter by region: show user's region + global products
  if (userRegion && userRegion !== "global") {
    query.or(`region.eq.${userRegion},region.eq.global`);
  }

  const { data } = await query.limit(1).maybeSingle();

  if (!data) return null;
  const meta = (data.metadata as Record<string, unknown>) || {};
  return {
    id: data.id,
    name: data.name,
    brand: data.brand,
    price: data.price,
    currency: data.currency || "USD",
    image_url: data.image_url,
    affiliate_url: data.affiliate_url,
    category: data.category || category,
    source: data.source,
    is_rental: data.is_rental ?? false,
    is_resale: data.is_resale ?? false,
    original_price: (meta.original_price as number | null) ?? null,
    original_currency: (meta.original_currency as string | null) ?? null,
  };
}

// ── Serper shopping fallback for a single item ─────────────────────────────
async function findProductViaSerper(
  searchTerms: string,
  brandSuggestion: string,
  serperKey: string,
): Promise<ResolvedProduct | null> {
  const query = `${searchTerms} ${brandSuggestion} buy`.trim();

  try {
    const res = await fetch("https://google.serper.dev/shopping", {
      method: "POST",
      headers: { "X-API-KEY": serperKey, "Content-Type": "application/json" },
      body: JSON.stringify({ q: query, num: 5, gl: "us" }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const items: any[] = data?.shopping || [];
    const item = items.find((p) => p.imageUrl && p.link);
    if (!item) return null;

    return {
      name: item.title || searchTerms,
      brand: item.source || brandSuggestion || null,
      price: item.price ? parseFloat(String(item.price).replace(/[^0-9.]/g, "")) : null,
      currency: "USD",
      image_url: item.imageUrl || null,
      affiliate_url: item.link || null,
      category: "Other",
      source: "serper",
    };
  } catch {
    return null;
  }
}

// ── Resolve all items for an outfit concept ────────────────────────────────
async function resolveOutfitItems(
  items: OutfitConcept["items"],
  serperKey: string | null,
  userRegion: string,
): Promise<ResolvedProduct[]> {
  const resolved = await Promise.all(
    items.map(async (item) => {
      // 1. Try DB first (region-filtered)
      const dbProduct = await findProductInDb(item.search_terms, item.category, userRegion);
      if (dbProduct) return dbProduct;

      // 2. Serper fallback
      if (serperKey) {
        const serperProduct = await findProductViaSerper(
          item.search_terms,
          item.brand_suggestion,
          serperKey,
        );
        if (serperProduct) return {
          ...serperProduct,
          category: item.category,
          is_rental: false,
          is_resale: false,
          original_price: null,
          original_currency: null,
        };
      }

      // 3. Return stub (no image/link) — still useful for display
      return {
        name: item.name,
        brand: item.brand_suggestion || null,
        price: null,
        currency: "USD",
        image_url: null,
        affiliate_url: null,
        category: item.category,
        source: "stub",
        is_rental: false,
        is_resale: false,
        original_price: null,
        original_currency: null,
      } satisfies ResolvedProduct;
    }),
  );

  return resolved;
}

// ── Main handler ───────────────────────────────────────────────────────────
serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;

  const corsHeaders = getCorsHeaders(req);

  try {
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) throw new Error("OPENAI_API_KEY required");
    const serperKey = Deno.env.get("SERPER_API_KEY") || null;

    const body = await req.json();
    const tripId: string = body.trip_id;
    const destination: string = body.destination;
    const country: string | null = body.country || null;
    const tripType: string | null = body.trip_type || null;
    const styleKeywords: string[] = body.style_keywords || [];

    if (!tripId || !destination) {
      return new Response(
        JSON.stringify({ error: "trip_id and destination required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const userId = extractUserIdFromJwt(req);

    // Resolve user region: body param → profile nationality → global
    let userRegion: string = body.user_region || "global";
    if (userRegion === "global" && userId) {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("nationality")
          .eq("user_id", userId)
          .maybeSingle();
        if (profile?.nationality) {
          userRegion = nationalityToRegion(profile.nationality);
        }
      } catch { /* fall through to global */ }
    }

    // Check if we already have shoppable outfits for this trip
    const { data: existing } = await supabase
      .from("outfit_suggestions")
      .select("id")
      .eq("trip_id", tripId)
      .eq("source", "shoppable")
      .limit(1);

    if (existing && existing.length > 0 && !body.force_refresh) {
      // Return existing shoppable outfits
      const { data: outfits } = await supabase
        .from("outfit_suggestions")
        .select("*")
        .eq("trip_id", tripId)
        .eq("source", "shoppable")
        .order("created_at", { ascending: false });

      return new Response(
        JSON.stringify({ success: true, outfits: outfits || [], cached: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 1. Generate outfit concepts via GPT-4o-mini
    const concepts = await generateOutfitConcepts(
      destination,
      country,
      tripType,
      styleKeywords,
      openaiKey,
    );

    if (!concepts.length) {
      return new Response(
        JSON.stringify({ success: false, error: "Could not generate outfit concepts" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2. Resolve real products for each concept
    const resolvedOutfits = await Promise.all(
      concepts.map(async (concept) => {
        const products = await resolveOutfitItems(concept.items, serperKey, userRegion);
        const heroImage = products.find((p) => p.image_url)?.image_url || null;
        const totalPrice = products.reduce((sum, p) => sum + (p.price || 0), 0);

        return {
          concept,
          products,
          heroImage,
          totalPrice: totalPrice > 0 ? Math.round(totalPrice) : null,
        };
      }),
    );

    // 3. Save to outfit_suggestions + outfit_products
    const savedOutfits: any[] = [];

    for (const { concept, products, heroImage, totalPrice } of resolvedOutfits) {
      // Build the items array with product data merged in
      const enrichedItems = concept.items.map((item, idx) => {
        const product = products[idx];
        return {
          category: item.category,
          name: product?.name || item.name,
          color: item.color,
          brand_suggestion: product?.brand || item.brand_suggestion,
          search_terms: item.search_terms,
          // Enriched with real product data
          image_url: product?.image_url || null,
          affiliate_url: product?.affiliate_url || null,
          price: product?.price || null,
          currency: product?.currency || "USD",
          affiliate_source: product?.source || null,
          affiliate_product_id: product?.id || null,
          is_rental: product?.is_rental ?? false,
          is_resale: product?.is_resale ?? false,
          original_price: product?.original_price ?? null,
          original_currency: product?.original_currency ?? null,
        };
      });

      const { data: outfit, error: outfitError } = await supabase
        .from("outfit_suggestions")
        .insert({
          trip_id: tripId,
          user_id: userId || undefined,
          title: concept.title,
          occasion: concept.occasion,
          description: concept.description,
          image_url: heroImage,
          items: enrichedItems,
          source: "shoppable",
          store: `total: $${totalPrice || "?"}`,
          product_url: products.find((p) => p.affiliate_url)?.affiliate_url || null,
        })
        .select()
        .single();

      if (outfitError || !outfit) continue;

      // Save outfit_products junction rows for products with known DB ids
      const productRows = products
        .filter((p) => p.id)
        .map((p, idx) => ({
          outfit_suggestion_id: outfit.id,
          affiliate_product_id: p.id!,
          item_role: concept.items[idx]?.name || null,
        }));

      if (productRows.length > 0) {
        await supabase.from("outfit_products").insert(productRows);
      }

      savedOutfits.push({ ...outfit, products });
    }

    return new Response(
      JSON.stringify({ success: true, outfits: savedOutfits, cached: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
