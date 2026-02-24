
-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT,
  style_profile TEXT[] DEFAULT '{}',
  luggage_size TEXT DEFAULT 'medium',
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Auto-create profile on signup
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

-- Trips table
CREATE TABLE public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  destination TEXT NOT NULL,
  country TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  trip_type TEXT,
  accommodation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

-- Helper function to check trip ownership
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

-- Wardrobe items (capsule items)
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

CREATE POLICY "Users can view own wardrobe items" ON public.wardrobe_items FOR SELECT USING (public.is_trip_owner(trip_id));
CREATE POLICY "Users can create wardrobe items" ON public.wardrobe_items FOR INSERT WITH CHECK (public.is_trip_owner(trip_id));
CREATE POLICY "Users can update own wardrobe items" ON public.wardrobe_items FOR UPDATE USING (public.is_trip_owner(trip_id));
CREATE POLICY "Users can delete own wardrobe items" ON public.wardrobe_items FOR DELETE USING (public.is_trip_owner(trip_id));

-- Packing list items
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

CREATE POLICY "Users can view own packing items" ON public.packing_items FOR SELECT USING (public.is_trip_owner(trip_id));
CREATE POLICY "Users can create packing items" ON public.packing_items FOR INSERT WITH CHECK (public.is_trip_owner(trip_id));
CREATE POLICY "Users can update own packing items" ON public.packing_items FOR UPDATE USING (public.is_trip_owner(trip_id));
CREATE POLICY "Users can delete own packing items" ON public.packing_items FOR DELETE USING (public.is_trip_owner(trip_id));

-- Trip events (pinnable)
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

CREATE POLICY "Users can view own trip events" ON public.trip_events FOR SELECT USING (public.is_trip_owner(trip_id));
CREATE POLICY "Users can create trip events" ON public.trip_events FOR INSERT WITH CHECK (public.is_trip_owner(trip_id));
CREATE POLICY "Users can update own trip events" ON public.trip_events FOR UPDATE USING (public.is_trip_owner(trip_id));
CREATE POLICY "Users can delete own trip events" ON public.trip_events FOR DELETE USING (public.is_trip_owner(trip_id));

-- Board items (mood board)
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

CREATE POLICY "Users can view own board items" ON public.board_items FOR SELECT USING (public.is_trip_owner(trip_id));
CREATE POLICY "Users can create board items" ON public.board_items FOR INSERT WITH CHECK (public.is_trip_owner(trip_id));
CREATE POLICY "Users can update own board items" ON public.board_items FOR UPDATE USING (public.is_trip_owner(trip_id));
CREATE POLICY "Users can delete own board items" ON public.board_items FOR DELETE USING (public.is_trip_owner(trip_id));

-- Storage bucket for mood board images
INSERT INTO storage.buckets (id, name, public) VALUES ('board-images', 'board-images', true);

CREATE POLICY "Users can upload board images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'board-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Anyone can view board images" ON storage.objects FOR SELECT USING (bucket_id = 'board-images');
CREATE POLICY "Users can delete own board images" ON storage.objects FOR DELETE USING (bucket_id = 'board-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Updated_at trigger
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
