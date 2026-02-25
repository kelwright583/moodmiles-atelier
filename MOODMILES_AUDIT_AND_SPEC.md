# MoodMiles — Critical Audit & “Wow” Spec

> **Purpose:** Objective analysis of the current product, identification of gaps, and a spec for making MoodMiles truly user-friendly, exciting, luxe, and irresistible.

---

## Executive Summary

MoodMiles has a **strong foundation**: clear brand, solid tech stack, and core features (weather, outfits, activities, packing, mood board) that work. The biggest opportunities lie in **closing the loop between inspiration and purchase**, **layover planning**, **UX polish**, and **luxury feel** — not just more features.

---

## Part 1: Critical Audit

### 1.1 What’s Working Well

| Area | Assessment |
|------|------------|
| **Brand** | Clear, differentiated. "Arrive Impeccably Everywhere" + champagne palette + Playfair/Inter is coherent. |
| **Core flow** | Trip creation → Overview → Things to Do → Inspiration → Packing → Board is logical. |
| **AI integration** | Weather, outfits (web search), activities, packing all use AI. Real value. |
| **Visual system** | Glass cards, champagne gradients, warm blacks, editorial typography. Consistent. |
| **PWA** | Add to home screen works. Good for mobile-first users. |
| **Auth** | Email + verification + password reset. Google OAuth wired (may need config). |

### 1.2 Critical Gaps (Must Fix)

#### A. Trip Detail Hero — No Destination Image

**Current:** Trip detail hero uses `bg-secondary` (solid dark). Trips have `image_url` from `fetch-destination-image`, but it’s **never shown** on the trip detail page.

**Impact:** Dashboard cards look rich; trip detail feels flat and unfinished.

**Fix:** Render `trip.image_url` as hero background with gradient overlay, matching dashboard cards.

---

#### B. Inspiration → Shopping: Dead End

**Current:** Outfit items have "Shop this item" with generic search links (Amazon, ASOS, Net-a-Porter, Zara). No affiliate tracking, no product-level links, no "Shop this look" CTA.

**Impact:** High intent, zero conversion. Partner insight: "The meat is in the affiliation and shopping."

**Fix:**  
- Implement affiliate links (Amazon Associates, luxury affiliates).  
- Add "Shop this look" as primary CTA.  
- Consider product API integration (e.g. Amazon Product Advertising API) for real product links.

---

#### C. No Pricing Page

**Current:** Settings shows "Upgrade to Luxe" but there’s no dedicated pricing/membership page. Users can’t compare tiers or understand value before signing up.

**Impact:** Conversion friction. Paid campaigns need a clear pricing destination.

**Fix:** Add `/pricing` with tier comparison, benefits, and CTAs.

---

#### D. Legal & Trust

**Current:** ToS and Privacy Policy marked as "in progress."

**Impact:** Required for paid subscriptions, EU users (GDPR), and App Store. Blocks launch.

**Fix:** Publish basic ToS and Privacy Policy; link from footer and auth.

---

#### E. Feature Gating Incomplete

**Current:** CreateTrip blocks free users at 1 trip. Overview doc mentions tier limits (text-only outfits, limited features) but implementation is partial.

**Impact:** Inconsistent experience; unclear value of paid tiers.

**Fix:** Implement full feature gating: DALL-E images, unlimited trips, packing list length, etc., by `subscription_tier`.

---

### 1.3 UX & Polish Gaps

| Gap | Current State | Impact |
|-----|---------------|--------|
| **Empty states** | Generic "Your first journey awaits" | Could be more aspirational, with destination imagery or micro-copy |
| **Loading states** | Shimmer skeletons, spinners | Good. Consider skeleton shapes that match content (e.g. outfit cards) |
| **Error handling** | Toasts for errors | No retry UI, no offline messaging |
| **Onboarding** | None | New users land on dashboard with no guidance |
| **Mobile nav** | Hamburger with basic links | No quick access to Create Trip; FAB helps but could be clearer |
| **Trip hero image** | Not shown | See 1.2.A |
| **Accessibility** | Basic | No explicit focus management, aria-labels in places; could improve |

---

### 1.4 Opportunity Gaps (From Overview)

| Opportunity | Current | Priority | Effort |
|-------------|---------|----------|--------|
| **Fashion affiliate** | Search links only | **High** | Medium |
| **Layover planning** | Not built | **High** | Medium |
| **Luggage affiliate** | Size only, no recommendations | Medium | Low |
| **Airlines / routes** | Origin captured, no flights | Medium | High |
| **Trip sharing** | Not built | Medium | Medium |
| **PDF lookbook export** | Planned | Medium | Medium |
| **Calendar (.ics)** | Planned | Low | Low |

---

## Part 2: “Wow” Spec — Making It Irresistible

### 2.1 User-Friendly

| Spec | Description |
|------|-------------|
| **Onboarding flow** | 3–4 step wizard: "Where are you going?" → "What’s your style?" (style tags) → "What luggage?" → First trip created. Skip option. |
| **Progressive disclosure** | Hide advanced options (accommodation, origin) behind "Add more details" until user needs them. |
| **Smart defaults** | Pre-fill luggage from profile; suggest trip type from destination + dates. |
| **Contextual help** | Tooltips on first use: "Smart Suggest uses weather + events to build your list." |
| **Empty state CTAs** | Every empty tab has one clear action: "Get Looks", "Discover Experiences", "Generate Packing List". |
| **Offline awareness** | Show "You're offline" banner; queue actions; sync when back online. |

---

### 2.2 Exciting

| Spec | Description |
|------|-------------|
| **Layover mode** | Add layover city + duration. "6 hours in Dubai" → curated activities + outfit. Differentiator. |
| **"Shop this look"** | One-tap from outfit to affiliate product grid. "5 pieces to complete this look." |
| **Trending → Trip** | Tap a trending card → "Create trip to Milan" pre-filled. Reduce friction. |
| **Outfit regeneration** | "Not quite right?" → Regenerate with different vibe (e.g. "More minimal", "More bold"). |
| **Activity booking** | Where `booking_url` exists, prominent "Book" button. Consider affiliate for experiences. |
| **Packing checklist animation** | Celebrate 100% packed with subtle confetti or champagne burst. |
| **Trip countdown** | "Paris in 12 days" on dashboard. Build anticipation. |

---

### 2.3 Luxe

| Spec | Description |
|------|-------------|
| **Trip hero imagery** | Always show destination image. Ken Burns on load. High-quality Unsplash/curated shots. |
| **Micro-interactions** | Button hover glow, card lift, tab indicator slide. Already partial; extend consistently. |
| **Typography hierarchy** | More dramatic hero sizes; tighter letter-spacing on labels. |
| **Sound design** | Optional subtle sound on "Packed" check, or on trip creation. Off by default. |
| **Haptic feedback** | On supported devices, light haptic on key actions (pack, pin). |
| **Luggage recommendations** | "This trip fits a Rimowa Cabin" with affiliate link. Feels curated. |
| **Membership badge** | Luxe/Atelier badge in nav, on trip cards. Subtle but visible. |

---

### 2.4 Irresistible (Conversion & Retention)

| Spec | Description |
|------|-------------|
| **Pricing page** | Clear tiers, feature comparison, "Most popular" badge, annual discount. |
| **Referral programme** | "Invite a friend → free month." Track via unique link. |
| **Email nurture** | Post-signup: "Complete your first trip" → "Get your first looks" → "Upgrade for unlimited." |
| **Social proof** | "As featured in" (when available), member count, testimonials. |
| **Demo video** | 60–90 sec "How MoodMiles works" for landing, ads, and onboarding. |
| **Trip sharing** | Read-only link: "See my Paris itinerary and outfits." Shareable, private. |
| **Lookbook export** | PDF of outfits + packing list. "Your Paris Lookbook." Atelier tier or one-time. |

---

## Part 3: Prioritised Roadmap

### Phase 1: Critical (2–4 weeks)

1. **Trip detail hero image** — Show `trip.image_url` with gradient overlay.  
2. **Pricing page** — `/pricing` with tiers and CTAs.  
3. **ToS & Privacy Policy** — Publish and link.  
4. **Feature gating** — Enforce tier limits across app.

### Phase 2: Conversion & Trust (4–6 weeks)

5. **Fashion affiliate** — Amazon Associates + 1–2 luxury affiliates. "Shop this look" CTA.  
6. **Luggage affiliate** — "Fits in [bag]" with product link.  
7. **Testimonials / social proof** — Placeholder section on landing; fill when available.

### Phase 3: Wow Features (6–10 weeks)

8. **Layover mode** — Add layover to trip; "What to do in X hours" + outfit.  
9. **Onboarding wizard** — 3-step flow for new users.  
10. **Trip sharing** — Read-only share link.  
11. **PDF lookbook** — Export outfits + packing for a trip.

### Phase 4: Scale & Delight (10+ weeks)

12. **Airlines / routes** — Flight suggestions, affiliate.  
13. **Native app** — React Native or similar for App Store.  
14. **Offline mode** — Cache trips, queue actions.  
15. **Referral programme** — Invite → free month.

---

## Part 4: Quick Wins (Can Ship Fast)

| Win | Effort | Impact |
|-----|--------|--------|
| Trip hero image on detail page | 1–2 hrs | High — immediate polish |
| "Create trip" from trending card | 2–3 hrs | Medium — reduces friction |
| Packing 100% celebration | 1 hr | Low — delight |
| Countdown on dashboard ("Paris in 12 days") | 2 hrs | Medium — anticipation |
| Better empty state copy | 1 hr | Low — tone |
| Add "Skip" to Create Trip optional fields | 30 min | Low — UX |

---

## Appendix: Technical Notes

- **Inspiration tab** uses `search-fashion` (Firecrawl) for web looks; `generate-outfits` (DALL-E) exists but Inspiration is now web-first. Confirm if DALL-E is still used.
- **Trip `image_url`** is populated by `fetch-destination-image`; ensure it’s used in TripDetail hero.
- **Stripe** — `create-checkout`, `create-portal`, `stripe-webhook` exist. Verify webhook and tier sync.
- **CapsuleTab** exists in codebase but is not used in TripDetail tabs. Consider removing or integrating.

---

*Last updated: 2026-02-25*  
*Version: 1.0 — Audit & Wow Spec*
