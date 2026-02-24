// Local type definitions for database tables

export interface Profile {
  id: string;
  user_id: string;
  name: string | null;
  avatar_url: string | null;
  style_profile: string[];
  luggage_size: string;
  subscription_tier: string;
  created_at: string;
  updated_at: string;
}

export interface Trip {
  id: string;
  user_id: string;
  destination: string;
  country: string | null;
  start_date: string;
  end_date: string;
  trip_type: string | null;
  accommodation: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

export interface WeatherData {
  id: string;
  trip_id: string;
  date: string;
  temperature_high: number | null;
  temperature_low: number | null;
  rain_probability: number | null;
  wind_speed: number | null;
  weather_code: number | null;
  description: string | null;
  created_at: string;
}

export interface WardrobeItem {
  id: string;
  trip_id: string;
  category: string;
  description: string | null;
  color: string | null;
  tags: string[];
  image_url: string | null;
  order_index: number;
  created_at: string;
}

export interface PackingItem {
  id: string;
  trip_id: string;
  name: string;
  category: string | null;
  quantity: number;
  is_packed: boolean;
  order_index: number;
  created_at: string;
}

export interface TripEvent {
  id: string;
  trip_id: string;
  event_name: string;
  event_type: string | null;
  event_date: string | null;
  location: string | null;
  is_pinned: boolean;
  notes: string | null;
  created_at: string;
}

export interface BoardItem {
  id: string;
  trip_id: string;
  image_url: string | null;
  description: string | null;
  notes: string | null;
  order_index: number;
  created_at: string;
}

export interface OutfitItem {
  category: string;
  name: string;
  color: string;
  brand_suggestion?: string;
  search_terms: string;
}

export interface OutfitSuggestion {
  id: string;
  trip_id: string;
  title: string;
  occasion: string | null;
  description: string | null;
  items: OutfitItem[];
  image_url: string | null;
  pinned: boolean;
  created_at: string;
}

export interface ActivitySuggestion {
  id: string;
  trip_id: string;
  name: string;
  description: string | null;
  category: string | null;
  location: string | null;
  rating: number | null;
  price_level: string | null;
  image_url: string | null;
  source_url: string | null;
  created_at: string;
}
