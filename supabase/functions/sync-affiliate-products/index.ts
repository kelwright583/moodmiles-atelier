/// <reference path="../deno.d.ts" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

interface AffiliateProduct {
  source: string;
  product_id: string;
  name: string;
  brand: string | null;
  price: number | null;
  currency: string;
  image_url: string | null;
  affiliate_url: string;
  category: string | null;
  tags: string[];
  is_rental: boolean;
  is_resale: boolean;
  metadata: Record<string, unknown>;
  region: string;
}

function mapCategory(raw: string): string {
  const r = raw.toLowerCase();
  if (r.includes("top") || r.includes("blouse") || r.includes("shirt") || r.includes("tee")) return "Top";
  if (r.includes("trouser") || r.includes("jean") || r.includes("skirt") || r.includes("short")) return "Bottom";
  if (r.includes("dress") || r.includes("jumpsuit") || r.includes("romper") || r.includes("gown")) return "Dress";
  if (r.includes("shoe") || r.includes("boot") || r.includes("sandal") || r.includes("heel")) return "Shoes";
  if (r.includes("bag") || r.includes("purse") || r.includes("tote") || r.includes("clutch")) return "Bag";
  if (r.includes("jacket") || r.includes("coat") || r.includes("blazer") || r.includes("cardi")) return "Outerwear";
  if (r.includes("scarf") || r.includes("hat") || r.includes("belt") || r.includes("jewel") || r.includes("sunglass")) return "Accessory";
  return "Other";
}

// ── ASOS via RapidAPI (global) ─────────────────────────────────────────────
async function fetchFromAsos(query: string, limit: number): Promise<AffiliateProduct[]> {
  const apiKey = Deno.env.get("ASOS_RAPIDAPI_KEY");
  if (!apiKey) return [];
  try {
    const res = await fetch(
      `https://asos2.p.rapidapi.com/products/v2/list?store=US&offset=0&categoryId=4209&limit=${limit}&q=${encodeURIComponent(query)}&currency=USD&sizeSchema=US&lang=en-US`,
      { headers: { "X-RapidAPI-Key": apiKey, "X-RapidAPI-Host": "asos2.p.rapidapi.com" } },
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.products || []).slice(0, limit).map((p: any) => ({
      source: "asos",
      product_id: String(p.id),
      name: p.name || "",
      brand: p.brandName || null,
      price: p.price?.current?.value ?? null,
      currency: p.price?.currency || "USD",
      image_url: p.imageUrl ? `https://${p.imageUrl}` : null,
      affiliate_url: `https://www.asos.com/prd/${p.id}`,
      category: mapCategory(p.productType?.name || ""),
      tags: [query, p.brandName || ""].filter(Boolean),
      is_rental: false, is_resale: false,
      metadata: { colourWayId: p.colourWayId },
      region: "global",
    }));
  } catch { return []; }
}

// ── Farfetch via Rakuten (global) ──────────────────────────────────────────
async function fetchFromFarfetch(query: string, limit: number): Promise<AffiliateProduct[]> {
  const rakutenKey = Deno.env.get("RAKUTEN_API_KEY");
  if (!rakutenKey) return [];
  try {
    const res = await fetch(
      `https://api.linksynergy.com/productsearch/1.0?keyword=${encodeURIComponent(query)}&mid=44239&max=${limit}&resultsperpage=${limit}`,
      { headers: { Authorization: `Bearer ${rakutenKey}` } },
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.result?.item || []).slice(0, limit).map((p: any) => ({
      source: "farfetch",
      product_id: String(p.linkid || p.productid),
      name: p.productname || "",
      brand: p.merchantname || null,
      price: p.saleprice ? parseFloat(String(p.saleprice).replace(/[^0-9.]/g, "")) : null,
      currency: "USD",
      image_url: p.imageurl || null,
      affiliate_url: p.clickurl || "",
      category: mapCategory(p.category || ""),
      tags: [query, p.merchantname || ""].filter(Boolean),
      is_rental: false, is_resale: false,
      metadata: { merchantId: p.mid },
      region: "global",
    }));
  } catch { return []; }
}

// ── Rent the Runway (global rental) ───────────────────────────────────────
async function fetchFromRentTheRunway(query: string, limit: number): Promise<AffiliateProduct[]> {
  const apiKey = Deno.env.get("RENTTHERUNWAY_API_KEY");
  if (!apiKey) return [];
  try {
    const accountSid = apiKey.split(":")[0];
    const authToken = apiKey.split(":")[1];
    const credentials = btoa(`${accountSid}:${authToken}`);
    const res = await fetch(
      `https://api.impact.com/Mediapartners/${accountSid}/Catalogs/Items?CatalogId=12285&SearchText=${encodeURIComponent(query)}&PageSize=${limit}`,
      { headers: { Authorization: `Basic ${credentials}`, Accept: "application/json" } },
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.Items || []).slice(0, limit).map((p: any, i: number) => ({
      source: "renttherunway",
      product_id: String(p.Id || `rtr_${Date.now()}_${i}`),
      name: p.Name || "",
      brand: p.BrandName || p.Designer || null,
      price: p.RentalPrice4Day ?? p.SalePrice ?? null,
      currency: "USD",
      image_url: p.ImageUrl || p.SmallImageUrl || null,
      affiliate_url: p.TrackingLink || p.DirectUrl || "",
      category: mapCategory(p.CategoryName || p.SubcategoryName || "Dress"),
      tags: [query, "rent", p.Designer || ""].filter(Boolean),
      is_rental: true, is_resale: false,
      metadata: { rental_price_4day: p.RentalPrice4Day, retail_value: p.RetailValue, sizes: p.AvailableSizes },
      region: "global",
    }));
  } catch { return []; }
}

// ── By Rotation (global rental) ────────────────────────────────────────────
async function fetchFromByRotation(query: string, limit: number): Promise<AffiliateProduct[]> {
  const apiKey = Deno.env.get("BYROTATION_API_KEY");
  if (!apiKey) return [];
  try {
    const res = await fetch(
      `https://api.byrotation.com/v1/listings?q=${encodeURIComponent(query)}&limit=${limit}&available=true`,
      { headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" } },
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.listings || data?.items || []).slice(0, limit).map((p: any, i: number) => ({
      source: "byrotation",
      product_id: String(p.id || `br_${Date.now()}_${i}`),
      name: p.title || p.name || "",
      brand: p.brand || p.designer || null,
      price: p.price_4_days ?? p.rental_price ?? p.price ?? null,
      currency: p.currency || "GBP",
      image_url: p.image_url || p.images?.[0]?.url || null,
      affiliate_url: p.url || p.listing_url || `https://byrotation.com/listing/${p.id}`,
      category: mapCategory(p.category || p.type || "Dress"),
      tags: [query, "rent", p.brand || ""].filter(Boolean),
      is_rental: true, is_resale: false,
      metadata: { size: p.size, condition: p.condition, location: p.lender_location },
      region: "global",
    }));
  } catch { return []; }
}

// ── Vestiaire Collective via Awin (global resale) ──────────────────────────
async function fetchFromVestiaire(query: string, limit: number): Promise<AffiliateProduct[]> {
  const apiKey = Deno.env.get("VESTIAIRE_API_KEY");
  if (!apiKey) return [];
  try {
    const [publisherId, awinApiKey] = apiKey.split(":");
    const res = await fetch(
      `https://productdata.awin.com/datafeed/v2/products?advertiserId=12052&keyword=${encodeURIComponent(query)}&pageSize=${limit}&publisherId=${publisherId}`,
      { headers: { Authorization: `Bearer ${awinApiKey}`, Accept: "application/json" } },
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.products || data?.items || []).slice(0, limit).map((p: any, i: number) => ({
      source: "vestiaire",
      product_id: String(p.id || p.aw_product_id || `vc_${Date.now()}_${i}`),
      name: p.product_name || p.name || "",
      brand: p.brand_name || p.merchant_name || null,
      price: p.search_price ? parseFloat(String(p.search_price).replace(/[^0-9.]/g, "")) : null,
      currency: p.currency_code || "GBP",
      image_url: p.aw_image_url || p.merchant_image_url || null,
      affiliate_url: p.aw_deep_link || p.merchant_deep_link || "",
      category: mapCategory(p.category_name || p.product_type || ""),
      tags: [query, "pre-loved", "resale", p.brand_name || ""].filter(Boolean),
      is_rental: false, is_resale: true,
      metadata: {
        original_price: p.rrp_price ? parseFloat(String(p.rrp_price).replace(/[^0-9.]/g, "")) : null,
        original_currency: p.currency_code || "GBP",
        condition: p.condition || p.item_condition,
        size: p.size,
        authentication: p.authentication_status,
      },
      region: "global",
    }));
  } catch { return []; }
}

// ── Serper Shopping — generic fallback ────────────────────────────────────
async function fetchFromSerper(query: string, limit: number): Promise<AffiliateProduct[]> {
  const serperKey = Deno.env.get("SERPER_API_KEY");
  if (!serperKey) return [];
  try {
    const res = await fetch("https://google.serper.dev/shopping", {
      method: "POST",
      headers: { "X-API-KEY": serperKey, "Content-Type": "application/json" },
      body: JSON.stringify({ q: query, num: limit, gl: "us" }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.shopping || []).slice(0, limit).map((p: any, i: number) => ({
      source: "serper",
      product_id: `serper_${Date.now()}_${i}_${encodeURIComponent(p.title || "").slice(0, 20)}`,
      name: p.title || "",
      brand: p.source || null,
      price: p.price ? parseFloat(String(p.price).replace(/[^0-9.]/g, "")) : null,
      currency: "USD",
      image_url: p.imageUrl || null,
      affiliate_url: p.link || "",
      category: null,
      tags: [query, p.source || ""].filter(Boolean),
      is_rental: false, is_resale: false,
      metadata: { rating: p.rating, reviews: p.ratingCount, delivery: p.delivery },
      region: "global",
    }));
  } catch { return []; }
}

// ── Serper Shopping — regional retailer (scoped to domain) ────────────────
async function fetchFromSerperRegional(
  query: string,
  domain: string,
  region: string,
  limit: number,
): Promise<AffiliateProduct[]> {
  const serperKey = Deno.env.get("SERPER_API_KEY");
  if (!serperKey) return [];
  try {
    const scopedQuery = `${query} site:${domain}`;
    const res = await fetch("https://google.serper.dev/shopping", {
      method: "POST",
      headers: { "X-API-KEY": serperKey, "Content-Type": "application/json" },
      body: JSON.stringify({ q: scopedQuery, num: limit, gl: region === "uk" ? "gb" : region === "ae" ? "ae" : region === "au" ? "au" : region === "za" ? "za" : "us" }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.shopping || []).slice(0, limit).map((p: any, i: number) => ({
      source: domain.replace(/\./g, "_").slice(0, 30),
      product_id: `${domain}_${Date.now()}_${i}`,
      name: p.title || "",
      brand: p.source || domain.split(".")[0] || null,
      price: p.price ? parseFloat(String(p.price).replace(/[^0-9.]/g, "")) : null,
      currency: region === "uk" ? "GBP" : region === "ae" ? "AED" : region === "au" ? "AUD" : region === "za" ? "ZAR" : "USD",
      image_url: p.imageUrl || null,
      affiliate_url: p.link || "",
      category: mapCategory(p.title || ""),
      tags: [query, domain.split(".")[0]].filter(Boolean),
      is_rental: false, is_resale: false,
      metadata: { rating: p.rating, delivery: p.delivery },
      region,
    }));
  } catch { return []; }
}

// ── Region-specific retailer batches ──────────────────────────────────────
async function fetchSouthAfrica(query: string, limit: number): Promise<AffiliateProduct[]> {
  const retailers = [
    "superbalist.com", "spree.co.za", "bash.com",
    "poetry.co.za", "zara.com/za", "mrprice.com", "woolworths.co.za",
  ];
  const perRetailer = Math.max(2, Math.floor(limit / retailers.length));
  const results = await Promise.all(
    retailers.map((domain) => fetchFromSerperRegional(query, domain, "za", perRetailer)),
  );
  return results.flat();
}

async function fetchUnitedKingdom(query: string, limit: number): Promise<AffiliateProduct[]> {
  const retailers = ["selfridges.com", "marksandspencer.com", "asos.com", "net-a-porter.com"];
  const perRetailer = Math.max(2, Math.floor(limit / retailers.length));
  const results = await Promise.all(
    retailers.map((domain) => fetchFromSerperRegional(query, domain, "uk", perRetailer)),
  );
  return results.flat();
}

async function fetchUnitedStates(query: string, limit: number): Promise<AffiliateProduct[]> {
  const retailers = ["nordstrom.com", "revolve.com", "shopbop.com", "anthropologie.com"];
  const perRetailer = Math.max(2, Math.floor(limit / retailers.length));
  const results = await Promise.all(
    retailers.map((domain) => fetchFromSerperRegional(query, domain, "us", perRetailer)),
  );
  return results.flat();
}

async function fetchUAE(query: string, limit: number): Promise<AffiliateProduct[]> {
  const retailers = ["ounass.com", "sivvi.com", "levelshoes.com", "namshi.com"];
  const perRetailer = Math.max(2, Math.floor(limit / retailers.length));
  const results = await Promise.all(
    retailers.map((domain) => fetchFromSerperRegional(query, domain, "ae", perRetailer)),
  );
  return results.flat();
}

async function fetchGlobal(query: string, limit: number): Promise<AffiliateProduct[]> {
  const retailers = ["farfetch.com", "vestiaire.com", "ssense.com", "mytheresa.com"];
  const perRetailer = Math.max(2, Math.floor(limit / retailers.length));
  const results = await Promise.all(
    retailers.map((domain) => fetchFromSerperRegional(query, domain, "global", perRetailer)),
  );
  return results.flat();
}

// ── Main handler ───────────────────────────────────────────────────────────
serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;

  const corsHeaders = getCorsHeaders(req);

  try {
    const body = await req.json().catch(() => ({}));
    const query: string = body.query || "luxury fashion outfit";
    const category: string | null = body.category || null;
    const limit: number = Math.min(body.limit ?? 20, 50);
    const region: string = body.region || "global"; // za, uk, us, ae, au, global
    const sources: string[] = body.sources || ["asos", "farfetch", "renttherunway", "byrotation", "vestiaire", "serper", "regional"];

    // Run all applicable sources in parallel
    const [asosR, farfetchR, rtrR, brR, vestiaireR, serperR, regionalR] = await Promise.all([
      sources.includes("asos") ? fetchFromAsos(query, limit) : Promise.resolve([]),
      sources.includes("farfetch") ? fetchFromFarfetch(query, limit) : Promise.resolve([]),
      sources.includes("renttherunway") ? fetchFromRentTheRunway(query, limit) : Promise.resolve([]),
      sources.includes("byrotation") ? fetchFromByRotation(query, limit) : Promise.resolve([]),
      sources.includes("vestiaire") ? fetchFromVestiaire(query, limit) : Promise.resolve([]),
      sources.includes("serper") ? fetchFromSerper(query, Math.ceil(limit / 2)) : Promise.resolve([]),
      sources.includes("regional") ? (async () => {
        if (region === "za") return fetchSouthAfrica(query, limit);
        if (region === "uk") return fetchUnitedKingdom(query, limit);
        if (region === "us") return fetchUnitedStates(query, limit);
        if (region === "ae") return fetchUAE(query, limit);
        return fetchGlobal(query, limit);
      })() : Promise.resolve([]),
    ]);

    const allProducts: AffiliateProduct[] = [
      ...asosR, ...farfetchR, ...rtrR, ...brR, ...vestiaireR, ...serperR, ...regionalR,
    ].filter((p) => p.name && p.affiliate_url);

    if (allProducts.length === 0) {
      return new Response(
        JSON.stringify({ success: true, inserted: 0, sources: { asos: 0, farfetch: 0, renttherunway: 0, byrotation: 0, vestiaire: 0, serper: 0, regional: 0 } }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { error } = await supabase.from("affiliate_products").upsert(
      allProducts.map((p) => ({
        source: p.source,
        product_id: p.product_id,
        name: p.name,
        title: p.name, // keep title column populated too
        brand: p.brand,
        price: p.price,
        currency: p.currency,
        image_url: p.image_url,
        affiliate_url: p.affiliate_url,
        category: category || p.category,
        tags: p.tags,
        is_rental: p.is_rental,
        is_resale: p.is_resale,
        metadata: p.metadata,
        region: p.region,
        last_synced: new Date().toISOString(),
      })),
      { onConflict: "source,product_id", ignoreDuplicates: false },
    );

    if (error) throw error;

    return new Response(
      JSON.stringify({
        success: true,
        inserted: allProducts.length,
        sources: {
          asos: asosR.length, farfetch: farfetchR.length, renttherunway: rtrR.length,
          byrotation: brR.length, vestiaire: vestiaireR.length, serper: serperR.length,
          regional: regionalR.length,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : ((err as any)?.message || JSON.stringify(err));
    console.error("sync-affiliate-products error:", err);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
