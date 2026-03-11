/// <reference path="../deno.d.ts" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const CACHE_DAYS = 30;

serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;

  const corsHeaders = getCorsHeaders(req);

  try {
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) throw new Error("OPENAI_API_KEY required");

    const body = await req.json();
    const destination: string = body.destination;
    const country: string | null = body.country || null;
    const trip_type: string | null = body.trip_type || null;
    const start_date: string | null = body.start_date || null;
    const user_nationality: string | null = body.user_nationality || null;

    if (!destination) {
      return new Response(
        JSON.stringify({ error: "destination required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Check cache (30-day TTL) ─────────────────────────────────────────
    const { data: cached } = await supabase
      .from("destination_briefings")
      .select("*")
      .eq("destination", destination)
      .eq("country", country ?? "")
      .maybeSingle();

    if (cached?.briefing_updated_at) {
      const age = Date.now() - new Date(cached.briefing_updated_at).getTime();
      const ageDays = age / (1000 * 60 * 60 * 24);
      if (ageDays < CACHE_DAYS) {
        console.log(`[generate-briefing] CACHE HIT for "${destination}, ${country}" — age ${ageDays.toFixed(1)} days, skipping GPT call`);
        return new Response(
          JSON.stringify({ success: true, briefing: cached, cached: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      console.log(`[generate-briefing] Cache STALE for "${destination}, ${country}" — age ${ageDays.toFixed(1)} days, regenerating`);
    } else {
      console.log(`[generate-briefing] No cache for "${destination}, ${country}" — generating fresh briefing`);
    }

    // ── Build GPT prompt ─────────────────────────────────────────────────
    const locationLabel = country ? `${destination}, ${country}` : destination;
    const tripContext = [
      trip_type ? `Trip type: ${trip_type}` : null,
      start_date ? `Travel dates start: ${start_date}` : null,
      user_nationality ? `Traveller nationality: ${user_nationality}` : null,
    ].filter(Boolean).join(". ");

    const systemPrompt = `You are a well-travelled, knowledgeable friend giving honest, specific, useful pre-travel intelligence for ${locationLabel}. Be direct, specific and warm — not bureaucratic. Cover real risks without being alarmist. Write like you have been there multiple times. Use 'you' not 'travellers'. Never say 'exercise caution' — say exactly what to do instead. ${tripContext}`;

    const userPrompt = `Generate a complete travel briefing for ${locationLabel}. Return ONLY a valid JSON object with exactly these fields (all strings, use null if not applicable):

{
  "health_malaria": "specific risk level and recommended prophylaxis by brand name (e.g. Malarone), or null if no risk",
  "health_water": "potable or not, ice advice, fruit washing, brushing teeth specifics",
  "health_vaccinations": "required vs recommended, specific vaccine names",
  "health_uv": "UV index level with context and reapplication frequency",
  "health_altitude": "altitude sickness risk if relevant, or null",
  "entry_visa": "requirements for UK and US passport holders specifically",
  "entry_passport": "validity requirements beyond travel dates",
  "entry_customs": "specific items that cannot be brought in or out",
  "legal_drugs": "specific drug laws, zero tolerance flagged clearly",
  "legal_photography": "restrictions at military sites, religious sites, of people",
  "legal_lgbt": "honest safety assessment with specific context, not vague",
  "legal_dresscode_law": "actual laws vs suggestions — flag UAE, Morocco, Indonesia style laws",
  "money_cash_culture": "cash vs card reality on the ground, not generic advice",
  "money_tipping": "specific percentages and customs per context",
  "money_atm_safety": "skimming risk level and recommended approach",
  "connectivity_sim": "eSIM availability, local SIM cost estimate in local currency",
  "connectivity_vpn": "whether VPN is needed or restricted",
  "safety_areas_avoid": "specific neighbourhood or zone names to avoid",
  "safety_scams": "top 3 most common tourist scams with exactly how to avoid each",
  "safety_emergency_numbers": "local police, ambulance, fire numbers plus UK embassy and US embassy numbers",
  "cultural_calendar": "religious holidays or events during travel that affect daily life",
  "cultural_greetings": "how to greet people correctly",
  "cultural_bargaining": "expected, offensive, or irrelevant — be specific",
  "cultural_taboos": "top 3 things tourists do that are rude or offensive locally",
  "climate_notes": "local knowledge beyond raw weather data"
}

Be highly specific to ${locationLabel}. No generic travel advice.`;

    console.log(`[generate-briefing] Calling GPT-4o-mini for "${locationLabel}" — model: gpt-4o-mini, max_tokens: 3000`);
    const callStart = Date.now();

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.4,
        max_tokens: 3000,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[generate-briefing] OpenAI API error ${res.status} for "${locationLabel}": ${errText}`);
      throw new Error(`OpenAI error ${res.status}: ${errText}`);
    }

    const aiData = await res.json();
    const rawText = aiData.choices?.[0]?.message?.content || "{}";
    const elapsed = Date.now() - callStart;
    console.log(`[generate-briefing] GPT-4o-mini responded in ${elapsed}ms — ${rawText.length} chars, finish_reason: ${aiData.choices?.[0]?.finish_reason}, tokens used: ${aiData.usage?.total_tokens}`);
    let fields: Record<string, string | null>;

    try {
      fields = JSON.parse(rawText);
    } catch {
      const match = rawText.match(/\{[\s\S]*\}/);
      fields = match ? JSON.parse(match[0]) : {};
    }

    // ── Upsert into destination_briefings ────────────────────────────────
    const upsertRow = {
      destination,
      country: country ?? "",
      health_malaria: fields.health_malaria ?? null,
      health_water: fields.health_water ?? null,
      health_vaccinations: fields.health_vaccinations ?? null,
      health_uv: fields.health_uv ?? null,
      health_altitude: fields.health_altitude ?? null,
      entry_visa: fields.entry_visa ?? null,
      entry_passport: fields.entry_passport ?? null,
      entry_customs: fields.entry_customs ?? null,
      legal_drugs: fields.legal_drugs ?? null,
      legal_photography: fields.legal_photography ?? null,
      legal_lgbt: fields.legal_lgbt ?? null,
      legal_dresscode_law: fields.legal_dresscode_law ?? null,
      money_cash_culture: fields.money_cash_culture ?? null,
      money_tipping: fields.money_tipping ?? null,
      money_atm_safety: fields.money_atm_safety ?? null,
      connectivity_sim: fields.connectivity_sim ?? null,
      connectivity_vpn: fields.connectivity_vpn ?? null,
      safety_areas_avoid: fields.safety_areas_avoid ?? null,
      safety_scams: fields.safety_scams ?? null,
      safety_emergency_numbers: fields.safety_emergency_numbers ?? null,
      cultural_calendar: fields.cultural_calendar ?? null,
      cultural_greetings: fields.cultural_greetings ?? null,
      cultural_bargaining: fields.cultural_bargaining ?? null,
      cultural_taboos: fields.cultural_taboos ?? null,
      climate_notes: fields.climate_notes ?? null,
      briefing_updated_at: new Date().toISOString(),
    };

    const { data: saved, error: saveError } = await supabase
      .from("destination_briefings")
      .upsert(upsertRow, { onConflict: "destination,country" })
      .select()
      .single();

    if (saveError) {
      console.error(`[generate-briefing] DB upsert failed for "${locationLabel}":`, saveError.message);
      throw saveError;
    }

    console.log(`[generate-briefing] Saved to destination_briefings for "${locationLabel}" — id: ${saved?.id}`);

    return new Response(
      JSON.stringify({ success: true, briefing: saved, cached: false }),
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
