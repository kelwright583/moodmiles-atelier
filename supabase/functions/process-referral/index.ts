/// <reference path="../deno.d.ts" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { getServiceClient } from "../_shared/auth.ts";

serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;

  const corsHeaders = getCorsHeaders(req);

  try {
    const { referrer_handle, referred_email } = await req.json();

    if (!referrer_handle || !referred_email) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = getServiceClient();

    // Look up referrer by handle
    const { data: referrer } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("handle", referrer_handle.toLowerCase())
      .maybeSingle();

    if (!referrer) {
      return new Response(JSON.stringify({ ok: false, reason: "referrer not found" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Avoid duplicate referrals for same email
    const { data: existing } = await supabase
      .from("referrals")
      .select("id")
      .eq("referrer_user_id", referrer.user_id)
      .eq("referred_email", referred_email.toLowerCase())
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ ok: true, duplicate: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("referrals").insert({
      referrer_user_id: referrer.user_id,
      referred_email: referred_email.toLowerCase(),
      status: "pending",
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
