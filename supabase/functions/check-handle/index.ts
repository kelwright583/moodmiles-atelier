/// <reference path="../deno.d.ts" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { getServiceClient } from "../_shared/auth.ts";

const HANDLE_REGEX = /^[a-z0-9_]{3,20}$/;
const TRAVEL_SUFFIXES = ["_travels", "_style", "_trips"];

serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;
  const corsHeaders = getCorsHeaders(req);

  try {
    const body = await req.json();
    const handle: string = (body.handle || "").toLowerCase().trim();

    // ── Validate format ───────────────────────────────────────
    if (!handle) {
      return new Response(
        JSON.stringify({ available: false, valid: false, suggestions: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const valid = HANDLE_REGEX.test(handle);
    if (!valid) {
      return new Response(
        JSON.stringify({
          available: false,
          valid: false,
          suggestions: [],
          reason: "Handle must be 3-20 characters, lowercase letters, numbers and underscores only",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Check availability ────────────────────────────────────
    const supabase = getServiceClient();
    const { data: existing } = await supabase
      .from("profiles")
      .select("handle")
      .ilike("handle", handle)
      .maybeSingle();

    const available = !existing;

    if (available) {
      return new Response(
        JSON.stringify({ available: true, valid: true, suggestions: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Generate suggestions ──────────────────────────────────
    const suggestions: string[] = [];

    // Number suffixes
    for (let i = 1; i <= 9 && suggestions.length < 2; i++) {
      const candidate = `${handle}${i}`;
      if (HANDLE_REGEX.test(candidate)) {
        const { data: taken } = await supabase
          .from("profiles")
          .select("handle")
          .ilike("handle", candidate)
          .maybeSingle();
        if (!taken) suggestions.push(candidate);
      }
    }

    // Travel suffixes
    for (const suffix of TRAVEL_SUFFIXES) {
      if (suggestions.length >= 3) break;
      const candidate = `${handle}${suffix}`;
      if (HANDLE_REGEX.test(candidate)) {
        const { data: taken } = await supabase
          .from("profiles")
          .select("handle")
          .ilike("handle", candidate)
          .maybeSingle();
        if (!taken) suggestions.push(candidate);
      }
    }

    return new Response(
      JSON.stringify({ available: false, valid: true, suggestions: suggestions.slice(0, 3) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ available: false, valid: false, suggestions: [], error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
