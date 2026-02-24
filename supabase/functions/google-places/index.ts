import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { input } = await req.json();
    if (!input || input.length < 2) {
      return new Response(JSON.stringify({ predictions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!apiKey) {
      throw new Error("GOOGLE_MAPS_API_KEY not configured");
    }

    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&types=(cities)&key=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      console.error("Places API error:", data);
      throw new Error(`Places API: ${data.status}`);
    }

    // Get details for each prediction to extract lat/lng and country
    const predictions = await Promise.all(
      (data.predictions || []).slice(0, 5).map(async (p: any) => {
        const detailUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${p.place_id}&fields=geometry,address_components&key=${apiKey}`;
        const detailRes = await fetch(detailUrl);
        const detailData = await detailRes.json();

        let lat = null, lng = null, country = null, city = null;
        if (detailData.result) {
          lat = detailData.result.geometry?.location?.lat;
          lng = detailData.result.geometry?.location?.lng;
          const components = detailData.result.address_components || [];
          const countryComp = components.find((c: any) => c.types.includes("country"));
          const cityComp = components.find((c: any) => c.types.includes("locality"));
          country = countryComp?.long_name || null;
          city = cityComp?.long_name || p.structured_formatting?.main_text || null;
        }

        return {
          description: p.description,
          place_id: p.place_id,
          city,
          country,
          lat,
          lng,
        };
      })
    );

    return new Response(JSON.stringify({ predictions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
