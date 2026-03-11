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
    if (!trip_id) return new Response(JSON.stringify({ error: "trip_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // ── Fetch trip info ───────────────────────────────────────────────────
    const { data: trip } = await supabase
      .from("trips")
      .select("destination, country")
      .eq("id", trip_id)
      .single();
    if (!trip) throw new Error("Trip not found");

    // ── Fetch events with a dress code ────────────────────────────────────
    const { data: events } = await supabase
      .from("trip_events")
      .select("id, event_name, dress_code, event_date, location")
      .eq("trip_id", trip_id)
      .not("dress_code", "is", null);

    const dressCodeEvents = (events || []).filter((e: any) => e.dress_code?.trim());
    if (dressCodeEvents.length === 0) {
      return new Response(JSON.stringify({ success: true, alerts: [], message: "No events with dress codes found" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Fetch outfits: prefer those linked via outfit_event_id, fallback to pinned ──
    const eventIds = dressCodeEvents.map((e: any) => e.id);
    const { data: linkedOutfits } = await supabase
      .from("outfit_suggestions")
      .select("id, title, occasion, description, items, outfit_event_id")
      .eq("trip_id", trip_id)
      .in("outfit_event_id", eventIds);

    const { data: pinnedOutfits } = await supabase
      .from("outfit_suggestions")
      .select("id, title, occasion, description, items")
      .eq("trip_id", trip_id)
      .eq("pinned", true);

    // Build event → outfits pairs
    const pairs: { event: any; outfit: any }[] = [];
    for (const event of dressCodeEvents) {
      const linked = (linkedOutfits || []).filter((o: any) => o.outfit_event_id === event.id);
      const outfitsForEvent = linked.length > 0 ? linked : (pinnedOutfits || []).slice(0, 3);
      for (const outfit of outfitsForEvent) {
        pairs.push({ event, outfit });
      }
    }

    if (pairs.length === 0) {
      return new Response(JSON.stringify({ success: true, alerts: [], message: "No outfits to check" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Fetch destination briefing ────────────────────────────────────────
    const { data: briefing } = await supabase
      .from("destination_briefings")
      .select("legal_dresscode_law, cultural_taboos")
      .eq("destination", trip.destination)
      .eq("country", trip.country ?? "")
      .maybeSingle();

    const localContext = [
      briefing?.legal_dresscode_law ? `Dress code laws: ${briefing.legal_dresscode_law}` : null,
      briefing?.cultural_taboos ? `Cultural taboos: ${briefing.cultural_taboos}` : null,
    ].filter(Boolean).join(". ");

    // ── Fetch existing alerts to avoid duplicates ─────────────────────────
    const { data: existingAlerts } = await supabase
      .from("dress_code_alerts")
      .select("event_id, outfit_suggestion_id")
      .eq("trip_id", trip_id);

    const existingKeys = new Set(
      (existingAlerts || []).map((a: any) => `${a.event_id}__${a.outfit_suggestion_id}`)
    );

    // ── Analyse each pair via GPT-4o-mini ─────────────────────────────────
    const newAlerts: any[] = [];

    for (const { event, outfit } of pairs) {
      const key = `${event.id}__${outfit.id}`;
      if (existingKeys.has(key)) continue;

      const outfitDesc = [
        outfit.title,
        outfit.occasion ? `(${outfit.occasion})` : null,
        outfit.description,
      ].filter(Boolean).join(" — ");

      const prompt = `Given this event dress code: "${event.dress_code}", this outfit: "${outfitDesc}", and these local dress code laws and customs: "${localContext || "No specific local laws noted"}",

identify any conflicts or important things the traveller should know. Be specific and practical.

Return JSON only (no markdown):
{
  "has_conflict": true or false,
  "severity": "info" or "warning" or "critical",
  "headline": "Short bold headline — max 12 words",
  "detail": "2-3 sentences of specific, actionable guidance"
}

Severity rules:
- critical: legal requirement or risk of arrest/fine
- warning: likely refused entry or significant mismatch with dress code
- info: helpful local knowledge, minor suggestion
If no conflict at all, return has_conflict: false with severity "info".`;

      try {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.3,
            max_tokens: 300,
            response_format: { type: "json_object" },
          }),
        });

        if (!res.ok) continue;
        const aiData = await res.json();
        const rawText = aiData.choices?.[0]?.message?.content || "{}";
        let result: any;
        try { result = JSON.parse(rawText); } catch { continue; }

        if (!result.has_conflict) continue;

        const alertMessage = JSON.stringify({ headline: result.headline, detail: result.detail });
        const { data: inserted } = await supabase
          .from("dress_code_alerts")
          .insert({
            trip_id,
            event_id: event.id,
            outfit_suggestion_id: outfit.id,
            alert_message: alertMessage,
            severity: result.severity || "info",
          })
          .select()
          .single();

        if (inserted) newAlerts.push({ ...inserted, headline: result.headline, detail: result.detail });
      } catch {
        // Skip failed pair silently
      }
    }

    // ── Return all alerts for this trip ────────────────────────────────────
    const { data: allAlerts } = await supabase
      .from("dress_code_alerts")
      .select("*")
      .eq("trip_id", trip_id)
      .order("created_at", { ascending: false });

    const parsedAlerts = (allAlerts || []).map((a: any) => {
      try {
        const parsed = JSON.parse(a.alert_message);
        return { ...a, headline: parsed.headline, detail: parsed.detail };
      } catch {
        return { ...a, headline: a.alert_message, detail: "" };
      }
    });

    return new Response(
      JSON.stringify({ success: true, alerts: parsedAlerts, new_alerts: newAlerts.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
