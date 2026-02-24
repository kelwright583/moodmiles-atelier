
-- Add latitude and longitude to trips
ALTER TABLE public.trips ADD COLUMN latitude DOUBLE PRECISION;
ALTER TABLE public.trips ADD COLUMN longitude DOUBLE PRECISION;

-- Create weather_data table
CREATE TABLE public.weather_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  temperature_high REAL,
  temperature_low REAL,
  rain_probability INTEGER,
  wind_speed REAL,
  weather_code INTEGER,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.weather_data ENABLE ROW LEVEL SECURITY;

-- RLS policies using is_trip_owner
CREATE POLICY "Users can view own weather data"
ON public.weather_data FOR SELECT
USING (is_trip_owner(trip_id));

CREATE POLICY "Users can insert weather data"
ON public.weather_data FOR INSERT
WITH CHECK (is_trip_owner(trip_id));

CREATE POLICY "Users can update own weather data"
ON public.weather_data FOR UPDATE
USING (is_trip_owner(trip_id));

CREATE POLICY "Users can delete own weather data"
ON public.weather_data FOR DELETE
USING (is_trip_owner(trip_id));

-- Index for faster lookups
CREATE INDEX idx_weather_data_trip_id ON public.weather_data(trip_id);
