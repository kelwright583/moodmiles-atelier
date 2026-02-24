import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { parseBody, fetchDestinationImageSchema, type FetchDestinationImageBody, ValidationError } from "../_shared/validation.ts";

serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;

  const corsHeaders = getCorsHeaders(req);

  const jsonResponse = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const { trip_id, destination, country } = parseBody<FetchDestinationImageBody>(fetchDestinationImageSchema, await req.json());

    const googleMapsKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
    const unsplashKey = Deno.env.get("UNSPLASH_ACCESS_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let imageUrl: string | null = null;

    const query = country ? `${destination} ${country} travel tourism` : `${destination} travel tourism`;

    if (googleMapsKey) {
      try {
        const placesRes = await fetch(
          `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${googleMapsKey}`
        );
        if (placesRes.ok) {
          const placesData = await placesRes.json();
          const photoRef = placesData?.results?.[0]?.photos?.[0]?.photo_reference;
          if (photoRef) {
            imageUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1200&photo_reference=${photoRef}&key=${googleMapsKey}`;
          }
        }
      } catch (e) {
        console.error("Google Places photo error:", e);
      }
    }

    if (!imageUrl && unsplashKey) {
      try {
        const res = await fetch(
          `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape&client_id=${unsplashKey}`
        );
        if (res.ok) {
          const data = await res.json();
          const photo = data?.results?.[0];
          if (photo?.urls?.regular) {
            imageUrl = photo.urls.regular;
          }
        }
      } catch (e) {
        console.error("Unsplash error:", e);
      }
    }

    if (!imageUrl) {
      const slug = (destination + (country || "")).toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      imageUrl = `https://picsum.photos/seed/${slug || "travel"}/800/600`;
    }

    const { error } = await supabase
      .from("trips")
      .update({ image_url: imageUrl })
      .eq("id", trip_id);

    if (error) throw error;

    return jsonResponse({ success: true, image_url: imageUrl });
  } catch (error) {
    console.error("Error:", error);
    const status = error instanceof ValidationError ? 400 : 500;
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Failed to fetch image" },
      status
    );
  }
});
