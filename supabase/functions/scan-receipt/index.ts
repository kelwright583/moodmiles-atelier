import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

serve(async (req) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;
  const headers = getCorsHeaders(req);

  try {
    const { image_base64 } = await req.json();
    if (!image_base64) {
      return new Response(JSON.stringify({ error: "image_base64 is required" }), {
        status: 400, headers: { ...headers, "Content-Type": "application/json" },
      });
    }

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
        max_tokens: 500,
        messages: [
          {
            role: "system",
            content: `You are a receipt scanner. Extract the following from the receipt image and return ONLY valid JSON, no markdown:
{
  "merchant": "store/restaurant name",
  "total": 0.00,
  "currency": "USD",
  "date": "YYYY-MM-DD",
  "category": "food|transport|accommodation|activity|shopping|other",
  "items_summary": "brief summary of purchased items"
}
If you cannot read the receipt clearly, return: { "error": "Could not read receipt" }
For currency, use the 3-letter ISO code (USD, GBP, EUR, etc).
For category, pick the best fit from: food, transport, accommodation, activity, shopping, other.`,
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Please scan this receipt and extract the details." },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${image_base64}`,
                  detail: "low",
                },
              },
            ],
          },
        ],
      }),
    });

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "";

    let parsed;
    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      return new Response(JSON.stringify({
        error: "Could not parse receipt",
        raw: content,
      }), { headers: { ...headers, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...headers, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...headers, "Content-Type": "application/json" },
    });
  }
});
