-- ============================================
-- Concierge Styled Full Database Setup
-- Run this entire file in Supabase SQL Editor
-- for a fresh project
-- ============================================

-- 1. Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT,
  avatar_url TEXT,
  style_profile TEXT[] DEFAULT '{}',
  luggage_size TEXT DEFAULT 'medium',
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'luxe')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', ''));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Trips (with all columns)
CREATE TABLE public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  destination TEXT NOT NULL,
  country TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  trip_type TEXT,
  accommodation TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  origin_city TEXT,
  origin_country TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_trip_owner(_trip_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trips WHERE id = _trip_id AND user_id = auth.uid()
  );
$$;

CREATE POLICY "Users can view own trips" ON public.trips FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create trips" ON public.trips FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own trips" ON public.trips FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own trips" ON public.trips FOR DELETE USING (auth.uid() = user_id);

-- 3. Weather data
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

ALTER TABLE public.weather_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own weather data" ON public.weather_data FOR SELECT USING (is_trip_owner(trip_id));
CREATE POLICY "Users can insert weather data" ON public.weather_data FOR INSERT WITH CHECK (is_trip_owner(trip_id));
CREATE POLICY "Users can update own weather data" ON public.weather_data FOR UPDATE USING (is_trip_owner(trip_id));
CREATE POLICY "Users can delete own weather data" ON public.weather_data FOR DELETE USING (is_trip_owner(trip_id));

CREATE INDEX idx_weather_data_trip_id ON public.weather_data(trip_id);

-- 4. Wardrobe items
CREATE TABLE public.wardrobe_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  description TEXT,
  color TEXT,
  tags TEXT[] DEFAULT '{}',
  image_url TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wardrobe_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wardrobe items" ON public.wardrobe_items FOR SELECT USING (is_trip_owner(trip_id));
CREATE POLICY "Users can create wardrobe items" ON public.wardrobe_items FOR INSERT WITH CHECK (is_trip_owner(trip_id));
CREATE POLICY "Users can update own wardrobe items" ON public.wardrobe_items FOR UPDATE USING (is_trip_owner(trip_id));
CREATE POLICY "Users can delete own wardrobe items" ON public.wardrobe_items FOR DELETE USING (is_trip_owner(trip_id));

-- 5. Packing items
CREATE TABLE public.packing_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  quantity INTEGER DEFAULT 1,
  is_packed BOOLEAN DEFAULT false,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.packing_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own packing items" ON public.packing_items FOR SELECT USING (is_trip_owner(trip_id));
CREATE POLICY "Users can create packing items" ON public.packing_items FOR INSERT WITH CHECK (is_trip_owner(trip_id));
CREATE POLICY "Users can update own packing items" ON public.packing_items FOR UPDATE USING (is_trip_owner(trip_id));
CREATE POLICY "Users can delete own packing items" ON public.packing_items FOR DELETE USING (is_trip_owner(trip_id));

-- 6. Trip events
CREATE TABLE public.trip_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  event_type TEXT,
  event_date DATE,
  location TEXT,
  is_pinned BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.trip_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trip events" ON public.trip_events FOR SELECT USING (is_trip_owner(trip_id));
CREATE POLICY "Users can create trip events" ON public.trip_events FOR INSERT WITH CHECK (is_trip_owner(trip_id));
CREATE POLICY "Users can update own trip events" ON public.trip_events FOR UPDATE USING (is_trip_owner(trip_id));
CREATE POLICY "Users can delete own trip events" ON public.trip_events FOR DELETE USING (is_trip_owner(trip_id));

-- 7. Board items
CREATE TABLE public.board_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  image_url TEXT,
  description TEXT,
  notes TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.board_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own board items" ON public.board_items FOR SELECT USING (is_trip_owner(trip_id));
CREATE POLICY "Users can create board items" ON public.board_items FOR INSERT WITH CHECK (is_trip_owner(trip_id));
CREATE POLICY "Users can update own board items" ON public.board_items FOR UPDATE USING (is_trip_owner(trip_id));
CREATE POLICY "Users can delete own board items" ON public.board_items FOR DELETE USING (is_trip_owner(trip_id));

-- 8. Outfit suggestions
CREATE TABLE public.outfit_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  occasion TEXT,
  description TEXT,
  items JSONB NOT NULL DEFAULT '[]',
  image_url TEXT,
  pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.outfit_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own outfit suggestions" ON public.outfit_suggestions FOR SELECT USING (is_trip_owner(trip_id));
CREATE POLICY "Users can insert outfit suggestions" ON public.outfit_suggestions FOR INSERT WITH CHECK (is_trip_owner(trip_id));
CREATE POLICY "Users can update own outfit suggestions" ON public.outfit_suggestions FOR UPDATE USING (is_trip_owner(trip_id));
CREATE POLICY "Users can delete own outfit suggestions" ON public.outfit_suggestions FOR DELETE USING (is_trip_owner(trip_id));

CREATE INDEX idx_outfit_suggestions_trip ON public.outfit_suggestions(trip_id);

-- 9. Activity suggestions
CREATE TABLE public.activity_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  location TEXT,
  rating REAL,
  price_level TEXT,
  image_url TEXT,
  source_url TEXT,
  booking_url TEXT,
  is_promoted BOOLEAN NOT NULL DEFAULT false,
  promoted_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activity suggestions" ON public.activity_suggestions FOR SELECT USING (is_trip_owner(trip_id));
CREATE POLICY "Users can insert activity suggestions" ON public.activity_suggestions FOR INSERT WITH CHECK (is_trip_owner(trip_id));
CREATE POLICY "Users can update own activity suggestions" ON public.activity_suggestions FOR UPDATE USING (is_trip_owner(trip_id));
CREATE POLICY "Users can delete own activity suggestions" ON public.activity_suggestions FOR DELETE USING (is_trip_owner(trip_id));

CREATE INDEX idx_activity_suggestions_trip ON public.activity_suggestions(trip_id);

-- 10. Storage buckets (create via Dashboard if SQL fails: Storage > New bucket)
INSERT INTO storage.buckets (id, name, public) VALUES ('board-images', 'board-images', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('outfit-images', 'outfit-images', true);

-- Storage policies
CREATE POLICY "Users can upload board images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'board-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Anyone can view board images" ON storage.objects FOR SELECT USING (bucket_id = 'board-images');
CREATE POLICY "Users can delete own board images" ON storage.objects FOR DELETE USING (bucket_id = 'board-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Avatar images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users can upload their own avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update their own avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own avatar" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Outfit images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'outfit-images');
CREATE POLICY "Service role can upload outfit images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'outfit-images');
CREATE POLICY "Service role can delete outfit images" ON storage.objects FOR DELETE USING (bucket_id = 'outfit-images');
