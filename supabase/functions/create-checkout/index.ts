import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;

  const corsHeaders = getCorsHeaders(req);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const LUXE_PRICE_ID = Deno.env.get("STRIPE_LUXE_PRICE_ID");
    const ATELIER_PRICE_ID = Deno.env.get("STRIPE_ATELIER_PRICE_ID");

    if (!stripeKey || !LUXE_PRICE_ID) {
      return new Response(JSON.stringify({ error: "Stripe not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-11-20.acacia", httpClient: Stripe.createFetchHttpClient() });

    let customerId: string | null = null;
    const { data: existing } = await supabase
      .from("stripe_customers")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    if (existing?.stripe_customer_id) {
      customerId = existing.stripe_customer_id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      await supabase.from("stripe_customers").insert({
        user_id: user.id,
        stripe_customer_id: customerId,
      });
    }

    // Determine plan + billing from request body
    let plan = "luxe";
    let billing = "monthly";
    let promoCode: string | null = null;
    try {
      const body = await req.json().catch(() => ({}));
      if (body?.plan === "atelier") plan = "atelier";
      if (body?.billing === "annual") billing = "annual";
      if (body?.promo_code) promoCode = String(body.promo_code).trim();
    } catch { /* default to luxe monthly */ }

    // Resolve price ID — annual prices use separate Stripe price IDs
    const LUXE_ANNUAL_PRICE_ID = Deno.env.get("STRIPE_LUXE_ANNUAL_PRICE_ID");
    const ATELIER_ANNUAL_PRICE_ID = Deno.env.get("STRIPE_ATELIER_ANNUAL_PRICE_ID");

    let priceId: string | undefined;
    if (plan === "atelier") {
      if (billing === "annual" && ATELIER_ANNUAL_PRICE_ID) {
        priceId = ATELIER_ANNUAL_PRICE_ID;
      } else if (ATELIER_PRICE_ID) {
        priceId = ATELIER_PRICE_ID;
      } else {
        return new Response(JSON.stringify({ error: "Atelier plan not yet configured" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      priceId = (billing === "annual" && LUXE_ANNUAL_PRICE_ID) ? LUXE_ANNUAL_PRICE_ID : LUXE_PRICE_ID;
    }

    const siteUrl = Deno.env.get("SITE_URL") || "http://localhost:8080";

    const sessionParams: Parameters<typeof stripe.checkout.sessions.create>[0] = {
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl}/settings?success=subscription&tier=${plan}`,
      cancel_url: `${siteUrl}/pricing`,
      metadata: { user_id: user.id, tier: plan, billing },
      subscription_data: { metadata: { user_id: user.id, tier: plan, billing } },
    };

    if (promoCode) {
      (sessionParams as Record<string, unknown>).discounts = [{ coupon: promoCode }];
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("create-checkout error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
