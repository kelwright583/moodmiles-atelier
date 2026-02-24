

## Three priorities to address

### 1. Mobile-First Layout Fixes

**Problems identified:**
- Dashboard header uses `flex items-end justify-between` which causes the "New Trip" button to overlap the greeting text on small screens
- Landing page hero heading is `text-5xl` on mobile (too large)
- Sections use `py-32` padding which is excessive on mobile
- Destination cards grid doesn't stack well
- Trip detail hero has fixed `h-56` with absolute positioning that clips on mobile
- Navbar mobile menu needs refinement

**Fix approach across all pages:**
- **Dashboard**: Stack the header vertically on mobile (`flex-col` on small, `flex-row` on `md:`). Make trip cards single column. Reduce padding.
- **Index (Landing)**: Reduce hero heading to `text-3xl` on mobile, scale up to `text-7xl` on desktop. Reduce section padding from `py-32` to `py-16` on mobile. Stack destination cards vertically.
- **CreateTrip**: Already mostly fine with `md:grid-cols-2`, but reduce top padding and heading size on mobile.
- **TripDetail**: Make tabs horizontally scrollable on mobile. Reduce hero height on small screens.
- **Navbar**: Ensure mobile menu works cleanly with proper touch targets.

### 2. Google Maps Places Autocomplete for Destination Search

**Approach**: Use the Google Maps Places API (new Places Autocomplete) to let users search for destinations as they type in the Create Trip form.

**Architecture:**
- Create a backend function `google-places` that proxies requests to the Google Places API, keeping the API key secure server-side
- Store the Google Maps API key as a secret
- Build a `PlacesAutocomplete` component that shows suggestions as the user types, with debounced input
- When a place is selected, auto-fill the city and country fields
- Add `latitude` and `longitude` columns to the `trips` table for weather lookups

**Requires from user:** A Google Maps API key with Places API enabled.

### 3. Weather API Integration

**Approach**: Use the Open-Meteo API (free, no API key required) to fetch weather forecasts based on trip coordinates.

**Architecture:**
- Create a backend function `fetch-weather` that takes latitude/longitude and date range, calls the Open-Meteo forecast API
- Store weather data in a new `weather_data` table (trip_id, date, temp_high, temp_low, rain_probability, wind, weather_code, description)
- Auto-fetch weather when a trip is created (triggered from frontend after trip creation)
- Display real weather data in the Overview tab with a clean 7-day forecast grid
- Add a "Refresh Weather" button

**No API key required** -- Open-Meteo is free and open.

---

## Technical Details

### Database Migration
- Add `latitude DOUBLE PRECISION` and `longitude DOUBLE PRECISION` columns to `trips` table
- Create `weather_data` table:
  - `id UUID PRIMARY KEY`
  - `trip_id UUID REFERENCES trips(id) ON DELETE CASCADE`
  - `date DATE NOT NULL`
  - `temperature_high REAL`
  - `temperature_low REAL`
  - `rain_probability INTEGER`
  - `wind_speed REAL`
  - `weather_code INTEGER`
  - `description TEXT`
  - `created_at TIMESTAMPTZ DEFAULT now()`
- RLS policies on `weather_data` using `is_trip_owner`

### Edge Functions
1. **`google-places`** -- proxies autocomplete requests to Google Places API
2. **`fetch-weather`** -- calls Open-Meteo API, stores results in `weather_data` table

### Frontend Components
1. **`PlacesAutocomplete`** -- debounced search input with dropdown suggestions, used in CreateTrip
2. **Updated `OverviewTab`** -- fetches real weather data from `weather_data` table, shows forecast cards with icons mapped from weather codes
3. **All pages** -- responsive fixes with mobile-first Tailwind classes

### File Changes Summary
- `src/pages/Index.tsx` -- mobile padding/font fixes
- `src/pages/Dashboard.tsx` -- stack header on mobile, single-col trip cards
- `src/pages/CreateTrip.tsx` -- integrate PlacesAutocomplete, mobile refinements
- `src/pages/TripDetail.tsx` -- scrollable tabs, mobile hero
- `src/components/trip/OverviewTab.tsx` -- real weather display
- `src/components/layout/Navbar.tsx` -- mobile menu improvements
- `src/components/trip/PlacesAutocomplete.tsx` -- new component
- `supabase/functions/google-places/index.ts` -- new edge function
- `supabase/functions/fetch-weather/index.ts` -- new edge function
- `supabase/config.toml` -- register new functions
- Database migration for `weather_data` table and trips lat/lng columns
- `src/types/database.ts` -- add WeatherData interface

### Secret Required
- `GOOGLE_MAPS_API_KEY` -- user will need to provide a Google Maps API key with the Places API (New) enabled

