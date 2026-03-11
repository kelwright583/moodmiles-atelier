# Concierge Styled — Complete Gap Analysis & Build Roadmap

> **Generated:** 26 February 2026  
> **Source:** `concierge-styled-build-spec.pdf` (Prompts Fix + 15–27) vs current codebase  
> **Status:** 14 of 27 prompts complete. 13 prompts + 1 fix prompt remaining.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [What Already Exists (Prompts 1–14)](#2-what-already-exists)
3. [Critical Fixes Required Before Any New Work](#3-critical-fixes--fix-prompt)
4. [Prompt 15 — PWA & Mobile Experience](#4-prompt-15--pwa--mobile-experience)
5. [Prompt 16 — Brand Polish & Consistency](#5-prompt-16--brand-polish--consistency)
6. [Prompt 17 — Stripe UK Integration](#6-prompt-17--stripe-uk-integration)
7. [Prompt 18 — Travel Mode + Today Tab + Flight Alerts](#7-prompt-18--travel-mode--today-tab--flight-alerts)
8. [Prompt 19 — Shared Photo Album](#8-prompt-19--shared-photo-album)
9. [Prompt 20 — Expenses + Bill Splitter](#9-prompt-20--expenses--bill-splitter)
10. [Prompt 21 — Memories + Instagram Carousel](#10-prompt-21--memories--instagram-carousel)
11. [Prompt 22 — Booking Email Import](#11-prompt-22--booking-email-import)
12. [Prompt 23 — Document Vault](#12-prompt-23--document-vault)
13. [Prompt 24 — Geo-Aware Retailers](#13-prompt-24--geo-aware-retailers)
14. [Prompt 25 — Stripe UK Final Config](#14-prompt-25--stripe-uk-final-config)
15. [Prompt 26 — Promo Codes + VIP Links + Admin](#15-prompt-26--promo-codes--vip-links--admin)
16. [Prompt 27 — Full Admin Operations Platform](#16-prompt-27--full-admin-operations-platform)
17. [New API Keys & Services Required](#17-new-api-keys--services-required)
18. [New Database Tables & Columns Required](#18-new-database-tables--columns-required)
19. [New Edge Functions Required](#19-new-edge-functions-required)
20. [New Pages & Components Required](#20-new-pages--components-required)
21. [Manual Actions (Cannot Be Coded)](#21-manual-actions)
22. [Recommended Build Order](#22-recommended-build-order)

---

## 1. Executive Summary

The current codebase has **15 pages, ~78 components, 28 edge functions, and 26 database migrations**. It covers trip creation, outfit suggestions, packing, activities, weather, briefings, Spotify playlists, collaboration (invites, chat, polls, board), PDF lookbook, notifications, basic Stripe checkout, and public sharing.

**What is completely missing (zero code exists):**

| Feature | Prompt | Complexity |
|---------|--------|------------|
| PWA support (manifest, service worker, install prompts) | 15 | Medium |
| Offline page | 15 | Low |
| Mobile UI polish (safe areas, tap targets, gestures) | 15 | Medium |
| Code splitting / lazy loading for tabs | 15 | Low |
| Comprehensive empty states for every tab | 16 | Medium |
| Comprehensive error states for every API call | 16 | Medium |
| Framer Motion entrance animations on every page | 16 | Medium |
| Stripe UK with proper USD billing + tax | 17 | High |
| Annual pricing with toggle | 25 | Medium |
| Post-upgrade celebration modal with confetti | 25 | Low |
| Trip status system (upcoming/active/completed) | 18 | Medium |
| Travel Mode tab reordering | 18 | Medium |
| Today Tab (leave reminder, flight status, next event, rendezvous) | 18 | High |
| Flight status tracking (AviationStack API) | 18 | High |
| Leave time calculator (Google Distance Matrix) | 18 | Medium |
| Shared Photo Album with upload, masonry, lightbox | 19 | High |
| Expenses Tab with receipt scanning + bill splitter | 20 | High |
| Memories Tab + Instagram Carousel Builder | 21 | High |
| Booking Email Import (Postmark + GPT parsing) | 22 | High |
| Document Vault with expiry tracking | 23 | Medium |
| Geo-aware retailer filtering | 24 | Medium |
| Promo code system | 26 | Medium |
| VIP invite links + landing page | 26 | Medium |
| Full Admin Operations Platform (9 sections) | 27 | Very High |

**What exists but needs fixing:**

| Issue | Location | Severity |
|-------|----------|----------|
| Onboarding crash — `navigate()` called before hooks | `Onboarding.tsx` | 🔴 Critical |
| Google OAuth redirects to `/` instead of `/dashboard` | `Auth.tsx` | 🔴 Critical |
| Logged-in users with incomplete onboarding not redirected | `Index.tsx` | 🟡 High |
| Instagram trip card canvas taint (missing `crossOrigin`) | Trip card download | 🟡 High |
| Possible remaining "Concierge Global" branding references | Various | 🟡 High |
| Serper API URL was wrong (fixed in this session) | Edge functions | ✅ Fixed |

---

## 2. What Already Exists

### Pages (15 total)
- `/` — Landing page with hero, features, trending destinations
- `/auth` — Login/signup with email + Google OAuth
- `/reset-password` — Password reset
- `/onboarding` — 4-step onboarding (name, handle, style, photo)
- `/dashboard` — Trip list, shared trips, trending overlay
- `/create-trip` — Trip creation form with Places autocomplete
- `/trip/:id` — Trip detail with 8 tabs
- `/trip/:tripId/lookbook` — PDF lookbook export (Atelier only)
- `/settings` — Profile, style preferences, Spotify, membership
- `/profile/:handle` — Public profile page
- `/invite/:token` — Collaboration invite accept
- `/event/:share_token` — Public event page
- `/auth/spotify/callback` — Spotify OAuth callback
- `/trip/share/:shareToken` — Public trip page
- `*` — 404 page

### Trip Detail Tabs (8 total)
1. **Overview** — Weather, collaborators, flights, invite modal
2. **Briefing** — AI destination briefing (health, visa, dress codes)
3. **Events** — Trip events, activities, venue autocomplete, dress codes
4. **Chat** — Realtime group chat with images, reactions, outfit sharing
5. **Style** — Editorial/shop/coordinate modes, AI outfit generation, pins
6. **Board** — Pinned outfits, polls, theme board
7. **Playlist** — Spotify integration (create, search, AI suggestions)
8. **Pack** — AI packing suggestions, leave-behind, rental suggestions

### Edge Functions (28 total)
`accept-invite`, `add-to-playlist`, `check-dress-codes`, `check-handle`, `complete-onboarding`, `create-checkout`, `create-notification`, `create-portal`, `create-trip-playlist`, `fetch-destination-image`, `fetch-trends`, `fetch-weather`, `generate-briefing`, `generate-leave-behind`, `generate-outfits`, `get-event-details`, `get-invite-details`, `get-playlist-tracks`, `get-public-trip`, `get-shoppable-outfits`, `google-places`, `invite-collaborator`, `save-spotify-tokens`, `search-fashion`, `search-spotify-tracks`, `stripe-webhook`, `suggest-activities`, `suggest-packing`, `sync-affiliate-products`, `toggle-trip-visibility`, `vote-poll`

### Database (26 migrations)
Key tables: `profiles`, `trips`, `trip_events`, `event_attendees`, `trip_collaborators`, `outfit_suggestions`, `board_items`, `packing_items`, `wardrobe_items`, `weather_data`, `flights`, `trip_polls`, `poll_options`, `poll_votes`, `trip_messages`, `activity_suggestions`, `affiliate_products`, `notifications`, `api_usage`

---

## 3. Critical Fixes — Fix Prompt

These must be resolved **before any new features are built**.

### 3.1 Onboarding Crash 🔴
**File:** `src/pages/Onboarding.tsx`  
**Problem:** `navigate('/dashboard')` is called before all hooks have run, causing a React error and blank white screen.  
**Fix:** Move the navigate call into a `useEffect` that depends on the profile query result. Add a loading spinner while the profile query is running.

```tsx
const { data: profile, isLoading } = useQuery(...)

useEffect(() => {
  if (!isLoading && profile?.onboarding_completed) {
    navigate('/dashboard');
  }
}, [isLoading, profile, navigate]);
```

### 3.2 Google OAuth Redirect 🔴
**File:** `src/pages/Auth.tsx`  
**Problem:** After successful Google sign-in, the app redirects to `/` instead of `/dashboard`.  
**Fix:** Update `handleGoogleSignIn` to set `redirectTo` to `/dashboard`, or update the auth state change listener.

### 3.3 Index.tsx Redirect for Incomplete Onboarding 🟡
**File:** `src/pages/Index.tsx`  
**Problem:** If a user is logged in but has `onboarding_completed = false`, they see the landing page instead of being redirected to `/onboarding`.  
**Fix:** Add a check in the Index page `useEffect` or `ProtectedRoute` logic.

### 3.4 Instagram Trip Card Canvas Taint 🟡
**File:** Wherever the trip card download lives (likely in trip sharing/public trip components)  
**Problem:** `<img>` elements used in `html-to-image` capture are missing `crossOrigin='anonymous'`, causing canvas taint errors and silent download failures.  
**Fix:**
- Add `crossOrigin='anonymous'` to all `<img>` elements in the capture area
- Resize card to 540×960px (9:16 Instagram Stories ratio)
- Layout: Top 40% hero image, middle 45% trip details + outfit images, bottom 15% tagline + URL
- Colours: dark background `#151311`, gold `#ca975c` accent, white body text

### 3.5 Rebrand: "Concierge Global" → "Concierge Styled" 🟡
**Files to check:** `Logo.tsx`, `Navbar.tsx`, `index.html` (title, og:tags), `manifest.json`, `Auth.tsx`, edge function email templates, any metadata files.  
**Action:** Global find-and-replace of "Concierge Global" with "Concierge Styled" across the entire codebase.

---

## 4. Prompt 15 — PWA & Mobile Experience

### What Needs to Be Built

#### 4.1 PWA Manifest
**File:** `public/manifest.json`  
**Status:** ❌ Does not exist or needs complete rewrite  
**Requirements:**
- `name`: "Concierge Styled"
- `short_name`: "Concierge"
- `description`: "Arrive Impeccably Everywhere — AI travel wardrobe planning"
- `start_url`: "/"
- `display`: "standalone"
- `background_color`: "#151311"
- `theme_color`: "#ca975c"
- `orientation`: "portrait"
- `icons`: 192×192 and 512×512 (gold "CS" monogram on dark background)

#### 4.2 Service Worker (vite-plugin-pwa)
**Status:** ❌ Not installed, not configured  
**Requirements:**
- Install `vite-plugin-pwa`
- Add `VitePWA` plugin to `vite.config.ts`
- Precache: `CacheFirst` for static assets, `NetworkFirst` for API calls
- Runtime cache: `StaleWhileRevalidate` for Supabase storage images
- Offline fallback: show `/offline` page

#### 4.3 Offline Page
**File:** `src/pages/Offline.tsx`  
**Status:** ❌ Does not exist  
**Requirements:** Branded page with "You appear to be offline" + list of cached trip names from localStorage

#### 4.4 iOS Install Prompt
**File:** `src/components/InstallPrompt.tsx`  
**Status:** ❌ Does not exist  
**Requirements:**
- Detect iOS Safari + not already installed (`window.navigator.standalone === false`)
- Show bottom sheet after second session
- iOS-specific instructions: Share → Add to Home Screen
- Dismissible, stores state in localStorage

#### 4.5 Android Install Banner
**Status:** ❌ Does not exist  
**Requirements:**
- Capture `beforeinstallprompt` event
- Show gold banner after 10 seconds on dashboard
- Install button triggers deferred prompt
- Dismissible with localStorage

#### 4.6 Mobile UI Polish
**Status:** ❌ None of these exist  
- `env(safe-area-inset-bottom)` padding on all bottom-fixed elements
- Content padding-top accounting for navbar height
- All modals: `max-height: 90vh` with `overflow-y: auto`
- All tap targets: minimum 44×44px
- `@media (hover: none)` to suppress sticky hover states on mobile
- `-webkit-overflow-scrolling: touch` on scrollable containers
- `touch-action: manipulation` on interactive elements

#### 4.7 Performance
**Status:** ❌ Not implemented  
- `loading='lazy'` on all below-fold images
- `React.lazy()` + `Suspense` for each tab in TripDetail.tsx
- Skeleton loader fallbacks

---

## 5. Prompt 16 — Brand Polish & Consistency

### What Needs to Be Done

#### 5.1 Typography Audit
**Status:** ❌ Not audited  
- ALL headings must use `font-heading` (Playfair Display)
- ALL body text/labels must use `font-body` (Inter)
- Uppercase labels need `tracking-[0.2em]` minimum
- No raw `h1-h6` tags without `font-heading`

#### 5.2 Colour Audit
**Status:** ❌ Not audited  
- Primary gold: `#ca975c` — accents, borders, badges, CTAs
- Background dark: `#151311` — app background, modal overlays
- Muted brown: `#615648` — secondary text, metadata
- Near-white: `#f9f6f3` — primary body text on dark backgrounds
- No inline colours outside the palette

#### 5.3 Empty States for Every Tab
**Status:** ❌ Most tabs lack proper empty states  

| Tab | Empty State Required |
|-----|---------------------|
| Briefing | Compass icon + "Your destination briefing will appear here once you add a destination" |
| Events | Calendar icon + "Add your first event — dinners, excursions, flights and more" |
| Board | Hanger icon + "Pin outfits from the Style tab to build your trip board" |
| Chat | Message icon + "Start the conversation — your group chat lives here" |
| Playlist | Music note icon + "Every trip deserves a soundtrack" |
| Dashboard shared trips | "When someone invites you to a trip it appears here" |

#### 5.4 Error States for Every API Call
**Status:** ❌ Not comprehensive  
- Every edge function call needs a `catch` with a friendly toast
- Components must return to previous functional state, never stuck in loading
- Pattern: `catch (e) { toast({ title: 'Something went wrong', description: e.message, variant: 'destructive' }) }`

#### 5.5 Framer Motion Animations
**Status:** ❌ Minimal or no entrance animations  
- Every page: `initial={{ opacity: 0, y: 20 }}` → `animate={{ opacity: 1, y: 0 }}`
- List items: staggered children with `staggerChildren: 0.05`
- Modals: scale from 0.95 → 1.0 with opacity
- Cards: subtle hover `scale: 1.01` on desktop only

#### 5.6 Brand Consistency Final Check
- Browser tab title: "Concierge Styled"
- All "Concierge Global" references: gone
- Favicon: gold CS monogram
- `og:title`: "Concierge Styled — Arrive Impeccably Everywhere"
- `og:description`: "Intelligent travel wardrobe planning for the modern, elevated traveller."

---

## 6. Prompt 17 — Stripe UK Integration

### Prerequisites (Manual — Cannot Be Coded)
- [ ] UK Ltd registered at companieshouse.gov.uk
- [ ] Wise Business account open
- [ ] Stripe UK account created with UK Ltd details
- [ ] Stripe products created: Luxe ($14.99/mo), Atelier ($29.99/mo)
- [ ] Stripe webhook secret obtained

### What Needs to Be Built/Changed

#### 6.1 Environment Variables
**Status:** ❌ Need to be set up for UK Stripe  
- `STRIPE_SECRET_KEY` (sk_live_...)
- `STRIPE_PUBLISHABLE_KEY` (pk_live_...)
- `STRIPE_LUXE_PRICE_ID` (price_...)
- `STRIPE_ATELIER_PRICE_ID` (price_...)
- `STRIPE_WEBHOOK_SECRET` (whsec_...)

#### 6.2 Pricing Page
**File:** `src/pages/Pricing.tsx` (may not exist — needs to be created or Settings page updated)  
**Status:** ❌ No dedicated Pricing page found in routes  
**Requirements:**
- All prices in USD
- "Billed in USD · Cancel anytime" below each plan
- "Secure payments by Stripe" badge
- Payment icons: Visa, Mastercard, Amex, Apple Pay, Google Pay

#### 6.3 Checkout Session Updates
**Status:** ⚠️ `create-checkout` exists but needs audit  
- `currency: 'usd'`
- `payment_method_types: ['card']`
- `customer_email`: pre-filled from profile
- `success_url`: `/dashboard?upgraded=true`
- `cancel_url`: `/pricing`
- `metadata`: `{ user_id, plan: 'luxe' | 'atelier' }`
- `automatic_tax: { enabled: true }`
- `tax_id_collection: { enabled: true }`

#### 6.4 Webhook Handler Updates
**Status:** ⚠️ `stripe-webhook` exists but needs audit  
Must handle:
- `checkout.session.completed` → set `subscription_tier` from metadata
- `customer.subscription.deleted` → set tier to "free"
- `customer.subscription.updated` → update tier if changed

#### 6.5 Post-Upgrade Experience
**Status:** ❌ No celebration modal  
- Detect `upgraded=true` query param on Dashboard
- Show celebration modal: "Welcome to Concierge [tier]" + unlocked features
- Remove param from URL via `history.replaceState`

#### 6.6 Customer Portal
**Status:** ⚠️ `create-portal` exists — needs audit for UK setup  
- "Manage subscription" link in Settings
- Verify `stripe_customer_id` column on profiles
- Return URL: site URL + `/settings`

---

## 7. Prompt 18 — Travel Mode + Today Tab + Flight Alerts

This is the **single most impactful prompt** for the on-trip experience.

### New API Keys Required
- `AVIATIONSTACK_API_KEY` — free tier at aviationstack.com (1000 req/month)
- `GOOGLE_MAPS_API_KEY` — enable Distance Matrix API (already have key, need to enable the API)

### 7.1 Database Migration
**Status:** ❌ None of these columns exist  
```sql
ALTER TABLE trips ADD COLUMN status TEXT DEFAULT 'upcoming' 
  CHECK(status IN ('upcoming','active','completed'));
ALTER TABLE trip_events ADD COLUMN gate TEXT;
ALTER TABLE trip_events ADD COLUMN terminal TEXT;
ALTER TABLE trip_events ADD COLUMN baggage_claim TEXT;
ALTER TABLE trip_events ADD COLUMN flight_status TEXT DEFAULT 'scheduled' 
  CHECK(flight_status IN ('scheduled','boarding','departed','en_route','landed','cancelled','delayed'));
ALTER TABLE trip_events ADD COLUMN flight_status_updated_at TIMESTAMPTZ;
```

### 7.2 Postgres Function
**Status:** ❌ Does not exist  
- `update_trip_statuses()` — sets trips to upcoming/active/completed based on dates
- Called on every trip load

### 7.3 New Edge Function: `get-flight-status`
**Status:** ❌ Does not exist  
- Calls AviationStack API with flight_number + flight_date
- Returns: status, gates, terminals, baggage, departure/arrival times, delays
- Caches result in trip_events row
- Graceful "Flight not found" handling

### 7.4 New Edge Function: `calculate-leave-time`
**Status:** ❌ Does not exist  
- Calls Google Maps Distance Matrix API
- Adds 20 min airport buffer + 90 min check-in
- Returns: leave_at, travel_duration, distance, buffer_used

### 7.5 Tab Reordering in TripDetail.tsx
**Status:** ❌ Tabs are static  
- When `trip.status === 'active'`: Show Today, Photos, Expenses, Chat, Playlist first; planning tabs in collapsible section
- When upcoming/completed: original tab order

### 7.6 New Component: TodayTab.tsx
**Status:** ❌ Does not exist  
**Sections:**
1. **Leave Reminder Card** (amber) — "Leave by 14:35 to catch your 17:05 flight" with drive time + buffer
2. **Flight Status Card** — flight number, airline, route, status badge (scheduled/boarding/delayed/cancelled), gate, terminal; polls every 10 minutes
3. **Next Up Countdown** — "Dinner at Nobu in 3h 20m" with dress code pill; updates every minute
4. **Rendezvous Share** — location + time form → WhatsApp share link
5. **Tomorrow Preview** — collapsible section with next day's events

---

## 8. Prompt 19 — Shared Photo Album

### 8.1 Database
**Status:** ❌ Table does not exist  
```sql
CREATE TABLE trip_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips NOT NULL,
  uploaded_by UUID REFERENCES auth.users NOT NULL,
  storage_path TEXT NOT NULL,
  caption TEXT,
  width INTEGER,
  height INTEGER,
  taken_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```
- RLS: trip members can INSERT/SELECT, only uploader or host can DELETE
- Storage bucket: `trip-photos` (public read, authenticated write, max 20MB)

### 8.2 New Component: PhotosTab.tsx
**Status:** ❌ Does not exist  
- **Upload:** Camera capture + gallery picker, compress to max 2000px before upload, progress bar, tier gate (Free: 50, Luxe: 200, Atelier: unlimited)
- **Collaborator filter pills** with photo counts
- **Masonry grid:** 2 columns mobile, 3 tablet+, natural aspect ratios
- **Lightbox:** Full screen, swipe navigation, swipe down to close, caption, uploader info, download/delete
- **Realtime:** Subscribe to `trip_photos` INSERT, gold border flash on new photos
- Empty state: camera icon + "No photos yet"

---

## 9. Prompt 20 — Expenses + Bill Splitter

### 9.1 Database
**Status:** ❌ Table does not exist  
```sql
CREATE TABLE trip_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips NOT NULL,
  paid_by UUID REFERENCES auth.users NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  category TEXT DEFAULT 'other' CHECK(category IN ('food','transport','accommodation','activity','shopping','other')),
  split_between UUID[] DEFAULT '{}',
  receipt_url TEXT,
  notes TEXT,
  expense_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);
```
- Storage bucket: `receipts` (private, max 10MB)

### 9.2 New Edge Function: `scan-receipt`
**Status:** ❌ Does not exist  
- GPT-4o-mini vision: extract total, currency, merchant, date from receipt image
- Returns parsed JSON or error

### 9.3 New Component: ExpensesTab.tsx
**Status:** ❌ Does not exist  
- **Summary card:** Total spend, your share, you're owed, you owe
- **Add Expense modal:** SCAN mode (camera → GPT parse → pre-fill) or MANUAL mode (description, amount, currency, category icons, date, split selector)
- **Expense list:** Grouped by date, category icon, description, amount, paid by, split count; expandable detail with receipt thumbnail
- **Settle Up sheet:** Net balance calculation, "Kelwyn owes Tash $34.50" with WhatsApp pay request button

---

## 10. Prompt 21 — Memories + Instagram Carousel

### 10.1 New Component: MemoriesTab.tsx
**Status:** ❌ Does not exist  
- Only shows when `trip.status === 'completed'`
- Tier gate: Luxe and Atelier only
- **Trip stats recap:** Nights away, events attended, photos taken, songs on playlist, destinations
- **Carousel Builder:**
  - Photo selector grid (up to 10, gold border on selected)
  - Frame style: Minimal (white), Editorial (dark + gold), Clean (full bleed)
  - AI caption toggle → GPT-4o-mini generates Instagram caption
  - Preview of first 3 slides
  - Export: 1080×1080px PNGs (cover slide, photo slides, closing slide)
  - Progress: "Generating slide 3 of 8..."

---

## 11. Prompt 22 — Booking Email Import

### Prerequisites (Manual)
- [ ] Postmark account at postmarkapp.com
- [ ] Inbound email domain configured
- [ ] `POSTMARK_API_KEY` added to Supabase secrets

### 11.1 Database
**Status:** ❌ Does not exist  
```sql
ALTER TABLE profiles ADD COLUMN import_token TEXT UNIQUE 
  DEFAULT substring(gen_random_uuid()::text from 1 for 8);

CREATE TABLE imported_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  raw_email TEXT,
  parsed_type TEXT CHECK(parsed_type IN ('flight','hotel','restaurant','activity','transfer','other')),
  parsed_data JSONB,
  trip_id UUID REFERENCES trips,
  event_id UUID REFERENCES trip_events,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','assigned','ignored')),
  received_at TIMESTAMPTZ DEFAULT now()
);
```

### 11.2 New Edge Function: `inbound-email`
**Status:** ❌ Does not exist  
- `verify_jwt = false` (Postmark webhook)
- Parse import token from To address
- GPT-4o-mini parses booking email → JSON
- Auto-create trip_event if single upcoming/active trip
- Otherwise: status = "pending" for manual assignment

### 11.3 Settings — Import Section
**Status:** ❌ Does not exist  
- Show personal import address: `import+[token]@concierge-styled.com`
- Copy button
- Instructions text
- Recent imports list (last 10)
- "Assign to trip" dropdown for pending imports
- "Ignore" button

---

## 12. Prompt 23 — Document Vault

### 12.1 Database
**Status:** ❌ Does not exist  
```sql
CREATE TABLE travel_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  document_type TEXT CHECK(document_type IN 
    ('passport','visa','travel_insurance','vaccination_certificate','drivers_license','other')) NOT NULL,
  country_of_issue TEXT,
  document_number TEXT,
  issue_date DATE,
  expiry_date DATE,
  storage_path TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```
- Storage bucket: `documents` (PRIVATE, max 20MB)

### 12.2 New Edge Function: `check-document-expiry`
**Status:** ❌ Does not exist  
- Returns: document_type, expiry_date, days_until_expiry, is_expired

### 12.3 Dashboard Alerts
**Status:** ❌ Does not exist  
- Amber banner: document expires within 90 days
- Red banner: document already expired
- Dismissible for session (localStorage)

### 12.4 Settings — Document Vault Section
**Status:** ❌ Does not exist  
- Atelier tier only (upgrade prompt for others)
- Add document modal: type, country, number, dates, file upload, notes
- Document cards: type icon, label, expiry pill (green >180d, amber 31-180d, red <30d)
- Edit/Delete/View buttons

### 12.5 Briefing Integration
**Status:** ❌ Not integrated  
- When generating briefing: check passport expiry against trip dates
- Include warning if passport expires during or near trip

---

## 13. Prompt 24 — Geo-Aware Retailers

### 13.1 Database
**Status:** ⚠️ Migration `20260310160000_affiliate_products_region.sql` exists — verify it was applied  

### 13.2 Retailer Config
**File:** `src/config/retailers.ts`  
**Status:** ❌ Does not exist  
- Retailer → region mapping (SA, UK, US, UAE, AU, Global)
- SA: Superbalist, Spree, Bash, Poetry, Mr Price, Woolworths
- UK: ASOS, Net-a-Porter, Selfridges, M&S
- US: Nordstrom, Revolve, Shopbop, Anthropologie
- UAE: Ounass, Sivvi, Level Shoes
- AU: The Iconic, ASOS AU
- Global: Farfetch, Vestiaire, SSENSE, By Rotation, Rent the Runway

### 13.3 search-fashion Edge Function Update
**Status:** ❌ No geo filtering  
- Accept optional `user_region` parameter
- Prioritise products matching user's region or "global"
- Filter out irrelevant regional retailers

### 13.4 InspirationTab Update
**Status:** ❌ No region awareness  
- Read nationality from profile → map to region code
- Pass `user_region` to search-fashion
- Better error handling: "No results found" and "Having trouble loading" with retry

---

## 14. Prompt 25 — Stripe UK Final Config

### 14.1 Annual Pricing
**Status:** ❌ Does not exist  
- New env vars: `STRIPE_LUXE_ANNUAL_PRICE_ID`, `STRIPE_ATELIER_ANNUAL_PRICE_ID`
- Stripe products: Luxe Annual $99/yr, Atelier Annual $199/yr

### 14.2 Pricing Page Update
**Status:** ❌ No toggle exists  
- Monthly/Annual toggle at top
- Annual prices with "Save X%" gold badge
- "Most Popular" badge on Luxe
- Feature comparison table below plan cards

### 14.3 Celebration Modal with Confetti
**Status:** ❌ Does not exist  
- Install `canvas-confetti`
- Detect `upgraded=true` + `plan=luxe/atelier` in URL params
- Luxe modal: "Welcome to Concierge Luxe ✨" + feature list
- Atelier modal: "Welcome to Concierge Atelier 🌟" + feature list
- "Start planning" button clears params

---

## 15. Prompt 26 — Promo Codes + VIP Links + Admin

### 15.1 Database
**Status:** ❌ None of these tables exist  
- `promo_codes` — code, tier, duration_months, max_uses, current_uses, is_active, expires_at
- `promo_redemptions` — promo_code_id, user_id, redeemed_at
- `vip_links` — label, token, tier, duration_months, max_uses, current_uses, is_active
- `vip_redemptions` — vip_link_id, user_id, redeemed_at
- `profiles` additions: `promo_expires_at`, `promo_tier`, `vip_link_token`

### 15.2 Tier Helper
**File:** `src/lib/tier.ts`  
**Status:** ❌ Does not exist  
- `getEffectiveTier(profile)`: checks Stripe tier, promo tier (if not expired), returns highest
- Must replace ALL direct `profile.subscription_tier` references throughout the app

### 15.3 New Edge Functions
- `redeem-promo` — validate code, increment uses, update profile promo_tier + expiry
- `redeem-vip` — validate VIP token, update profile

### 15.4 VIP Landing Page
**File:** `src/pages/VipLanding.tsx` at `/vip/:token`  
**Status:** ❌ Does not exist  
- Branded full-screen page: logo, "You've been personally invited", tier badge
- "Create Account & Claim" → `/auth?vip=[token]`
- After auth: auto-redeem VIP, redirect to dashboard

### 15.5 Settings — Promo Code Input
**Status:** ❌ Does not exist  
- "Have a promo code?" collapsible section
- Text input + "Apply" button
- Success/error messaging

### 15.6 Basic Admin Panel
**File:** `src/pages/admin/AdminPanel.tsx` at `/admin`  
**Status:** ❌ Does not exist  
- Password gate (ADMIN_PASSWORD env var)
- No link in main UI
- User lookup (email search + tier info + manual override)
- Promo codes CRUD
- VIP links CRUD
- Stats: total users, paying users, MRR estimate

---

## 16. Prompt 27 — Full Admin Operations Platform

**This is the largest single prompt.** Replaces basic admin with a full internal operations dashboard.

### 16.1 Database Additions
**Status:** ❌ None exist  
- `profiles`: add `is_admin`, `admin_role` ('super_admin'|'support'|'analyst'), `suspended_at`
- `feature_events` — user_id, trip_id, feature, action, created_at
- `function_logs` — function_name, duration_ms, success, error_message, called_at
- `photo_reports` — photo_id, reported_by, reason, status, reviewed_by, reviewed_at
- `subscription_events` — for churn tracking
- `admin_events` — for activity feed

### 16.2 Admin Auth
- `AdminRoute` component checking `profiles.is_admin`
- Role-based access: super_admin, support, analyst

### 16.3 Admin Layout
**File:** `src/pages/admin/AdminLayout.tsx`  
- Light theme (white/grey — NOT the dark luxury theme)
- Left sidebar: Dashboard, Users, Revenue, Trips, Features, Promos, Affiliates, Moderation, System
- Collapsible on mobile

### 16.4 Nine Admin Sections (All ❌ Do Not Exist)

| Section | File | Key Features |
|---------|------|-------------|
| **Dashboard** | `AdminDashboard.tsx` | 6 KPI cards, MRR line chart, signups bar chart, activity feed, alerts |
| **Users** | `AdminUsers.tsx` | Searchable table, filter pills, detail panel, tier override, suspend/delete, export CSV |
| **Revenue** | `AdminRevenue.tsx` | MRR total + growth, tier donut chart, projections, churn rate, promo impact |
| **Trips** | `AdminTrips.tsx` | Top destinations chart, trips/week chart, trip table, collaboration stats, feature adoption |
| **Features** | `AdminFeatures.tsx` | Usage bar chart, feature table, funnel analysis, `logFeatureEvent()` instrumented across app |
| **Promos** | `AdminPromos.tsx` | Expanded promo/VIP management, conversion tracking |
| **Affiliates** | `AdminAffiliates.tsx` | Click tracking, revenue estimates, top products, geographic breakdown |
| **Moderation** | `AdminModeration.tsx` | Photo reports queue, approve/delete/suspend actions, content stats |
| **System** | `AdminSystem.tsx` | Edge function health, error rates, env var checker, DB stats, recent errors feed |

### 16.5 Feature Event Instrumentation
Must add `logFeatureEvent()` calls throughout the existing app:
- Briefing viewed, Style searched, Outfit pinned, Shop clicked, Poll created, Playlist created, Track added, Expense added, Receipt scanned, Photo uploaded, Carousel exported, Document added, Booking assigned

### 16.6 Edge Function Logging
Add logging to ALL existing edge functions (wrap in try/catch, log to `function_logs`)

### 16.7 New Edge Function: `check-env-vars`
Returns boolean for each required env var

### 16.8 Routes
```
/admin → /admin/dashboard (redirect)
/admin/users
/admin/revenue
/admin/trips
/admin/features
/admin/promos
/admin/affiliates
/admin/moderation
/admin/system
```

### 16.9 Charts Library
Install `recharts` for all admin charts (line, bar, donut)

---

## 17. New API Keys & Services Required

| Service | Key Name | Purpose | Prompt | Free Tier? |
|---------|----------|---------|--------|------------|
| AviationStack | `AVIATIONSTACK_API_KEY` | Flight status tracking | 18 | Yes (1000 req/mo) |
| Google Distance Matrix | `GOOGLE_MAPS_API_KEY` | Leave time calculation | 18 | Pay per use (already have key — enable API) |
| Postmark | `POSTMARK_API_KEY` | Inbound email parsing | 22 | Yes |
| Stripe UK | `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, 4× price IDs | Billing | 17, 25 | No (transaction fees) |
| Serper | `SERPER_API_KEY` | Fashion search + trends | Already set up | ✅ Done |

---

## 18. New Database Tables & Columns Required

### New Tables (8)

| Table | Prompt | Purpose |
|-------|--------|---------|
| `trip_photos` | 19 | Shared photo album |
| `trip_expenses` | 20 | Expenses + bill splitting |
| `imported_bookings` | 22 | Email-imported bookings |
| `travel_documents` | 23 | Document vault |
| `promo_codes` | 26 | Promo code management |
| `promo_redemptions` | 26 | Promo usage tracking |
| `vip_links` | 26 | VIP invite links |
| `vip_redemptions` | 26 | VIP usage tracking |

### New Tables (Admin — Prompt 27) (4)

| Table | Purpose |
|-------|---------|
| `feature_events` | Feature usage analytics |
| `function_logs` | Edge function health monitoring |
| `photo_reports` | Photo moderation |
| `subscription_events` | Churn tracking |

### New Columns on Existing Tables

| Table | Column | Type | Prompt |
|-------|--------|------|--------|
| `trips` | `status` | TEXT (upcoming/active/completed) | 18 |
| `trip_events` | `gate` | TEXT | 18 |
| `trip_events` | `terminal` | TEXT | 18 |
| `trip_events` | `baggage_claim` | TEXT | 18 |
| `trip_events` | `flight_status` | TEXT | 18 |
| `trip_events` | `flight_status_updated_at` | TIMESTAMPTZ | 18 |
| `profiles` | `import_token` | TEXT UNIQUE | 22 |
| `profiles` | `promo_expires_at` | TIMESTAMPTZ | 26 |
| `profiles` | `promo_tier` | TEXT | 26 |
| `profiles` | `vip_link_token` | TEXT | 26 |
| `profiles` | `is_admin` | BOOLEAN | 27 |
| `profiles` | `admin_role` | TEXT | 27 |
| `profiles` | `suspended_at` | TIMESTAMPTZ | 27 |
| `profiles` | `stripe_customer_id` | TEXT | 17 |

---

## 19. New Edge Functions Required

| Function | Prompt | Purpose |
|----------|--------|---------|
| `get-flight-status` | 18 | AviationStack flight tracking |
| `calculate-leave-time` | 18 | Google Distance Matrix leave reminder |
| `scan-receipt` | 20 | GPT-4o-mini vision receipt parsing |
| `inbound-email` | 22 | Postmark webhook → booking import |
| `check-document-expiry` | 23 | Document vault expiry alerts |
| `redeem-promo` | 26 | Promo code redemption |
| `redeem-vip` | 26 | VIP link redemption |
| `check-env-vars` | 27 | Admin system health check |
| `create-portal-session` | 17 | Stripe customer portal (may overlap with existing `create-portal`) |

**Total new edge functions: 8–9**  
**Existing edge functions needing updates: ~28 (all need function_logs for Prompt 27)**

---

## 20. New Pages & Components Required

### New Pages (12)

| Page | Route | Prompt |
|------|-------|--------|
| `Offline.tsx` | `/offline` | 15 |
| `Pricing.tsx` | `/pricing` | 17 |
| `VipLanding.tsx` | `/vip/:token` | 26 |
| `admin/AdminLayout.tsx` | `/admin` | 27 |
| `admin/AdminDashboard.tsx` | `/admin/dashboard` | 27 |
| `admin/AdminUsers.tsx` | `/admin/users` | 27 |
| `admin/AdminRevenue.tsx` | `/admin/revenue` | 27 |
| `admin/AdminTrips.tsx` | `/admin/trips` | 27 |
| `admin/AdminFeatures.tsx` | `/admin/features` | 27 |
| `admin/AdminPromos.tsx` | `/admin/promos` | 27 |
| `admin/AdminAffiliates.tsx` | `/admin/affiliates` | 27 |
| `admin/AdminModeration.tsx` | `/admin/moderation` | 27 |
| `admin/AdminSystem.tsx` | `/admin/system` | 27 |

### New Components (6+)

| Component | Prompt | Purpose |
|-----------|--------|---------|
| `InstallPrompt.tsx` | 15 | iOS/Android PWA install prompt |
| `TodayTab.tsx` | 18 | Travel mode command centre |
| `PhotosTab.tsx` | 19 | Shared photo album |
| `ExpensesTab.tsx` | 20 | Expenses + bill splitter |
| `MemoriesTab.tsx` | 21 | Post-trip memories + carousel |
| `AdminRoute.tsx` | 27 | Admin access guard |

### New Config Files

| File | Prompt | Purpose |
|------|--------|---------|
| `src/config/retailers.ts` | 24 | Geo-aware retailer mapping |
| `src/lib/tier.ts` | 26 | Effective tier calculator |

---

## 21. Manual Actions

These **cannot be done in code** and must be completed separately:

### Business Entity (Critical Path)
- [ ] Register **Concierge Styled Ltd** at companieshouse.gov.uk (£50, ~24 hours)
- [ ] Open **Wise Business account** linked to UK Ltd (free, 2-3 days)
- [ ] Sign up **Stripe UK** with UK Ltd details (free, ~1 hour)
- [ ] Create Stripe products: Luxe + Atelier (monthly + annual) (~30 min)
- [ ] Get Stripe webhook secret and configure endpoint (~30 min)

### APIs & Integrations
- [ ] Register **Spotify Developer** app — get CLIENT_ID + CLIENT_SECRET
- [ ] Sign up **AviationStack** — get API key (free: 1000 req/month)
- [ ] Sign up **Postmark** — configure inbound email webhook
- [ ] Enable **Google Maps Distance Matrix API** in Cloud Console
- [ ] ⚠️ **Rotate Supabase access token** (was shared in a previous session)

### Affiliate Programmes
- [ ] Awin (covers Farfetch + many others)
- [ ] Rakuten (covers Net-a-Porter)
- [ ] Impact (US retailers: Nordstrom, Revolve, Anthropologie)
- [ ] Superbalist, Spree, Bash — direct partner applications
- [ ] By Rotation — direct partnership discussion

### Legal
- [ ] Written agreement with partner re: Concierge Styled Ltd separation
- [ ] UK startup lawyer consultation (budget £500-1500)

---

## 22. Recommended Build Order

Run prompts **sequentially** — each builds on the previous.

| Order | Prompt | What | Blockers |
|-------|--------|------|----------|
| **1** | Fix | Onboarding crash, OAuth redirect, rebrand | None — do this first |
| **2** | 15 | PWA + mobile polish | Fix prompt complete |
| **3** | 16 | Brand polish + consistency | Prompt 15 complete |
| **4** | 17 | Stripe UK integration | UK Ltd + Stripe account ready |
| **5** | 18 | Travel Mode + Today Tab | AviationStack key + Distance Matrix enabled |
| **6** | 19 | Shared Photo Album | Prompt 18 complete |
| **7** | 20 | Expenses + Bill Splitter | Prompt 19 complete |
| **8** | 21 | Memories + Carousel | Prompt 20 complete |
| **9** | 22 | Booking Email Import | Postmark account ready |
| **10** | 23 | Document Vault | Prompt 22 complete |
| **11** | 24 | Geo-Aware Retailers | Prompt 23 complete |
| **12** | 25 | Stripe UK Final (annual plans) | All above complete + Stripe products created |
| **13** | 26 | Promo Codes + VIP + Basic Admin | Prompt 25 complete |
| **14** | 27 | Full Admin Platform | Prompt 26 complete |

### After Each Prompt
1. Run `npx tsc --noEmit` — must pass with zero errors
2. Deploy any new edge functions immediately
3. Test the feature locally before moving on

### Parallel Work Possible
- Prompts 26 + 27 (admin layer) can be developed in parallel with other work since they don't affect core functionality
- Business entity registration can happen in parallel with all development

---

> **Total remaining work:** ~13 prompts, ~8 new edge functions, ~12 new tables, ~14 new columns, ~12 new pages, ~6 new components, 5 API integrations, and comprehensive polish across all existing code.
