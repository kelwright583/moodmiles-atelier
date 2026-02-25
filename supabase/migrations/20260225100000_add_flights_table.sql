-- Flights table for trip itinerary
CREATE TABLE IF NOT EXISTS public.flights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  airline TEXT,
  flight_number TEXT,
  departure_airport TEXT,
  departure_city TEXT,
  departure_datetime TIMESTAMPTZ,
  arrival_airport TEXT,
  arrival_city TEXT,
  arrival_datetime TIMESTAMPTZ,
  confirmation_number TEXT,
  booking_url TEXT,
  document_url TEXT,
  notes TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.flights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage flights for own trips"
  ON public.flights FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.trips t
      WHERE t.id = flights.trip_id AND t.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trips t
      WHERE t.id = flights.trip_id AND t.user_id = auth.uid()
    )
  );

-- Storage bucket for flight documents (run in Supabase Dashboard if needed)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('flight-documents', 'flight-documents', false);
-- Storage policies would be added via Dashboard or separate migration
