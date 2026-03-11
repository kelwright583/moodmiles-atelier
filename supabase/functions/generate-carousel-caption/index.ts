import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

serve(async (req) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;
  const headers = getCorsHeaders(req);

  try {
    const { destination, country, trip_type, events_count, photos_count, nights } = await req.json();

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "OpenAI API key not configured" }), {
        status: 500, headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 300,
        messages: [
          {
            role: "system",
            content: `You write sophisticated, aspirational Instagram captions for luxury travellers. Keep it under 200 characters for the main caption, then add 2-3 relevant hashtags. No emojis. Tone: effortlessly chic, understated luxury.`,
          },
          {
            role: "user",
            content: `Write an Instagram carousel caption for a trip to ${destination}${country ? `, ${country}` : ""}. Trip type: ${trip_type || "holiday"}. ${nights} nights, ${events_count} events, ${photos_count} photos captured. Return ONLY the caption text with hashtags at the end.`,
          },
        ],
      }),
    });

    const data = await res.json();
    const caption = data.choices?.[0]?.message?.content?.trim() || "";

    return new Response(JSON.stringify({ caption }), {
      headers: { ...headers, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...headers, "Content-Type": "application/json" },
    });
  }
});
