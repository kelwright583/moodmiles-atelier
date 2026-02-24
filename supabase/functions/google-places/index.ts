import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { parseBody, googlePlacesSchema, type GooglePlacesBody, ValidationError } from "../_shared/validation.ts";

serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;

  const corsHeaders = getCorsHeaders(req);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    if (!body.input || body.input.length < 2) {
      return new Response(JSON.stringify({ predictions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { input } = parseBody<GooglePlacesBody>(googlePlacesSchema, body);

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
    const msg = error instanceof Error ? error.message : String(error);
    const status = error instanceof ValidationError ? 400 : 500;
    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
