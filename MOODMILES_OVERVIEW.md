# MoodMiles Atelier — Product Overview & Partner Brief

> **For:** Business partners, marketing, and growth strategy  
> **Purpose:** Understand what MoodMiles is, what it does, where it’s going — and where the biggest opportunities lie

---

## Table of Contents

1. [What Is MoodMiles?](#1-what-is-moodmiles)
2. [Brand & Voice](#2-brand--voice)
3. [Current Functionality](#3-current-functionality)
4. [Scope: What Exists vs. What’s Planned](#4-scope-what-exists-vs-whats-planned)
5. [Opportunity Gaps & Partner Ideas](#5-opportunity-gaps--partner-ideas)
6. [Revenue & Monetisation](#6-revenue--monetisation)
7. [Marketing & Campaign Readiness](#7-marketing--campaign-readiness)

---

## 1. What Is MoodMiles?

### The One-Liner

**MoodMiles is a luxury travel styling platform that tells you what to wear, what to do, and what to pack — before you leave.**

### The Longer Story

MoodMiles sits at the intersection of **travel planning** and **fashion intelligence**. It’s not a generic packing app or a Pinterest board. It’s an AI-powered concierge that:

- Knows the weather at your destination
- Understands your trip type (Fashion Week, Beach Escape, City Break, etc.)
- Suggests outfits that fit the climate and occasion
- Curates activities and experiences
- Builds smart packing lists that fit your luggage

Think: **Soho House membership meets Net-a-Porter curation meets a personal stylist** — in an app.

### Who It’s For

- **Style-conscious travellers** (25–55)
- People who plan outfits, not just itineraries
- Users who currently juggle Pinterest, weather apps, and Instagram saves
- Anyone who wants to **arrive impeccably** — not scramble at the last minute

### What Makes It Different

| Competitor | What They Do | MoodMiles Advantage |
|-----------|--------------|----------------------|
| PackPoint | Basic packing lists | No fashion, no AI, no style |
| TripIt | Itinerary management | Functional, not aspirational |
| Pinterest | Mood boards | No trip context, no weather, no packing logic |
| Stylebook | Wardrobe management | No travel integration |
| Stitch Fix / Trunk Club | Styled clothing | Not travel-specific |

**MoodMiles is the only product that combines destination intelligence with AI-powered fashion curation.**

---

## 2. Brand & Voice

### Tagline

**Arrive Impeccably Everywhere**

### Supporting Line

**Travel, Styled.**

### Brand Pillars

| Pillar | Meaning |
|-------|---------|
| **Intelligent** | AI that understands climate, occasion, and personal style |
| **Curated** | Not everything — the right things. Quality over quantity |
| **Private** | Your travel plans and style are yours. No social feed, no followers |
| **Elevated** | Every interaction should feel like a luxury experience |

### Visual & Tone

- **Dark, warm palette** — champagne gold accents, warm blacks (not cold tech grey)
- **Editorial feel** — magazine-quality, not generic SaaS
- **Restrained** — minimal, confident, never loud
- **Aspirational but attainable** — elevated everyday, not unrelatable luxury

### Voice Guidelines

- **Confident, not arrogant** — “We know what works” not “We’re the best”
- **Warm, not cold** — human, not robotic
- **Curated, not overwhelming** — “Here’s what matters” not “Here’s everything”
- **Private, not social** — “Your journey, your style” — no FOMO, no feeds

---

## 3. Current Functionality

### What’s Live Today

#### Landing & Auth

- **Landing page** — Hero, features, destinations, CTA
- **Sign up / Sign in** — Email + password, email verification
- **Password reset** — Flow in place
- **Google OAuth** — Planned, not yet live

#### Dashboard

- **Trip list** — All trips with destination images, dates, trip type
- **Trending feed** — AI-curated fashion/destination trends (e.g. “Milan: Quiet luxury & structured tailoring”)
- **Personalised greeting** — “Good morning, [Name]” with avatar
- **Quick create** — Floating action button to add a new trip

#### Trip Creation

- **Destination search** — Google Places autocomplete (city + country)
- **Origin city** — Where you’re travelling from (for future route/layover features)
- **Dates** — Start and end
- **Trip type** — Leisure, Business, Fashion Week, Ski, Yacht, Wedding, City Break, Beach Escape, Family
- **Accommodation** — Optional notes

#### Trip Detail (6 Tabs)

| Tab | What It Does |
|-----|--------------|
| **Overview** | 16-day weather forecast (Open-Meteo), trip events, refresh weather |
| **Things to Do** | AI-suggested activities (restaurants, experiences, sights) with Google Places enrichment |
| **Inspiration** | AI-generated outfit suggestions with DALL-E images; “Search fashion” for trend-based looks |
| **Packing** | AI-generated packing list based on weather, trip type, events |
| **Board** | Mood board — upload images, pin from Inspiration, add notes |

#### Settings

- **Profile** — Name, avatar, style tags (e.g. minimalist, maximalist, classic)
- **Luggage size** — Small / Medium / Large (feeds packing logic)
- **Subscription** — Free vs Luxe vs Atelier (Stripe integration in progress)

### Tech at a Glance

- **PWA** — Progressive Web App (add to home screen)
- **Stack** — React, TypeScript, Vite, Supabase (auth, database, storage, edge functions)
- **AI** — OpenAI GPT-4o-mini + DALL-E 3 for outfits, activities, packing
- **APIs** — Google Places, Open-Meteo (weather), Firecrawl, Unsplash
- **Hosting** — Netlify (frontend), Supabase (backend)

---

## 4. Scope: What Exists vs. What’s Planned

### ✅ Built & Deployed

| Area | Status |
|------|--------|
| Landing page | ✅ |
| Auth (email + verification) | ✅ |
| Dashboard + trending | ✅ |
| Trip CRUD | ✅ |
| Weather (16-day) | ✅ |
| AI outfits (text + images) | ✅ |
| Fashion search | ✅ |
| Activities | ✅ |
| Packing lists | ✅ |
| Mood board | ✅ |
| Settings (profile, luggage, style) | ✅ |
| Netlify deployment | ✅ |
| Supabase Edge Functions (CORS fixed) | ✅ |

### 🚧 In Progress / Critical

| Area | Status |
|------|--------|
| Stripe subscription (Luxe / Atelier) | 🚧 |
| Feature gating by tier | 🚧 |
| Google OAuth | 🚧 |
| Pricing / membership page | 🚧 |
| Terms of Service / Privacy Policy | 🚧 |

### 📋 Planned (Roadmap)

| Area | Phase |
|------|-------|
| Affiliate links (outfit → shop) | MVP1.5 |
| Trip sharing (read-only link) | MVP1.5 |
| PDF lookbook export | MVP1.5 |
| Calendar integration (.ics) | MVP1.5 |
| Native mobile app | MVP2 |
| B2B advertiser portal | MVP2 |
| Trip collaboration (multi-user) | MVP2 |
| Offline mode | MVP2 |

---

## 5. Opportunity Gaps & Partner Ideas

Based on the master roadmap and partner input, these are the **gaps and opportunities** where MoodMiles can expand — and where the biggest commercial upside sits.

### 5.1 Luggage

**Current state:** User selects luggage size (Small / Medium / Large) in Settings. Packing list adapts to that.

**Gap:** No luggage *recommendations*, no luggage *affiliate*, no luggage *brand partnerships*.

**Opportunity:**
- Recommend luggage by trip type (e.g. “Rimowa Cabin for Fashion Week”)
- Affiliate links to Rimowa, Away, Tumi, etc.
- “Pack this trip” → “Fits in [X] bag” with product link
- Luggage brands as sponsors or featured partners

---

### 5.2 Fashion & Shopping — The Meat Is Here

**Current state:** AI generates outfit suggestions with DALL-E images. Fashion search surfaces trends. No product links.

**Gap:** Outfits are inspirational only. No path to purchase. No affiliate revenue.

**Opportunity (partner insight: “The meat is in the affiliation and shopping”):**
- **“Shop this look”** — Each outfit item links to real products (Amazon, Net-a-Porter, Farfetch, SSENSE)
- **Amazon Affiliate** — Huge reach, easy integration. “Quiet luxury blazer” → Amazon product links
- **Luxury affiliates** — Net-a-Porter, Farfetch, Matches — 8–15% commission
- **Fashion inspo as conversion driver** — Every outfit becomes a shopping moment
- **Personalised product picks** — “Based on your style profile + this trip, here are 5 pieces to consider”

---

### 5.3 Airlines & Routes

**Current state:** Origin city is captured (where you’re travelling from). No airline or route data.

**Gap:** No flight info, no airline partnerships, no route intelligence.

**Opportunity:**
- Integrate flight APIs (e.g. Skyscanner, Kiwi) for route suggestions
- “Best routes from [Origin] to [Destination]”
- Airline affiliate (earn per booking)
- “Fly direct vs. one stop” — layover-aware planning (see below)

---

### 5.4 Layovers — “We LOVE This”

**Current state:** Not built. Trips are point-to-point (origin → destination).

**Gap:** No layover planning, no “24 hours in Dubai” or “8 hours in Amsterdam” experience.

**Opportunity:**
- **Layover mode** — Add a layover city + duration to a trip
- **“What to do in [City] in 6 hours”** — Curated, time-bound activities
- **Layover outfit** — “Comfortable but polished for the airport + a quick museum stop”
- **Airport lounge / shopping** — Affiliate or sponsored content
- **Layover-specific packing** — “Keep these in your carry-on for the layover”

This is a **differentiator** — few travel apps focus on layovers as a first-class experience.

---

### 5.5 Tracking Loved Ones

**Current state:** Not built. Trips are personal, not shared.

**Gap:** No way to see where family/friends are, no “trip sharing” for safety or connection.

**Opportunity:**
- **Share trip with family** — Read-only link: “See my itinerary and outfits”
- **“Where’s Mum?”** — Optional location sharing for peace of mind
- **Trip companions** — Invite a partner/friend to collaborate on one trip
- **Safety angle** — “Share your trip with someone you trust”

---

### 5.6 Summary: Priority Opportunities

| Opportunity | Partner Interest | Revenue Potential | Effort |
|-------------|------------------|-------------------|--------|
| **Fashion affiliate (Amazon + luxury)** | “The meat” | High | Medium |
| **Layover planning** | “LOVE” | Medium (engagement + ads) | Medium |
| **Luggage affiliate** | Implied | Medium | Low |
| **Airlines / routes** | Implied | Medium (affiliate) | High |
| **Tracking loved ones** | Implied | Low (retention) | Medium |

---

## 6. Revenue & Monetisation

### Subscription Tiers (Planned)

| Tier | Price | Key Limits |
|------|-------|------------|
| **Free** | $0 | 1 trip, text-only outfits, limited features |
| **Luxe** | $14.99/mo or $119/yr | Unlimited trips, full AI, DALL-E images |
| **Atelier** | $29.99/mo or $249/yr | Everything + collaboration, lookbooks, exclusives |

### Affiliate & B2B (Where the Growth Is)

| Stream | Model | Status |
|--------|-------|--------|
| **Fashion affiliate** | Commission on outfit → product links | Planned |
| **Luggage affiliate** | Commission on bag recommendations | Gap |
| **Airline affiliate** | Commission on flight bookings | Gap |
| **Promoted experiences** | Brands pay to appear in “Things to Do” | DB ready, UI planned |
| **Sponsored destinations** | Tourism boards in Trending | Planned |

---

## 7. Marketing & Campaign Readiness

### What Exists for Marketing

- **Live PWA** — Deployed on Netlify, shareable URL
- **Landing page** — Hero, features, destinations, CTA
- **Brand assets** — Tagline, pillars, voice guidelines
- **Product story** — Clear differentiation vs. competitors

### What’s Needed for Campaigns

| Asset | Status | Notes |
|------|--------|------|
| **Pricing page** | Not built | Needed for paid campaigns |
| **Testimonials / social proof** | None | “As featured in”, member quotes |
| **Demo video / screenshots** | None | For ads, social, PR |
| **Email sequences** | Basic | Welcome, verification — need nurture |
| **Referral programme** | Planned | “Invite a friend → free month” |
| **SEO content** | None | “What to wear in [city] in [month]” |
| **Instagram / Pinterest** | None | Editorial content, “Styled by Moodmiles” |

### Campaign Angles (Ready to Develop)

1. **“Arrive Impeccably”** — Premium, confident, travel + style
2. **“Travel, Styled.”** — Short, memorable, lifestyle
3. **“Your AI stylist knows the weather before you pack”** — Functional benefit
4. **“Never overpack. Never underdress.”** — Pain point + promise
5. **Layover angle** — “6 hours in Dubai? We’ve got your outfit and your plan.” (once built)
6. **Fashion Week** — “Milan, Paris, NYC — styled before you land.”
7. **Affiliate angle** — “Shop the look. We’ve done the work.”

### Target Audiences for Campaigns

| Segment | Message |
|---------|---------|
| **Frequent travellers** | “Stop guessing what to pack.” |
| **Fashion-conscious** | “Your destination has a dress code. We know it.” |
| **Pinterest / Instagram savers** | “One app instead of 10 saved posts.” |
| **Business travellers** | “From boardroom to dinner — one capsule.” |
| **Layover travellers** | “Make the stop part of the trip.” (future) |

---

## Appendix: Quick Reference

### URLs

- **App:** [Your Netlify URL]
- **Supabase Dashboard:** https://supabase.com/dashboard/project/hwykcvpcwpaiotatzise

### Key Documents

- **MOODMILES_MASTER.md** — Full technical roadmap, schema, edge functions
- **This document** — Product overview for partners and marketing

### One-Page Summary for Partners

**MoodMiles** = AI travel stylist. Tells you what to wear, what to do, what to pack — before you go.

**Built:** Trip planning, weather, outfits, activities, packing, mood board. Live on Netlify.

**Gaps we’re excited about:** Fashion/Amazon affiliate, layovers, luggage, airlines, tracking loved ones.

**Brand:** Arrive Impeccably Everywhere. Curated, intelligent, private, elevated.

**Next:** Subscriptions, affiliate links, layover mode, marketing campaigns.

---

*Last updated: 2026-02-25*  
*Version: 1.0 — Partner & marketing overview*
