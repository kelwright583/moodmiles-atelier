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
  // v2 identity fields
  handle: string | null;
  bio: string | null;
  home_city: string | null;
  style_vibe: string | null;
  nationality: string | null;
  onboarding_completed: boolean;
  handle_set: boolean;
  profile_completion_score: number;
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
  origin_city: string | null;
  origin_country: string | null;
  origin_latitude?: number | null;
  origin_longitude?: number | null;
  image_url: string | null;
  created_at: string;
  trip_theme: string | null;
  theme_colors: string[] | null;
  is_public: boolean;
  share_token: string;
  status: "upcoming" | "active" | "completed";
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

export interface Flight {
  id: string;
  trip_id: string;
  airline: string | null;
  flight_number: string | null;
  departure_airport: string | null;
  departure_city: string | null;
  departure_datetime: string | null;
  arrival_airport: string | null;
  arrival_city: string | null;
  arrival_datetime: string | null;
  confirmation_number: string | null;
  booking_url: string | null;
  document_url: string | null;
  notes: string | null;
  order_index: number;
  is_shared: boolean;
  created_at: string;
}

export interface TripEvent {
  id: string;
  trip_id: string;
  event_name: string;
  event_type: string | null;
  event_date: string | null;
  event_time: string | null;
  location: string | null;
  is_pinned: boolean;
  notes: string | null;
  dress_code: string | null;
  category: string | null;
  venue_name: string | null;
  venue_address: string | null;
  venue_place_id: string | null;
  booking_status: "researching" | "booked" | "confirmed" | "cancelled" | null;
  booking_reference: string | null;
  booking_url: string | null;
  cost_per_person: number | null;
  currency: string | null;
  share_token: string | null;
  created_at: string;
  gate: string | null;
  terminal: string | null;
  baggage_claim: string | null;
  flight_number: string | null;
  flight_status: "scheduled" | "boarding" | "departed" | "en_route" | "landed" | "cancelled" | "delayed" | null;
  flight_status_updated_at: string | null;
}

export interface EventAttendee {
  id: string;
  event_id: string;
  user_id: string;
  status: "going" | "maybe" | "declined";
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
  pinned_by: string | null;
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
  price: string | null;
  store: string | null;
  product_url: string | null;
  pinned: boolean;
  source: string | null;
  created_at: string;
}

export interface TripCollaborator {
  id: string;
  trip_id: string;
  user_id: string | null;
  invited_email: string | null;
  role: "host" | "collaborator" | "viewer";
  status: "pending" | "accepted" | "declined";
  invited_by: string | null;
  invite_token: string | null;
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
  price_from: string | null;
  image_url: string | null;
  source_url: string | null;
  booking_url: string | null;
  is_promoted: boolean;
  promoted_by: string | null;
  created_at: string;
}

export interface EventLook {
  id: string;
  trip_id: string;
  event_id: string;
  user_id: string;
  image_url: string | null;
  outfit_suggestion_id: string | null;
  created_at: string;
}

export interface TripPoll {
  id: string;
  trip_id: string;
  question: string;
  created_by: string;
  closes_at: string | null;
  created_at: string;
}

export interface PollOption {
  id: string;
  poll_id: string;
  option_text: string;
  image_url: string | null;
  order_index: number;
  created_at: string;
}

export interface PollVote {
  id: string;
  poll_id: string;
  option_id: string;
  user_id: string;
  created_at: string;
}

export interface TripMessage {
  id: string;
  trip_id: string;
  user_id: string;
  content: string | null;
  image_url: string | null;
  pinned_outfit_id: string | null;
  reactions: Record<string, string[]>;
  edited_at: string | null;
  created_at: string;
}

export interface TripPhoto {
  id: string;
  trip_id: string;
  uploaded_by: string;
  storage_path: string;
  caption: string | null;
  width: number | null;
  height: number | null;
  taken_at: string | null;
  created_at: string;
}

export interface TripExpense {
  id: string;
  trip_id: string;
  paid_by: string;
  description: string;
  amount: number;
  currency: string;
  category: "food" | "transport" | "accommodation" | "activity" | "shopping" | "other";
  split_between: string[];
  receipt_url: string | null;
  notes: string | null;
  expense_date: string;
  created_at: string;
}
