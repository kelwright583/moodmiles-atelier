/// <reference path="../deno.d.ts" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;
  const corsHeaders = getCorsHeaders(req);

  try {
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) throw new Error("OPENAI_API_KEY required");

    const body = await req.json();
    const trip_id: string = body.trip_id;
    if (!trip_id) {
      return new Response(JSON.stringify({ error: "trip_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Check if already generated ────────────────────────────────────────
    const { data: existing } = await supabase
      .from("packing_items")
      .select("id")
      .eq("trip_id", trip_id)
      .eq("category", "leave_behind")
      .limit(1);

    if (existing && existing.length > 0) {
      const { data: allItems } = await supabase
        .from("packing_items")
        .select("*")
        .eq("trip_id", trip_id)
        .eq("category", "leave_behind")
        .order("order_index");
      return new Response(
        JSON.stringify({ success: true, items: allItems, cached: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Fetch trip info ───────────────────────────────────────────────────
    const { data: trip } = await supabase
      .from("trips")
      .select("destination, country, trip_type")
      .eq("id", trip_id)
      .single();
    if (!trip) throw new Error("Trip not found");

    // ── Fetch destination briefing for context ────────────────────────────
    const { data: briefing } = await supabase
      .from("destination_briefings")
      .select("legal_dresscode_law, cultural_taboos, safety_scams, legal_photography, legal_drugs")
      .eq("destination", trip.destination)
      .eq("country", trip.country ?? "")
      .maybeSingle();

    const locationLabel = trip.country ? `${trip.destination}, ${trip.country}` : trip.destination;
    const briefingContext = [
      briefing?.legal_dresscode_law ? `Dress code laws: ${briefing.legal_dresscode_law}` : null,
      briefing?.cultural_taboos ? `Cultural taboos: ${briefing.cultural_taboos}` : null,
      briefing?.safety_scams ? `Common scams: ${briefing.safety_scams}` : null,
      briefing?.legal_photography ? `Photography restrictions: ${briefing.legal_photography}` : null,
      briefing?.legal_drugs ? `Drug laws: ${briefing.legal_drugs}` : null,
    ].filter(Boolean).join(". ");

    // ── Call GPT-4o-mini ──────────────────────────────────────────────────
    const prompt = `You are a savvy travel advisor. For a ${trip.trip_type || "leisure"} trip to ${locationLabel}, list exactly 5 specific items that tourists commonly bring but should leave at home.

${briefingContext ? `Local context: ${briefingContext}` : ""}

Focus on items that are: legally restricted, culturally offensive, impractical for this destination, security risks, or commonly targeted by pickpockets.

Return ONLY a JSON object with an "items" array:
{"items": [
  {"item": "specific item name", "reason": "one clear sentence why to leave it at home"},
  {"item": "...", "reason": "..."},
  {"item": "...", "reason": "..."},
  {"item": "...", "reason": "..."},
  {"item": "...", "reason": "..."}
]}

Be highly specific to ${locationLabel} — not generic travel advice.`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
        max_tokens: 600,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) throw new Error(`OpenAI error ${res.status}`);
    const aiData = await res.json();
    const rawText = aiData.choices?.[0]?.message?.content || "{}";

    let parsed: any;
    try { parsed = JSON.parse(rawText); } catch { throw new Error("Failed to parse GPT response"); }

    const generatedItems: { item: string; reason: string }[] =
      Array.isArray(parsed) ? parsed : (parsed.items || parsed.list || []);

    if (!generatedItems.length) throw new Error("No items generated");

    // ── Insert into packing_items ─────────────────────────────────────────
    const inserts = generatedItems.slice(0, 5).map((i, idx) => ({
      trip_id,
      name: JSON.stringify({ item: i.item, reason: i.reason }),
      category: "leave_behind",
      quantity: 1,
      is_packed: false,
      order_index: idx,
    }));

    const { data: inserted, error: insertError } = await supabase
      .from("packing_items")
      .insert(inserts)
      .select();

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({ success: true, items: inserted, cached: false }),
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
