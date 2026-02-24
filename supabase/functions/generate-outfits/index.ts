import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { trip_id, destination, country, trip_type, weather_summary, events_summary, similar_to } = await req.json();
    if (!trip_id || !destination) throw new Error("Missing trip_id or destination");

    const count = similar_to ? 8 : 15;
    const similarContext = similar_to
      ? `\n\nGenerate outfits SIMILAR in style/vibe to this look: "${similar_to.title}" (${similar_to.occasion}) - ${similar_to.description}. Keep the same aesthetic but vary the items and settings.`
      : "";

    const prompt = `You are a luxury fashion stylist creating outfit inspiration for a ${trip_type || "leisure"} trip to ${destination}${country ? `, ${country}` : ""}.

${weather_summary ? `Weather forecast: ${weather_summary}` : ""}
${events_summary ? `Planned events/activities: ${events_summary}` : ""}
${similarContext}

Create ${count} complete, styled outfit suggestions. Consider the destination culture, weather, and planned events.

For each outfit:
- title: A catchy editorial name (e.g., "Riviera Evening", "Gallery Hopping")  
- occasion: When to wear it (e.g., "Dinner", "Sightseeing", "Beach Day", "Night Out")
- description: 2-3 sentences about the look, vibe, and why it works for this trip
- image_prompt: A STREET STYLE fashion photography prompt showing a stylish person wearing THIS outfit in ${destination}. Must feel like a real Instagram or Pinterest photo — candid, aspirational, shot in a beautiful location. Example: "Street style fashion photography of a woman wearing a cream linen blazer over a white silk camisole with high-waisted navy trousers and tan leather loafers, walking through a sun-drenched cobblestone street in ${destination}, golden hour lighting, shot on 35mm film, candid pose, editorial quality, Instagram aesthetic"
- items: Array of 4-6 items, each with:
  - category: "Top", "Bottom", "Outerwear", "Shoes", "Accessory", or "Bag"
  - name: Specific item (e.g., "Cream linen blazer")
  - color: Main color
  - brand_suggestion: A luxury/premium brand
  - search_terms: Shopping search keywords`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a luxury fashion stylist AI creating Instagram-worthy outfit inspiration." },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "save_outfits",
              description: "Save generated outfit suggestions",
              parameters: {
                type: "object",
                properties: {
                  outfits: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        occasion: { type: "string" },
                        description: { type: "string" },
                        image_prompt: { type: "string" },
                        items: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              category: { type: "string" },
                              name: { type: "string" },
                              color: { type: "string" },
                              brand_suggestion: { type: "string" },
                              search_terms: { type: "string" },
                            },
                            required: ["category", "name", "color", "search_terms"],
                          },
                        },
                      },
                      required: ["title", "occasion", "description", "image_prompt", "items"],
                    },
                  },
                },
                required: ["outfits"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "save_outfits" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in Settings." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI generation failed");
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const { outfits } = JSON.parse(toolCall.function.arguments);

    // If "see more like this", append rather than replace
    if (!similar_to) {
      await supabase.from("outfit_suggestions").delete().eq("trip_id", trip_id);
      const { data: oldFiles } = await supabase.storage.from("outfit-images").list(trip_id);
      if (oldFiles && oldFiles.length > 0) {
        await supabase.storage.from("outfit-images").remove(oldFiles.map((f: any) => `${trip_id}/${f.name}`));
      }
    }

    // Generate images in batches of 3
    const generateImage = async (imagePrompt: string, index: number): Promise<string | null> => {
      try {
        const imgResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image",
            messages: [{ role: "user", content: imagePrompt }],
            modalities: ["image", "text"],
          }),
        });

        if (!imgResponse.ok) {
          console.error(`Image gen failed for outfit ${index}:`, imgResponse.status);
          return null;
        }

        const imgData = await imgResponse.json();
        const base64Url = imgData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        if (!base64Url) return null;

        const base64Data = base64Url.replace(/^data:image\/\w+;base64,/, "");
        const imageBytes = decode(base64Data);
        const fileName = `${trip_id}/outfit-${index}-${Date.now()}.png`;

        const { error: uploadError } = await supabase.storage
          .from("outfit-images")
          .upload(fileName, imageBytes, { contentType: "image/png", upsert: true });

        if (uploadError) {
          console.error("Upload error:", uploadError);
          return null;
        }

        const { data: urlData } = supabase.storage.from("outfit-images").getPublicUrl(fileName);
        return urlData.publicUrl;
      } catch (e) {
        console.error(`Image gen error for outfit ${index}:`, e);
        return null;
      }
    };

    const imageUrls: (string | null)[] = [];
    for (let i = 0; i < outfits.length; i += 3) {
      const batch = outfits.slice(i, i + 3);
      const results = await Promise.all(
        batch.map((o: any, j: number) => generateImage(o.image_prompt, i + j))
      );
      imageUrls.push(...results);
    }

    const rows = outfits.map((o: any, i: number) => ({
      trip_id,
      title: o.title,
      occasion: o.occasion,
      description: o.description,
      items: o.items,
      image_url: imageUrls[i] || null,
    }));

    const { error: insertError } = await supabase.from("outfit_suggestions").insert(rows);
    if (insertError) throw insertError;

    return new Response(JSON.stringify({ success: true, count: rows.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
