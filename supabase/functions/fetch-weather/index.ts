import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const weatherCodeMap: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Foggy",
  48: "Rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  71: "Slight snow",
  73: "Moderate snow",
  75: "Heavy snow",
  80: "Slight showers",
  81: "Moderate showers",
  82: "Violent showers",
  95: "Thunderstorm",
  96: "Thunderstorm with hail",
  99: "Thunderstorm with heavy hail",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { trip_id, latitude, longitude, start_date, end_date } = await req.json();
    if (!trip_id || !latitude || !longitude) {
      throw new Error("Missing trip_id, latitude, or longitude");
    }

    // Fetch weather from Open-Meteo
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,weather_code&timezone=auto&start_date=${start_date}&end_date=${end_date}`;
    const weatherRes = await fetch(url);
    const weatherData = await weatherRes.json();

    if (!weatherData.daily) {
      throw new Error("No weather data returned");
    }

    // Delete old weather data for this trip
    await supabase.from("weather_data").delete().eq("trip_id", trip_id);

    // Insert new weather data
    const rows = weatherData.daily.time.map((date: string, i: number) => ({
      trip_id,
      date,
      temperature_high: weatherData.daily.temperature_2m_max[i],
      temperature_low: weatherData.daily.temperature_2m_min[i],
      rain_probability: weatherData.daily.precipitation_probability_max[i],
      wind_speed: weatherData.daily.wind_speed_10m_max[i],
      weather_code: weatherData.daily.weather_code[i],
      description: weatherCodeMap[weatherData.daily.weather_code[i]] || "Unknown",
    }));

    const { error: insertError } = await supabase.from("weather_data").insert(rows);
    if (insertError) throw insertError;

    return new Response(JSON.stringify({ success: true, days: rows.length }), {
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
