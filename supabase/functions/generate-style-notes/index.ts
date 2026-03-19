import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { event_name, category, venue_name, event_date, destination, country } = await req.json();

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      return new Response(JSON.stringify({ style_notes: null, error: "OpenAI key not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const prompt = `You are a luxury travel stylist writing a brief, intelligent note about what to wear to a specific experience.

Experience: ${event_name}
Category: ${category || "not specified"}
Venue: ${venue_name || "not specified"}
Location: ${destination}${country ? `, ${country}` : ""}
Date: ${event_date || "not specified"} (use this to determine season and local climate)

Write 2–3 sentences only. Be specific to this venue type and location. Cover:
1. What level of formality is appropriate and why (reference the venue type and local culture)
2. One practical consideration (temperature, terrain, local custom)

Do not use the phrase "dress code". Do not give a list. Do not be prescriptive — use language like "tends to", "typically", "you'll likely want".
Write in the tone of a knowledgeable friend who has been there, not a rulebook.

Return only the 2–3 sentences. No preamble, no heading.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 150,
        temperature: 0.7,
      }),
    });

    const json = await response.json();
    const style_notes = json.choices?.[0]?.message?.content?.trim() || null;

    return new Response(JSON.stringify({ style_notes }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
