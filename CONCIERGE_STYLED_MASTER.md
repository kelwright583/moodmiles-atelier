# Concierge Styled — Master Roadmap

> **Tagline:** Arrive Impeccably Everywhere
> **Positioning:** Curated trip + fashion intelligence for the elevated traveller
> **Aspiration:** The intersection of Soho House membership, Net-a-Porter curation, and personal concierge — in an app

---

## Table of Contents

1. [Product Vision & Positioning](#1-product-vision--positioning)
2. [Current State Audit](#2-current-state-audit)
3. [Architecture & Tech Stack](#3-architecture--tech-stack)
4. [API Cost Analysis](#4-api-cost-analysis)
5. [Monetisation Strategy](#5-monetisation-strategy)
6. [B2B: Events & Advertising Platform](#6-b2b-events--advertising-platform)
7. [Production Readiness: Critical Gaps](#7-production-readiness-critical-gaps)
8. [Brand & Design Elevation](#8-brand--design-elevation)
9. [Landing Page Redesign](#9-landing-page-redesign)
10. [Feature Roadmap](#10-feature-roadmap)
11. [Native App Strategy (MVP2)](#11-native-app-strategy-mvp2)
12. [Infrastructure & DevOps](#12-infrastructure--devops)
13. [Security Hardening](#13-security-hardening)
14. [Analytics & Growth](#14-analytics--growth)
15. [Legal & Compliance](#15-legal--compliance)
16. [Phase Execution Plan](#16-phase-execution-plan)
17. [Database Schema Reference](#17-database-schema-reference)
18. [Edge Functions Reference](#18-edge-functions-reference)
19. [File Structure](#19-file-structure)

---

## 1. Product Vision & Positioning

### 1.1 What Concierge Styled Is

Concierge Styled is a luxury travel styling platform that combines destination intelligence with AI-powered fashion curation. It helps elevated travellers plan not just where they're going, but how they'll arrive — with climate-aware wardrobes, curated activity suggestions, smart packing, and editorial-quality outfit inspiration.

### 1.2 Who It's For

- Affluent, style-conscious travellers (25-55)
- Fashion-forward professionals who travel frequently
- People who currently use a mix of Pinterest boards, weather apps, and Instagram saves to plan trip wardrobes
- The type of person who packs intentionally, not frantically

### 1.3 Brand Pillars

| Pillar | Meaning |
|--------|---------|
| **Intelligent** | AI that understands climate, occasion, and personal style |
| **Curated** | Not everything — the right things. Quality over quantity |
| **Private** | Your travel plans and style are yours. No social feed, no followers |
| **Elevated** | Every interaction should feel like a luxury experience |

### 1.4 Competitive Positioning

| Competitor | What They Do | Where Concierge Styled Wins |
|------------|-------------|---------------------|
| **PackPoint** | Basic packing lists | No fashion intelligence, no AI, no style |
| **TripIt** | Itinerary management | Functional, not aspirational. No wardrobe |
| **Pinterest** | Mood boards | No trip context, no weather awareness, no packing logic |
| **Stylebook** | Wardrobe management | No travel integration, no AI generation |
| **Trunk Club / Stitch Fix** | Styled clothing | Not travel-specific, subscription boxes not trip-aware |

Concierge Styled is the only product that sits at the intersection of **travel planning** and **fashion intelligence**.

---

## 2. Current State Audit

### 2.1 What's Built (Functional MVP)

| Area | Status | Detail |
|------|--------|--------|
| **Landing page** | Built | Hero, features, destinations, CTA — needs luxury redesign |
| **Authentication** | Built | Email/password sign up + sign in, session persistence |
| **Dashboard** | Built | Trip list, trending feed with fallback data |
| **Trip creation** | Built | Google Places autocomplete, dates, trip type, accommodation |
| **Trip detail** | Built | 6 tabs: Overview, Things to Do, Inspiration, Capsule, Packing, Board |
| **Weather** | Built | Open-Meteo integration, 16-day forecast, stored per trip |
| **AI outfits** | Built | GPT-4o-mini for descriptions, DALL-E 3 for images |
| **Activities** | Built | Firecrawl + GPT + Google Places enrichment |
| **Packing** | Built | AI-generated lists with weather/event context |
| **Fashion search** | Built | Firecrawl web search + AI extraction + image generation |
| **Mood board** | Built | Image upload, notes, pin from Inspiration |
| **Settings** | Built | Avatar, name, style profile tags, luggage size |
| **Trending** | Built | Firecrawl + AI curated trends with graceful fallback |
| **RLS** | Built | Row Level Security on all tables via `is_trip_owner()` |

### 2.2 What's NOT Built

| Area | Status | Priority |
|------|--------|----------|
| Payment / billing (Stripe) | Missing | **CRITICAL** |
| Subscription feature gating | Missing | **CRITICAL** |
| Rate limiting / usage metering | Missing | **CRITICAL** |
| CORS domain restriction | Missing | **CRITICAL** |
| Error monitoring (Sentry) | Missing | **CRITICAL** |
| Analytics (PostHog/Mixpanel) | Missing | **HIGH** |
| Password reset flow | Missing | **HIGH** |
| Google OAuth | Missing | **HIGH** |
| Onboarding flow | Missing | **HIGH** |
| Pricing / membership page | Missing | **HIGH** |
| Terms of Service | Missing | **HIGH** |
| Privacy Policy | Missing | **HIGH** |
| Email templates (branded) | Missing | **MEDIUM** |
| CI/CD pipeline | Missing | **MEDIUM** |
| Test coverage | Missing | **MEDIUM** |
| SEO / meta tags | Missing | **MEDIUM** |
| Image optimisation (CDN) | Missing | **MEDIUM** |
| Code splitting | Missing | **MEDIUM** |
| Trip sharing / collaboration | Missing | **LOW (MVP2)** |
| PDF export / lookbooks | Missing | **LOW (MVP2)** |
| Calendar integration | Missing | **LOW (MVP2)** |
| Push notifications | Missing | **LOW (MVP2)** |
| Native mobile app | Missing | **MVP2** |

### 2.3 Known Bugs & Issues

| Issue | Location | Status |
|-------|----------|--------|
| Delete trip "Keep inspiration/board" doesn't work due to CASCADE | `TripDeleteDialog.tsx` | Open |
| CapsuleTab is in tabs but wardrobe_items not properly integrated | `CapsuleTab.tsx` | Open |
| PlacesAutocomplete origin doesn't set lat/lng | `CreateTrip.tsx` | Open |
| `noImplicitAny: false`, `strict: false` in tsconfig | `tsconfig.app.json` | Open |
| 19 npm audit vulnerabilities (5 moderate, 14 high) | `package.json` | Open |
| Large JS bundle ~770 KB (needs code splitting) | Build output | Open |
| Trending feed images sometimes null | `fetch-trends` edge function | Open |

---

## 3. Architecture & Tech Stack

### 3.1 Current Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Frontend** | React 18.3 + TypeScript 5.8 | SPA, client-rendered |
| **Build** | Vite 5.4 + SWC | Fast dev, HMR |
| **Styling** | Tailwind CSS 3.4 + shadcn/ui | 71 UI components |
| **Animation** | Framer Motion 12.34 | Page transitions, scroll reveals |
| **Routing** | React Router 6.30 | Protected routes |
| **Data** | TanStack Query 5.83 | Server state, caching |
| **Auth** | Supabase Auth | Email/password, session management |
| **Database** | Supabase PostgreSQL | 10 tables, RLS, triggers |
| **Storage** | Supabase Storage | Avatars, board images, outfit images |
| **Edge Functions** | Supabase (Deno) | 8 serverless functions |
| **AI** | OpenAI GPT-4o-mini + DALL-E 3 | Outfits, activities, packing, fashion |
| **APIs** | Google Places, Firecrawl, Open-Meteo, Unsplash | Various integrations |

### 3.2 Database Tables

| Table | Key Fields | Purpose |
|-------|-----------|---------|
| `profiles` | user_id, name, avatar_url, style_profile[], luggage_size, subscription_tier | User profiles |
| `trips` | destination, country, dates, trip_type, accommodation, lat/lng, image_url | Trip records |
| `weather_data` | trip_id, date, temps, rain, wind, weather_code | Per-day weather |
| `trip_events` | trip_id, event_name, event_type, event_date, is_pinned | User events |
| `wardrobe_items` | trip_id, category, description, color, tags[], image_url | Capsule wardrobe |
| `packing_items` | trip_id, name, category, quantity, is_packed | Packing checklist |
| `board_items` | trip_id, image_url, description, notes | Mood board |
| `outfit_suggestions` | trip_id, title, occasion, description, items (JSONB), image_url, pinned | AI outfits |
| `activity_suggestions` | trip_id, name, description, category, rating, booking_url, **is_promoted**, **promoted_by** | Activities + ads |

### 3.3 Storage Buckets

| Bucket | Access | Purpose |
|--------|--------|---------|
| `board-images` | Public | User-uploaded mood board images |
| `avatars` | Public | Profile photos |
| `outfit-images` | Public | AI-generated outfit images (service role) |

---

## 4. API Cost Analysis

### 4.1 Cost Per Trip (Estimated)

| Edge Function | External APIs | Cost Per Call | Frequency |
|---------------|--------------|---------------|-----------|
| `generate-outfits` | GPT-4o-mini + DALL-E 3 (x3 batch) | $0.60 – $1.80 | Per trip + "see more" |
| `search-fashion` | Firecrawl + GPT-4o-mini + DALL-E 3 | $0.40 – $0.50 | Per trip |
| `suggest-activities` | Firecrawl + GPT-4o-mini + Google Places | $0.20 – $0.30 | Per trip |
| `suggest-packing` | GPT-4o-mini | $0.01 – $0.02 | Per trip |
| `fetch-destination-image` | Google Places / Unsplash / Picsum | $0.02 – $0.03 | Per trip |
| `google-places` | Google Places Autocomplete + Details | $0.03 – $0.17 | Per search query |
| `fetch-weather` | Open-Meteo | **Free** | Per trip |
| `fetch-trends` | Firecrawl + GPT-4o-mini + Google/Unsplash | $0.01 – $0.03 | Dashboard load (cached 1hr) |

### 4.2 Cost Scenarios

| Scenario | Trips/Month | API Cost/Month | Notes |
|----------|------------|----------------|-------|
| **Single active user** | 3 trips | $3.90 – $8.55 | Including regenerations |
| **100 free users** | 100 trips | $130 – $285 | Unsustainable without gating |
| **100 paid users (gated)** | 300 trips | $390 – $855 | Offset by $14.99/mo revenue |
| **1,000 paid users** | 3,000 trips | $3,900 – $8,550 | Revenue: $14,990/mo — profitable |

### 4.3 Cost Reduction Strategies

| Strategy | Savings | Effort |
|----------|---------|--------|
| **Cache outfit images** (don't regenerate if already exists) | 40-60% | Low |
| **Use GPT-4o-mini image generation** instead of DALL-E 3 | 30-50% | Medium |
| **Reduce DALL-E batch size** (3 images instead of 15) for free tier | 80% for free | Low |
| **Text-only outfits for free tier** (no image generation) | 90% for free | Low |
| **Cache trending data** server-side (not just client staleTime) | Marginal | Low |
| **Use Unsplash/Pexels for outfit inspiration** instead of DALL-E | 95% | Medium |

---

## 5. Monetisation Strategy

### 5.1 Subscription Tiers

#### Free (Acquisition)

| Feature | Limit |
|---------|-------|
| Active trips | 1 |
| Weather forecasts | Unlimited |
| Packing lists (AI) | Text-only, 1 generation per trip |
| Outfit suggestions | 3 text-only descriptions (no images) |
| Activity suggestions | 5 per trip |
| Fashion search | Not available |
| Mood board | 5 images max |
| Branded | "Styled by Concierge Styled" watermark on shares |

**Purpose:** Let users experience the core value. Weather + packing is cheap to serve. Enough to hook them; not enough to satisfy.

#### Luxe — $14.99/month or $119/year

| Feature | Limit |
|---------|-------|
| Active trips | Unlimited |
| Weather forecasts | Unlimited |
| Packing lists (AI) | Unlimited regenerations |
| Outfit suggestions | Full AI with DALL-E images |
| Activity suggestions | Unlimited with Google Places enrichment |
| Fashion search | Full Firecrawl + AI extraction |
| Mood board | Unlimited |
| Extras | Ad-free, priority generation queue |

**Purpose:** Core revenue driver. Covers API costs with margin.

#### Atelier — $29.99/month or $249/year

| Feature | Limit |
|---------|-------|
| Everything in Luxe | Yes |
| Trip collaboration | Share with travel companions |
| Downloadable lookbooks | PDF export of trip outfit plans |
| "Styled by Concierge Styled" cards | Premium social sharing assets |
| Exclusive events | Curated event invitations in-app |
| Early access | Beta features first |
| Concierge touches | Handpicked recommendations queue |

**Purpose:** Prestige tier. High-margin, low-volume. Signals exclusivity.

### 5.2 Revenue Projections

| Metric | Month 3 | Month 6 | Month 12 |
|--------|---------|---------|----------|
| Free users | 500 | 2,000 | 8,000 |
| Luxe subscribers | 25 | 150 | 600 |
| Atelier subscribers | 5 | 25 | 80 |
| MRR (subscriptions) | $524 | $3,000 | $11,400 |
| API costs | ~$200 | ~$1,200 | ~$4,500 |
| B2B revenue | $0 | $500 | $3,000 |
| **Net MRR** | **~$324** | **~$2,300** | **~$9,900** |

### 5.3 Pricing Page Requirements

- Clean, luxe design (not a typical SaaS pricing grid)
- Emphasise the Luxe tier as the default choice
- Annual pricing prominently displayed (higher LTV)
- "Currently in beta — founding member pricing" for early adopters
- Feature comparison table
- FAQ section addressing value proposition

---

## 6. B2B: Events & Advertising Platform

### 6.1 The Vision

Events, luxury brands, restaurants, and tourism boards come to Concierge Styled to reach style-conscious travellers who are actively planning trips to their destination. Hyper-targeted by **city + dates + trip type**.

This is not generic display ads. This is: "A user is planning a resort trip to Amalfi Coast in July — show them your exclusive yacht party."

### 6.2 Revenue Streams

| Stream | Model | Example |
|--------|-------|---------|
| **Promoted Experiences** | CPM / CPC / flat fee | Restaurant, event, or experience appears in "Things to Do" tab |
| **Sponsored Destinations** | Monthly placement fee | Tourism board featured in Trending and destination cards |
| **Fashion Affiliate** | Commission (8-15%) | Outfit suggestions link to Net-a-Porter, Farfetch, SSENSE products |
| **Event Self-Serve Ads** | Self-serve campaign budget | Event organiser creates campaign targeting destination + dates |

### 6.3 Database Support (Already Exists)

The `activity_suggestions` table already has:
- `is_promoted` (boolean) — flag for paid placements
- `promoted_by` (text) — advertiser identifier

### 6.4 What Needs to Be Built

| Component | Description | Priority |
|-----------|-------------|----------|
| **Advertiser registration** | Separate auth flow for event managers/brands | Phase 3 |
| **Campaign creation UI** | Target destination, dates, trip type, budget, creative | Phase 3 |
| **Ad serving logic** | Insert promoted activities into suggestions, marked as "Featured" | Phase 3 |
| **Impression/click tracking** | Log views and interactions for advertiser analytics | Phase 3 |
| **Advertiser dashboard** | Campaign performance: impressions, clicks, saves, cost | Phase 3 |
| **Billing (Stripe Connect)** | Charge advertisers, handle payouts | Phase 3 |
| **Content moderation** | Ensure promoted content matches luxury positioning | Phase 3 |
| **Affiliate link integration** | Outfit suggestion items link to real products with tracking | Phase 3 |

### 6.5 Advertiser Experience (Future)

1. Advertiser signs up at `business.concierge-styled.com`
2. Creates a campaign: "Summer Sunset Party — Amalfi Coast — July 2026"
3. Sets targeting: destination = Amalfi, dates = June-August, trip types = Resort/Romantic
4. Uploads creative: image, description, booking link
5. Sets budget: $500/month or $2/click
6. Campaign goes live — appears in users' "Things to Do" with "Featured" badge
7. Advertiser sees dashboard: 12,000 impressions, 340 saves, 89 clicks, $178 spent

---

## 7. Production Readiness: Critical Gaps

### 7.1 Security

| Gap | Risk | Fix |
|-----|------|-----|
| CORS allows `*` on all edge functions | Any site can call your APIs | Restrict to `concierge-styled.com` + localhost in dev |
| No rate limiting | Cost explosion, abuse | Add per-user rate limits via Supabase or middleware |
| `fetch-trends` and `google-places` have no auth check | Public access to paid APIs | Add Authorization header validation |
| No input validation/sanitisation on some endpoints | Injection risk | Validate all inputs with Zod |
| Service role key used everywhere | Appropriate but risky if leaked | Ensure never exposed client-side |
| `strict: false` in tsconfig | Type safety holes | Enable strict mode, fix errors |

### 7.2 Reliability

| Gap | Risk | Fix |
|-----|------|-----|
| No error monitoring | Silent failures in production | Add Sentry (free tier sufficient initially) |
| No health checks | Won't know if edge functions are down | Add health endpoint + uptime monitoring |
| No retry logic for external APIs | Single failures break features | Add retry with exponential backoff |
| No circuit breaker pattern | Cascading failures if OpenAI is down | Add fallback responses for degraded mode |
| DALL-E 3 failures silently skip images | Outfits appear without images | Add retry + placeholder image fallback |

### 7.3 Performance

| Gap | Impact | Fix |
|-----|--------|-----|
| No code splitting | 770 KB initial bundle | Lazy load routes with `React.lazy` |
| No image CDN/optimisation | Slow loads on mobile | Use Supabase image transforms or Cloudflare |
| No server-side caching | Expensive API calls repeat | Cache trends, activity enrichments |
| No prefetching | Tab switches feel slow | Prefetch trip data on dashboard hover |
| Font loading not optimised | FOUT/FOIT on first load | Add `font-display: swap`, preload critical fonts |

### 7.4 Data Integrity

| Gap | Impact | Fix |
|-----|--------|-----|
| CASCADE deletes remove outfit/board data even when user says "keep" | Data loss | Remove CASCADE, handle deletes manually |
| No soft deletes | Can't recover deleted trips | Add `deleted_at` column, filter in queries |
| No data export | GDPR compliance risk | Add user data export endpoint |
| No backup strategy documented | Data loss risk | Document Supabase backup config |

---

## 8. Brand & Design Elevation

### 8.1 The Problem

The current app sits between "nice travel tool" and "luxury lifestyle platform." The code, copy, and structure are right — but the visual execution doesn't match the brand promise of "curated trip and fashion for elitists."

### 8.2 Colour Temperature

**Current:** The dark background (`220 15% 8%`) has a steel-blue undertone. This reads as "tech product" not "luxury."

**Target:** Warm the blacks. Luxury dark themes lean into warm blacks with slight brown/amber undertones.

| Token | Current HSL | Target HSL | Change |
|-------|------------|------------|--------|
| `--background` | `220 15% 8%` | `30 8% 7%` | Warm black (brown-tinted) |
| `--card` | `220 14% 11%` | `30 7% 10%` | Warm card |
| `--secondary` | `220 12% 14%` | `30 6% 13%` | Warm secondary |
| `--muted` | `220 10% 18%` | `30 5% 16%` | Warm muted |
| `--border` | `220 10% 18%` | `30 5% 15%` | Warm border |
| `--charcoal-deep` | `220 15% 5%` | `30 8% 4%` | Warm deep |
| `--charcoal-light` | `220 12% 16%` | `30 6% 14%` | Warm light |

### 8.3 Typography

**Current:** Playfair Display (heading) + Inter (body) — Good foundation.

**Enhancements:**
- Increase heading letter-spacing slightly for more editorial feel
- Use italic Playfair more deliberately (for emphasis words, not entire headings)
- Add a display weight variation for hero text
- Consider adding a monospace accent font for data (weather, dates)

### 8.4 Interaction Design

| Current | Target |
|---------|--------|
| Standard page transitions | Cinematic fade + slide transitions |
| Static destination images | Subtle parallax on scroll |
| Click interactions | Hover previews, magnetic buttons, micro-interactions |
| Standard loading states | Champagne shimmer skeleton screens |
| Toast notifications | Elegant slide-in notifications with brand styling |

### 8.5 Personalisation

| Current | Target |
|---------|--------|
| "Welcome back" | "Welcome back, [Name]" with avatar |
| Generic empty states | Personalised prompts based on style profile |
| Same experience for all | Tier-aware UI (subtle Luxe/Atelier badges) |

### 8.6 Photography Direction

All imagery in the app should follow this direction:
- **Warm, golden-hour tones** — never cold/clinical
- **People present** — fashion on bodies, not flat-lays
- **Editorial quality** — magazine-worthy, not stock
- **Aspirational but attainable** — not unrelatable luxury, but elevated everyday
- **Diverse representation** — global travellers, not just one demographic

---

## 9. Landing Page Redesign

### 9.1 Current Issues

| Problem | Detail |
|---------|--------|
| Hero image is generic stock | Bird's-eye road photo — "travel blog", not luxury |
| Gradient overlay too heavy | 70% opaque dark kills warmth, makes hero a muddy rectangle |
| No movement | Static image feels flat; luxury brands use video/parallax |
| Destination images are tourism stock | Tourist board photos, not editorial fashion-travel |
| No social proof | No press logos, testimonials, member count |
| No exclusivity | "Begin Your Journey" is generic; no velvet rope |
| Footer is bare | No links, brand story, or social presence |

### 9.2 Redesigned Structure

```
┌─────────────────────────────────────────────────┐
│ NAVBAR (transparent → solid on scroll)          │
│ Logo left, "Request Access" button right        │
├─────────────────────────────────────────────────┤
│                                                 │
│  HERO (full-bleed, 100vh)                       │
│  - Looping video or editorial photography       │
│  - Minimal text: tagline + one CTA              │
│  - Subtle warm vignette (not heavy overlay)     │
│  - Scroll indicator (champagne line)            │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  SOCIAL PROOF BAR                               │
│  - "As featured in" + press logos               │
│  - Or: "Join 2,000+ members styling journeys"   │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  THE EXPERIENCE (features, editorial layout)    │
│  - Full-width image left, text right            │
│  - Alternating sides for each feature           │
│  - Parallax scroll on images                    │
│  - Three features: Intelligence, Capsule, Pack  │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  DESTINATIONS (horizontal scroll carousel)      │
│  - Oversized 3:4 cards with parallax            │
│  - Editorial photography (fashion + travel)     │
│  - Hover: reveal trend text with animation      │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  HOW IT WORKS (3-step visual)                   │
│  - 1. Tell us where → 2. We style it            │
│  - 3. Arrive impeccably                          │
│  - App screenshots / device mockups             │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  TESTIMONIAL                                    │
│  - Single large quote, editorial style          │
│  - Photo of the person, name, credential        │
│  - "I never travel without it." — Name, Title   │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  MEMBERSHIP / PRICING                            │
│  - Two tiers: Luxe and Atelier                  │
│  - Elegant cards, not a SaaS grid               │
│  - "Founding member" pricing badge              │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  FINAL CTA                                      │
│  - "I travel differently."                      │
│  - Single CTA button                            │
│  - Background: subtle champagne gradient        │
│                                                 │
├─────────────────────────────────────────────────┤
│  FOOTER                                          │
│  - Brand story (one sentence)                   │
│  - Links: About, Pricing, Privacy, Terms        │
│  - Social: Instagram, Pinterest                 │
│  - Newsletter signup                            │
│  - © 2026 Concierge Styled Atelier                    │
└─────────────────────────────────────────────────┘
```

### 9.3 Hero Imagery Direction

**Option A: Video Loop**
- 8-12 second loop: a woman walking through an Italian coastal town in golden light, carrying a structured bag, impeccably dressed
- Warm colour grade, slow motion, cinematic aspect
- Sources: Licensed stock video (Artgrid, Storyblocks Premium) or commissioned

**Option B: Editorial Photography**
- Full-bleed image of a styled traveller in an aspirational setting
- Think: a woman in a linen suit on a sunlit terrace overlooking the Mediterranean
- Subtle Ken Burns effect (slow zoom) for motion
- Sources: Licensed from Getty Premium, Stocksy, or commissioned

**What to AVOID:**
- Aerial/drone shots (generic travel blog)
- Empty landscapes without people
- Overly saturated colours
- Generic "person with suitcase at airport"

### 9.4 Copy Refinements

| Section | Current | Refined |
|---------|---------|---------|
| Hero tagline | "Travel, Styled." | "Travel, Styled." (keep — it's good) |
| Hero heading | "Arrive Impeccably Everywhere" | "Arrive Impeccably Everywhere" (keep) |
| Hero body | "Intelligent travel wardrobe planning..." | "Your AI stylist knows the weather, the dress code, and your taste — before you've started packing." |
| CTA button | "Begin Your Journey" | "Request Early Access" or "Join the Waitlist" (exclusivity) |
| Features header | "The Intelligence" | "The Intelligence" (keep) |
| Destinations header | "Featured Destinations" | "Trending Amongst Members" |
| CTA section | "Join Concierge Styled. Intelligent, beautiful, private." | "Travel differently. Join the membership." |

---

## 10. Feature Roadmap

### 10.1 MVP1 Completion (Current Web App)

#### Must Ship

- [ ] Stripe subscription integration (Luxe + Atelier tiers)
- [ ] Feature gating by subscription tier
- [ ] Usage metering (API calls per user per month)
- [ ] Rate limiting on all edge functions
- [ ] CORS restriction to production domain
- [ ] Password reset flow
- [ ] Google OAuth sign-in
- [ ] Onboarding flow post-signup (name, style profile, luggage)
- [ ] Landing page luxury redesign
- [ ] Pricing / membership page
- [ ] Warm colour temperature across the app
- [ ] Personalised dashboard ("Welcome back, [Name]")
- [ ] Terms of Service page
- [ ] Privacy Policy page
- [ ] Cookie consent banner
- [ ] Error monitoring (Sentry)
- [ ] Analytics (PostHog or Mixpanel)
- [ ] Branded email templates (verification, welcome, password reset)
- [ ] Fix: Delete trip cascade vs "keep" logic
- [ ] Fix: CapsuleTab integration or removal
- [ ] Fix: Origin city lat/lng in CreateTrip
- [ ] npm audit fix
- [ ] Enable TypeScript strict mode

#### Should Ship

- [ ] Code splitting (lazy load routes)
- [ ] Image CDN/optimisation
- [ ] Caching expensive API calls (outfit images persist)
- [ ] Skeleton loading states (champagne shimmer)
- [ ] Font preloading
- [ ] SEO meta tags (at minimum for landing page)
- [ ] OpenGraph tags for social sharing
- [ ] 404 page with brand styling
- [ ] Empty state improvements (personalised prompts)
- [ ] Tier badges in UI (subtle Luxe/Atelier indicators)
- [ ] About page
- [ ] Contact/support page

### 10.2 MVP1.5 (Post-Launch Enhancements)

- [ ] Affiliate link integration (outfit → shop)
- [ ] Trip sharing (read-only link)
- [ ] PDF lookbook export
- [ ] Push notifications (web)
- [ ] Calendar integration (Google Calendar .ics export)
- [ ] Dark/light mode toggle (currently dark-only)
- [ ] Multi-language support (French, Italian to start)
- [ ] Improved outfit "shop this look" with real product links
- [ ] User-to-user referral programme
- [ ] "Founding Member" badge for early adopters

### 10.3 MVP2 (Native App + B2B)

- [ ] Native mobile app (see Section 11)
- [ ] Advertiser portal (see Section 6)
- [ ] Promoted experiences in activity feed
- [ ] Event self-serve ad creation
- [ ] Advertiser analytics dashboard
- [ ] Stripe Connect for advertiser billing
- [ ] Trip collaboration (multiple users on one trip)
- [ ] Real-time sync between collaborators
- [ ] Offline mode (download trip for flight)
- [ ] Apple Watch / wearable companion (weather + today's outfit)

---

## 11. Native App Strategy (MVP2)

### 11.1 Do We Need a Native App?

**Short answer:** Not for launch. Yes for scale.

| Factor | Web App | Native App |
|--------|---------|------------|
| **Time to market** | Ready now | 3-4 months additional |
| **Distribution** | URL sharing, SEO | App Store, Google Play |
| **Push notifications** | Limited (web push) | Full native support |
| **Offline access** | Limited (service workers) | Full offline with sync |
| **Camera/photos** | Works but limited | Full native integration |
| **Performance** | Good enough | Smoother animations |
| **Perceived luxury** | Depends on execution | Apps feel more "premium" |
| **Discovery** | SEO + social | App Store search + features |

### 11.2 Recommended Approach

**Phase 1 (Now):** Ship the web app. Make it excellent on mobile browsers. Add "Add to Home Screen" PWA support.

**Phase 2 (3-6 months post-launch):** Build native app using **React Native** (or Expo) to maximise code sharing with the existing React codebase.

**Why React Native over Flutter/Swift:**
- Shared business logic with web app
- Team likely already knows React/TypeScript
- Supabase has excellent React Native support
- Can share component logic (not UI) between web and native
- Expo simplifies build/deploy significantly

### 11.3 Native-Specific Features

| Feature | Why Native |
|---------|-----------|
| **Push notifications** | "Your Amalfi trip is in 3 days — outfit plan ready" |
| **Offline trip access** | Download full trip plan for the flight |
| **Camera wardrobe scan** | Photograph clothes → AI adds to capsule |
| **Widget** | Today's outfit + weather on home screen |
| **Apple Watch** | Glanceable weather + outfit suggestion |
| **Haptic feedback** | Subtle vibrations on interactions (luxury feel) |
| **Face ID / biometric** | Premium account security |

### 11.4 Native App Timeline

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| Setup + architecture | 2 weeks | Expo project, Supabase integration, auth |
| Core screens | 3 weeks | Dashboard, trip detail, create trip |
| AI features | 2 weeks | Outfits, activities, packing (using same edge functions) |
| Polish + native features | 2 weeks | Push, offline, animations |
| App Store submission | 1 week | Screenshots, metadata, review |
| **Total** | **~10 weeks** | |

---

## 12. Infrastructure & DevOps

### 12.1 Current State

- No CI/CD pipeline
- No automated testing
- No environment separation (dev/staging/prod)
- Manual deployment via Lovable or Supabase CLI
- No monitoring or alerting

### 12.2 Target State

| Component | Tool | Priority |
|-----------|------|----------|
| **CI/CD** | GitHub Actions | High |
| **Hosting** | Vercel or Netlify (or remain on Lovable) | Medium |
| **Error monitoring** | Sentry (free tier) | High |
| **Analytics** | PostHog (free tier) or Mixpanel | High |
| **Uptime monitoring** | Better Uptime or UptimeRobot | Medium |
| **Logging** | Supabase Logs + Sentry breadcrumbs | Medium |
| **Environments** | dev / staging / production Supabase projects | Medium |
| **Secrets management** | Supabase Edge Function Secrets (current) | OK |
| **CDN** | Cloudflare (in front of Vercel/Netlify) | Low |
| **Database backups** | Supabase PITR (Point in Time Recovery) | High |

### 12.3 CI/CD Pipeline (GitHub Actions)

```
on push to main:
  1. Install dependencies
  2. Run linter (eslint)
  3. Run tests (vitest)
  4. Build (vite build)
  5. Deploy to production (Vercel/Netlify)

on push to develop:
  1-4 same as above
  5. Deploy to staging

on pull request:
  1-4 same as above
  5. Preview deployment
```

---

## 13. Security Hardening

### 13.1 Immediate Fixes

| Fix | Effort | Impact |
|-----|--------|--------|
| Restrict CORS to production domain in all edge functions | Low | High |
| Add `Authorization` header validation to `fetch-trends` and `google-places` | Low | High |
| Enable `strict: true` in tsconfig | Medium | Medium |
| Add Zod validation for all edge function inputs | Medium | High |
| Run `npm audit fix` | Low | Medium |
| Add Content Security Policy headers | Low | Medium |
| Add rate limiting (per user, per function) | Medium | High |

### 13.2 Rate Limiting Strategy

| Function | Free Tier | Luxe | Atelier |
|----------|-----------|------|---------|
| `generate-outfits` | 1/trip, 1 trip | 5/trip, unlimited trips | 10/trip, unlimited trips |
| `search-fashion` | Not available | 3/trip | 10/trip |
| `suggest-activities` | 1/trip | 5/trip | 10/trip |
| `suggest-packing` | 1/trip | 5/trip | Unlimited |
| `google-places` | 10/day | 100/day | 500/day |
| `fetch-weather` | 3/day | 20/day | Unlimited |

### 13.3 Future Security

- [ ] Web Application Firewall (Cloudflare)
- [ ] DDoS protection
- [ ] API key rotation schedule
- [ ] Security audit (manual or automated)
- [ ] GDPR data export and deletion endpoints
- [ ] Session management improvements (device list, remote logout)

---

## 14. Analytics & Growth

### 14.1 Key Metrics to Track

| Category | Metric | Why |
|----------|--------|-----|
| **Acquisition** | Landing page → Auth conversion | Is the landing page working? |
| **Activation** | Signup → First trip created | Is onboarding effective? |
| **Engagement** | Tabs visited per trip | Which features are valued? |
| **Retention** | Return visits within 7/30 days | Are users coming back? |
| **Revenue** | Free → Paid conversion rate | Is the paywall positioned right? |
| **Revenue** | Monthly churn rate | Are paid users staying? |
| **Cost** | API cost per user per month | Is the unit economics working? |
| **Feature** | Most regenerated feature | What do users want more of? |
| **Feature** | "See more like this" clicks | What style content resonates? |

### 14.2 Analytics Implementation

| Tool | Purpose | Cost |
|------|---------|------|
| **PostHog** | Product analytics, funnels, session replay | Free up to 1M events/month |
| **Sentry** | Error tracking, performance monitoring | Free up to 5K events/month |
| **Google Search Console** | SEO monitoring | Free |
| **Stripe Dashboard** | Revenue metrics | Built-in |

### 14.3 Growth Channels

| Channel | Strategy | Priority |
|---------|----------|----------|
| **Instagram** | Editorial travel/fashion content, "Styled by Concierge Styled" tags | High |
| **Pinterest** | Outfit boards, destination styling guides | High |
| **SEO** | "What to wear in [city] in [month]" — long-tail content | Medium |
| **Referral** | Invite a friend → both get 1 month free Luxe | High |
| **Partnerships** | Travel influencers, fashion bloggers | Medium |
| **PR** | Condé Nast Traveller, Vogue, ELLE | Medium |
| **Content** | Blog: "The Concierge Styled Edit" — city style guides | Medium |

---

## 15. Legal & Compliance

### 15.1 Required Before Launch

| Document | Status | Priority |
|----------|--------|----------|
| Terms of Service | Not created | **CRITICAL** |
| Privacy Policy | Not created | **CRITICAL** |
| Cookie Policy | Not created | **HIGH** |
| Acceptable Use Policy | Not created | **MEDIUM** |
| GDPR compliance (EU users) | Not implemented | **HIGH** |
| CCPA compliance (California users) | Not implemented | **MEDIUM** |
| Refund/cancellation policy | Not created | **HIGH** |

### 15.2 GDPR Requirements

- [ ] Cookie consent banner with granular controls
- [ ] Data export on user request (download all my data)
- [ ] Account deletion (hard delete all user data)
- [ ] Clear privacy policy explaining data processing
- [ ] Data processing agreement if using sub-processors
- [ ] Lawful basis for each type of data processing

### 15.3 Payment Compliance

- [ ] Stripe handles PCI compliance
- [ ] Clear pricing displayed before purchase
- [ ] Easy cancellation flow (Stripe Customer Portal)
- [ ] Prorated refunds for annual plans
- [ ] Receipt emails via Stripe

---

## 16. Phase Execution Plan

### Phase 1: Lock the Foundation (Week 1–2)

**Goal:** Make the app secure, billable, and monitorable.

| # | Task | Type | Effort |
|---|------|------|--------|
| 1.1 | Restrict CORS to production domain in all 8 edge functions | Security | 1 hour |
| 1.2 | Add auth validation to `fetch-trends` and `google-places` | Security | 1 hour |
| 1.3 | Add Zod input validation to all edge functions | Security | 4 hours |
| 1.4 | Integrate Stripe: products, prices, checkout, webhooks | Billing | 8 hours |
| 1.5 | Build subscription management (Stripe Customer Portal) | Billing | 4 hours |
| 1.6 | Add `subscription_tier` check in edge functions (feature gating) | Billing | 4 hours |
| 1.7 | Add usage metering table + tracking | Billing | 4 hours |
| 1.8 | Implement rate limiting per user per function | Security | 4 hours |
| 1.9 | Add password reset flow | Auth | 3 hours |
| 1.10 | Add Google OAuth | Auth | 3 hours |
| 1.11 | Integrate Sentry error monitoring | Ops | 2 hours |
| 1.12 | Integrate PostHog analytics | Ops | 2 hours |
| 1.13 | Fix: delete trip cascade logic | Bug | 2 hours |
| 1.14 | Fix: CapsuleTab decision (integrate or remove) | Bug | 1 hour |
| 1.15 | Fix: Origin city lat/lng | Bug | 1 hour |
| 1.16 | Run npm audit fix | Security | 1 hour |
| 1.17 | Enable TypeScript strict mode | Quality | 4 hours |

**Estimated total: ~48 hours**

### Phase 2: Elevate the Brand (Week 2–3)

**Goal:** Make every pixel feel luxury.

| # | Task | Type | Effort |
|---|------|------|--------|
| 2.1 | Warm colour temperature (update CSS variables) | Design | 2 hours |
| 2.2 | Redesign landing page (hero, social proof, sections) | Design | 12 hours |
| 2.3 | Source premium hero imagery/video | Design | 4 hours |
| 2.4 | Build pricing/membership page | Feature | 6 hours |
| 2.5 | Build onboarding flow (post-signup wizard) | Feature | 6 hours |
| 2.6 | Personalise dashboard (name, avatar, tier) | Feature | 3 hours |
| 2.7 | Improve empty states with personalised prompts | Design | 3 hours |
| 2.8 | Add skeleton loading states (champagne shimmer) | Design | 3 hours |
| 2.9 | Add parallax/scroll effects to landing page | Design | 4 hours |
| 2.10 | Redesign footer (links, social, newsletter) | Design | 3 hours |
| 2.11 | Create Terms of Service page | Legal | 4 hours |
| 2.12 | Create Privacy Policy page | Legal | 4 hours |
| 2.13 | Add cookie consent banner | Legal | 2 hours |
| 2.14 | Design and send branded email templates | Design | 4 hours |
| 2.15 | Add About page | Content | 3 hours |

**Estimated total: ~63 hours**

### Phase 3: Monetise & Grow (Week 3–5)

**Goal:** Revenue flowing, growth engine running.

| # | Task | Type | Effort |
|---|------|------|--------|
| 3.1 | Launch Stripe billing (live mode) | Billing | 2 hours |
| 3.2 | Implement free tier limits (1 trip, no images, limited features) | Feature | 6 hours |
| 3.3 | Build upgrade prompts at gating points | Feature | 4 hours |
| 3.4 | Add affiliate links to outfit suggestions | Revenue | 6 hours |
| 3.5 | Build referral programme (invite → free month) | Growth | 8 hours |
| 3.6 | SEO: add meta tags, OG tags, structured data | Growth | 4 hours |
| 3.7 | Code splitting + lazy loading routes | Performance | 3 hours |
| 3.8 | Image CDN optimisation | Performance | 3 hours |
| 3.9 | Font preloading | Performance | 1 hour |
| 3.10 | Build CI/CD pipeline (GitHub Actions) | DevOps | 4 hours |
| 3.11 | Write tests for critical paths (auth, billing, trip CRUD) | Quality | 8 hours |
| 3.12 | Set up staging environment | DevOps | 4 hours |
| 3.13 | Build promoted activities foundation (B2B) | Revenue | 8 hours |
| 3.14 | Social sharing cards ("Styled by Concierge Styled") | Growth | 4 hours |
| 3.15 | Instagram/Pinterest content templates | Growth | 4 hours |

**Estimated total: ~69 hours**

### Phase 4: Scale & Native (Week 5+)

**Goal:** Native app, B2B revenue, platform scale.

| # | Task | Type | Effort |
|---|------|------|--------|
| 4.1 | Native app: Expo project setup + auth | Mobile | 2 weeks |
| 4.2 | Native app: Core screens (dashboard, trip, create) | Mobile | 3 weeks |
| 4.3 | Native app: AI features + offline | Mobile | 2 weeks |
| 4.4 | Native app: Push notifications | Mobile | 1 week |
| 4.5 | Native app: App Store submission | Mobile | 1 week |
| 4.6 | Advertiser portal MVP | B2B | 3 weeks |
| 4.7 | Trip collaboration (multiple users) | Feature | 2 weeks |
| 4.8 | PDF lookbook export | Feature | 1 week |
| 4.9 | Calendar integration (.ics export) | Feature | 3 days |
| 4.10 | Multi-language support | Feature | 2 weeks |
| 4.11 | Apple Watch companion | Mobile | 2 weeks |

---

## 17. Database Schema Reference

### Current Tables

```sql
-- Profiles
profiles (id, user_id, name, avatar_url, style_profile[], luggage_size, subscription_tier, created_at, updated_at)

-- Trips
trips (id, user_id, destination, country, start_date, end_date, trip_type, accommodation, latitude, longitude, origin_city, origin_country, image_url, created_at)

-- Weather
weather_data (id, trip_id, date, temperature_high, temperature_low, rain_probability, wind_speed, weather_code, description, created_at)

-- Events
trip_events (id, trip_id, event_name, event_type, event_date, location, is_pinned, notes, created_at)

-- Wardrobe
wardrobe_items (id, trip_id, category, description, color, tags[], image_url, order_index, created_at)

-- Packing
packing_items (id, trip_id, name, category, quantity, is_packed, order_index, created_at)

-- Board
board_items (id, trip_id, image_url, description, notes, order_index, created_at)

-- AI Outfits
outfit_suggestions (id, trip_id, title, occasion, description, items JSONB, image_url, pinned, created_at)

-- Activities (with ad support)
activity_suggestions (id, trip_id, name, description, category, location, rating, price_level, image_url, source_url, booking_url, is_promoted, promoted_by, created_at)
```

### Tables Needed (New)

```sql
-- Usage tracking
api_usage (id, user_id, function_name, called_at, tokens_used, cost_estimate)

-- Stripe integration
stripe_customers (id, user_id, stripe_customer_id, created_at)
stripe_subscriptions (id, user_id, stripe_subscription_id, status, tier, current_period_start, current_period_end, created_at)

-- Referrals
referrals (id, referrer_user_id, referred_user_id, status, reward_granted, created_at)

-- Advertiser campaigns (B2B - Phase 4)
ad_campaigns (id, advertiser_id, name, destination_target, date_range_start, date_range_end, trip_type_targets[], budget, spent, status, creative_image_url, creative_title, creative_description, booking_url, created_at)

-- Ad impressions/clicks (B2B - Phase 4)
ad_events (id, campaign_id, user_id, trip_id, event_type, created_at)
```

---

## 18. Edge Functions Reference

### Current Functions

| Function | APIs | Auth Required | Cost |
|----------|------|---------------|------|
| `fetch-weather` | Open-Meteo | Yes | Free |
| `generate-outfits` | OpenAI GPT-4o-mini, DALL-E 3 | Yes | $0.60-1.80 |
| `search-fashion` | Firecrawl, OpenAI, DALL-E 3 | Yes | $0.40-0.50 |
| `suggest-activities` | Firecrawl, OpenAI, Google Places | Yes | $0.20-0.30 |
| `suggest-packing` | OpenAI GPT-4o-mini | Yes | $0.01-0.02 |
| `fetch-trends` | Firecrawl, OpenAI, Google/Unsplash | **No** | $0.01-0.03 |
| `google-places` | Google Places API | **No** | $0.03-0.17 |
| `fetch-destination-image` | Google Places, Unsplash, Picsum | Yes | $0.02-0.03 |

### Required Environment Secrets

| Secret | Used By | Required |
|--------|---------|----------|
| `OPENAI_API_KEY` | generate-outfits, search-fashion, suggest-activities, suggest-packing, fetch-trends | Yes |
| `GOOGLE_MAPS_API_KEY` | google-places, suggest-activities, fetch-destination-image, fetch-trends | Yes |
| `SERPER_API_KEY` | search-fashion, fetch-trends | Required for outfit inspiration & trends |
| `VIATOR_API_KEY` | suggest-activities | Optional (real bookable experiences; apply at partnerresources.viator.com) |
| `UNSPLASH_ACCESS_KEY` | fetch-destination-image, fetch-trends | Optional (fallback to Picsum) |

### Functions Needed (New)

| Function | Purpose | Phase |
|----------|---------|-------|
| `check-subscription` | Validate user tier + usage limits before calling expensive functions | Phase 1 |
| `stripe-webhook` | Handle Stripe subscription events (created, updated, cancelled) | Phase 1 |
| `create-checkout` | Create Stripe Checkout session for subscription | Phase 1 |
| `create-portal` | Create Stripe Customer Portal session for management | Phase 1 |
| `export-user-data` | GDPR data export | Phase 2 |
| `delete-user-data` | GDPR account deletion | Phase 2 |
| `track-ad-event` | Log impression/click for promoted content (B2B) | Phase 4 |

---

## 19. File Structure

```
Concierge Styled/
├── src/
│   ├── main.tsx                          # App entry point
│   ├── App.tsx                           # Router + providers
│   ├── App.css                           # (mostly unused)
│   ├── index.css                         # Global styles, CSS variables, utilities
│   ├── vite-env.d.ts                     # Vite type declarations
│   │
│   ├── pages/
│   │   ├── Index.tsx                     # Landing page
│   │   ├── Auth.tsx                      # Sign in / sign up
│   │   ├── Dashboard.tsx                 # Trip list + trending
│   │   ├── CreateTrip.tsx                # New trip form
│   │   ├── TripDetail.tsx                # Trip view (6 tabs)
│   │   ├── Settings.tsx                  # Profile settings
│   │   ├── NotFound.tsx                  # 404
│   │   ├── Pricing.tsx                   # [TO BUILD] Membership tiers
│   │   ├── Onboarding.tsx                # [TO BUILD] Post-signup wizard
│   │   ├── Terms.tsx                     # [TO BUILD] Terms of Service
│   │   └── Privacy.tsx                   # [TO BUILD] Privacy Policy
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Navbar.tsx                # Navigation bar
│   │   │   └── FloatingActionButton.tsx  # Quick-create FAB
│   │   ├── trip/
│   │   │   ├── OverviewTab.tsx           # Weather + events
│   │   │   ├── ThingsToDoTab.tsx         # Activity suggestions
│   │   │   ├── InspirationTab.tsx        # AI outfit suggestions
│   │   │   ├── CapsuleTab.tsx            # Wardrobe capsule
│   │   │   ├── PackingTab.tsx            # Packing checklist
│   │   │   ├── BoardTab.tsx              # Mood board
│   │   │   ├── PlacesAutocomplete.tsx    # Google Places input
│   │   │   ├── TripEditDialog.tsx        # Edit trip modal
│   │   │   └── TripDeleteDialog.tsx      # Delete confirmation
│   │   ├── ui/                           # 71 shadcn/ui components
│   │   └── NavLink.tsx                   # Navigation link component
│   │
│   ├── contexts/
│   │   └── AuthContext.tsx               # Auth state provider
│   │
│   ├── hooks/
│   │   ├── use-toast.ts                  # Toast notifications
│   │   └── use-mobile.tsx                # Mobile detection
│   │
│   ├── integrations/supabase/
│   │   ├── client.ts                     # Supabase client init
│   │   └── types.ts                      # Generated Supabase types
│   │
│   ├── lib/
│   │   └── utils.ts                      # Utility functions (cn)
│   │
│   ├── types/
│   │   └── database.ts                   # TypeScript interfaces
│   │
│   └── test/
│       ├── setup.ts                      # Vitest setup
│       └── example.test.ts               # Placeholder test
│
├── supabase/
│   ├── functions/
│   │   ├── fetch-weather/index.ts        # Open-Meteo weather
│   │   ├── generate-outfits/index.ts     # AI outfits + DALL-E
│   │   ├── search-fashion/index.ts       # Fashion web search
│   │   ├── suggest-activities/index.ts   # Activity discovery
│   │   ├── suggest-packing/index.ts      # Smart packing lists
│   │   ├── fetch-trends/index.ts         # Trending curation
│   │   ├── google-places/index.ts        # Places autocomplete
│   │   ├── fetch-destination-image/index.ts  # Trip card images
│   │   ├── deno.d.ts                     # Deno type declarations
│   │   └── tsconfig.json                 # Deno TS config
│   ├── migrations/                       # 8 SQL migration files
│   ├── config.toml                       # Supabase project config
│   └── FULL_SETUP.sql                    # Complete schema setup
│
├── .env                                  # Environment variables
├── .env.example                          # Environment template
├── package.json                          # Dependencies + scripts
├── package-lock.json                     # Lockfile
├── vite.config.ts                        # Vite config
├── tailwind.config.ts                    # Tailwind theme
├── tsconfig.json                         # Base TS config
├── tsconfig.app.json                     # App TS config
├── tsconfig.node.json                    # Node TS config
├── postcss.config.js                     # PostCSS config
├── eslint.config.js                      # ESLint config
├── components.json                       # shadcn/ui config
├── MOODMILES_MASTER.md                   # This document
├── SUPABASE_NEW_PROJECT_SETUP.md         # Supabase setup guide
└── DEPLOY_FUNCTIONS_MANUALLY.md          # Edge function deployment
```

---

## Appendix A: Design References

### Brands to Study

| Brand | What to Learn |
|-------|--------------|
| **Soho House** | Membership exclusivity, warm dark palette, editorial photography |
| **EDITION Hotels** | Minimal luxury, restraint, typography |
| **Net-a-Porter** | Fashion curation UI, product presentation, editorial content |
| **Rimowa** | Travel + luxury intersection, product storytelling |
| **Aesop** | Warm minimalism, typography-first design |
| **Mejuri** | Accessible luxury, clean ecommerce, champagne tones |

### Colour References

| Purpose | Hex | HSL | Visual |
|---------|-----|-----|--------|
| Background (warm black) | `#131210` | `30 8% 7%` | Near-black with warm undertone |
| Card (warm dark) | `#1a1917` | `30 7% 10%` | Slightly lifted from background |
| Champagne (primary) | `#b69a6e` | `38 35% 55%` | Warm gold accent |
| Champagne glow | `#c9ab7a` | `38 45% 65%` | Lighter gold for hover/active |
| Text (warm white) | `#e8e0d4` | `30 30% 87%` | Cream, not pure white |
| Muted text | `#8a8278` | `30 8% 50%` | Warm grey |

---

## Appendix B: Quick Start (Development)

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Run linter
npm run lint

# Run tests
npm run test
```

### Required Environment Variables

```env
# .env (frontend)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...

# Supabase Edge Function Secrets (set in Dashboard)
OPENAI_API_KEY=sk-...
GOOGLE_MAPS_API_KEY=AIza...
SERPER_API_KEY=...               # required for search-fashion & fetch-trends (serper.dev)
VIATOR_API_KEY=...               # optional for real bookable experiences
UNSPLASH_ACCESS_KEY=...           # optional
STRIPE_SECRET_KEY=sk_...          # to be added
STRIPE_WEBHOOK_SECRET=whsec_...   # to be added
```

---

*Last updated: 2026-02-24*
*Version: 2.0 — Full strategic roadmap*
