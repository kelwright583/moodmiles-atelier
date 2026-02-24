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
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY not configured");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { trip_id, destination, country, trip_type, occasion } = await req.json();
    if (!trip_id || !destination) throw new Error("Missing trip_id or destination");

    // Build search queries for real street-style fashion content
    const queries = [
      `street style fashion ${destination} outfit`,
      `what to wear ${destination} ${trip_type || "travel"}`,
      `${destination} fashion inspo outfit ideas`,
      occasion ? `${occasion} outfit ${destination} style` : `${destination} travel outfit lookbook`,
    ];

    // Search for real fashion content using Firecrawl
    const searchResults: any[] = [];
    for (const query of queries.slice(0, 3)) {
      try {
        const searchRes = await fetch("https://api.firecrawl.dev/v1/search", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query,
            limit: 5,
            scrapeOptions: { formats: ["markdown", "links"] },
          }),
        });

        if (searchRes.ok) {
          const data = await searchRes.json();
          if (data.data) searchResults.push(...data.data);
        }
      } catch (e) {
        console.error("Search error for query:", query, e);
      }
    }

    if (searchResults.length === 0) {
      return new Response(JSON.stringify({ success: true, count: 0, message: "No results found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use AI to extract outfit information from the scraped content
    const combinedContent = searchResults
      .slice(0, 8)
      .map((r: any, i: number) => `[Source ${i + 1}]: ${r.title || ""}\nURL: ${r.url || ""}\n${(r.markdown || r.description || "").slice(0, 800)}`)
      .join("\n\n---\n\n");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: "You are a fashion curator extracting outfit inspiration from web content. Extract real, concrete outfit ideas with source attribution.",
          },
          {
            role: "user",
            content: `From these web sources about fashion in ${destination}, extract up to 10 distinct outfit ideas. For each, provide the details and reference back to the source URL.\n\n${combinedContent}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "save_web_outfits",
              description: "Save outfit ideas extracted from web sources",
              parameters: {
                type: "object",
                properties: {
                  outfits: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: "Catchy outfit name" },
                        occasion: { type: "string", description: "When to wear it" },
                        description: { type: "string", description: "2-3 sentences about the look" },
                        source_url: { type: "string", description: "URL where this was found" },
                        source_name: { type: "string", description: "Name of the source site" },
                        image_prompt: { type: "string", description: "Detailed street-style photography prompt to generate a visual of this outfit being worn in the destination" },
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
                      required: ["title", "occasion", "description", "source_url", "image_prompt", "items"],
                    },
                  },
                },
                required: ["outfits"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "save_web_outfits" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI extraction failed");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const { outfits } = JSON.parse(toolCall.function.arguments);

    // Generate images for each outfit using the extracted image_prompt
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
          console.error(`Image gen failed for web outfit ${index}:`, imgResponse.status);
          return null;
        }

        const imgData = await imgResponse.json();
        const base64Url = imgData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        if (!base64Url) return null;

        const base64Data = base64Url.replace(/^data:image\/\w+;base64,/, "");
        const imageBytes = decode(base64Data);
        const fileName = `${trip_id}/web-outfit-${index}-${Date.now()}.png`;

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
        console.error(`Image gen error for web outfit ${index}:`, e);
        return null;
      }
    };

    // Generate images in batches of 3
    const imageUrls: (string | null)[] = [];
    for (let i = 0; i < outfits.length; i += 3) {
      const batch = outfits.slice(i, i + 3);
      const results = await Promise.all(
        batch.map((o: any, j: number) => generateImage(o.image_prompt, i + j))
      );
      imageUrls.push(...results);
    }

    // Insert as outfit_suggestions (appending, not replacing)
    const rows = outfits.map((o: any, i: number) => ({
      trip_id,
      title: o.title,
      occasion: o.occasion,
      description: `${o.description}\n\n📎 Source: ${o.source_name || "Web"}`,
      items: o.items,
      image_url: imageUrls[i] || null,
      pinned: false,
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
