# Concierge Styled — API Keys & Secrets Reference

> **Last updated:** 26 February 2026  
> **How to set a Supabase secret:** `npx supabase secrets set KEY_NAME=value`  
> **To set multiple at once:** `npx supabase secrets set KEY1=val1 KEY2=val2`

---

## Status Legend

| Symbol | Meaning |
|--------|---------|
| ✅ Set | Already configured as a Supabase secret |
| ⚠️ Partial | Key exists but may need updating (e.g. wrong project) |
| 🔴 Missing — Required | App feature is broken without this |
| 🟡 Missing — Optional | Feature degrades gracefully without this |
| 🔵 Future | Required for a future prompt not yet built |

---

## 1. Core Infrastructure (Auto-set by Supabase)

These are set automatically by Supabase and **do not need manual action**.

| Key | Status | Notes |
|-----|--------|-------|
| `SUPABASE_URL` | ✅ Set | Auto-configured |
| `SUPABASE_ANON_KEY` | ✅ Set | Auto-configured |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Set | Auto-configured |
| `SUPABASE_DB_URL` | ✅ Set | Auto-configured |

---

## 2. AI & Content (OpenAI)

| Key | Status | Used By | How to Get |
|-----|--------|---------|------------|
| `OPENAI_API_KEY` | ✅ Set | Packing suggestions, outfit generation, briefings, dress code checks, activities, leave-behind items, shoppable outfits | [platform.openai.com](https://platform.openai.com/api-keys) |

**Action required:** None — already set.

---

## 3. Search & Trends (Serper)

| Key | Status | Used By | How to Get |
|-----|--------|---------|------------|
| `SERPER_API_KEY` | ✅ Set | Fashion image search (`search-fashion`), trending destinations (`fetch-trends`), shoppable outfits, affiliate product search | [serper.dev](https://serper.dev) |

**Action required:** None — already set.

---

## 4. Google APIs

All Google APIs use the same `GOOGLE_MAPS_API_KEY`. The key is set, but you may need to **enable additional APIs** in Google Cloud Console for newer features.

| Key | Status | Notes |
|-----|--------|-------|
| `GOOGLE_MAPS_API_KEY` | ✅ Set | Single key for all Google APIs |

### APIs that must be enabled on this key

Go to [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Enable APIs:

| Google API | Used By | Status |
|------------|---------|--------|
| Places API | Venue autocomplete (`google-places`) | Likely already on |
| Maps JavaScript API | Destination images (`fetch-destination-image`) | Likely already on |
| Distance Matrix API | Leave time calculator (`calculate-leave-time`) — **Prompt 18** | 🔴 **Needs enabling** |

**Action required:** Enable **Distance Matrix API** in Google Cloud Console for the leave-time feature to work.

---

## 5. Spotify (Music / Playlist Tab)

| Key | Status | Used By | How to Get |
|-----|--------|---------|------------|
| `SPOTIFY_CLIENT_ID` | 🔴 Missing | Trip playlist creation, track search, playback | [developer.spotify.com](https://developer.spotify.com/dashboard) |
| `SPOTIFY_CLIENT_SECRET` | 🔴 Missing | Same as above | Same dashboard |

**Action required:** Create a Spotify app at [developer.spotify.com](https://developer.spotify.com/dashboard), add your Netlify URL as a redirect URI, then set both secrets.

```bash
npx supabase secrets set SPOTIFY_CLIENT_ID=your_client_id SPOTIFY_CLIENT_SECRET=your_client_secret
```

---

## 6. Flight Tracking (AviationStack) — Prompt 18

| Key | Status | Used By | How to Get |
|-----|--------|---------|------------|
| `AVIATIONSTACK_API_KEY` | 🔴 Missing | Flight status in Today Tab (`get-flight-status`) | [aviationstack.com](https://aviationstack.com) — free tier: 1,000 req/month |

**Action required:** Sign up for a free account at aviationstack.com, copy your API key, then set:

```bash
npx supabase secrets set AVIATIONSTACK_API_KEY=your_key_here
```

---

## 7. Stripe (Billing) — Prompt 17

> ⚠️ **Prerequisite:** UK Ltd registered, Wise Business account, Stripe UK account, and products created first. See `MOODMILES_MASTER.md` for business setup steps.

| Key | Status | Used By | How to Get |
|-----|--------|---------|------------|
| `STRIPE_SECRET_KEY` | 🔵 Future | Checkout sessions, customer portal | Stripe Dashboard → Developers → API Keys |
| `STRIPE_WEBHOOK_SECRET` | 🔵 Future | Webhook verification (`stripe-webhook`) | Stripe Dashboard → Webhooks → Signing secret |
| `STRIPE_LUXE_PRICE_ID` | 🔵 Future | Luxe plan checkout | Stripe Dashboard → Products → Price ID |
| `STRIPE_ATELIER_PRICE_ID` | 🔵 Future | Atelier plan checkout | Stripe Dashboard → Products → Price ID |

**Action required when ready:**

```bash
npx supabase secrets set \
  STRIPE_SECRET_KEY=sk_live_... \
  STRIPE_WEBHOOK_SECRET=whsec_... \
  STRIPE_LUXE_PRICE_ID=price_... \
  STRIPE_ATELIER_PRICE_ID=price_...
```

---

## 8. Site URL (CORS & Redirects)

| Key | Status | Used By | Value |
|-----|--------|---------|-------|
| `SITE_URL` | 🔴 Missing | Invite links, Stripe redirects, toggle trip visibility | Your Netlify production URL |
| `ALLOWED_ORIGINS` | 🔴 Missing | CORS for all edge functions | Comma-separated list of allowed origins |

**Action required:**

```bash
npx supabase secrets set \
  SITE_URL=https://conciergestyled.netlify.app \
  ALLOWED_ORIGINS=https://conciergestyled.netlify.app,https://www.conciergestyled.com
```

> Update with your custom domain once connected.

---

## 9. Booking Email Import (Postmark) — Prompt 22

| Key | Status | Used By | How to Get |
|-----|--------|---------|------------|
| `POSTMARK_API_KEY` | 🔵 Future | Inbound booking email parsing | [postmarkapp.com](https://postmarkapp.com) — free tier: 100 emails/month |

**Action required when Prompt 22 is built:**

```bash
npx supabase secrets set POSTMARK_API_KEY=your_key_here
```

---

## 10. Optional Enhancements

These are used for fallback or enhancement features. The app works without them but degrades gracefully.

| Key | Status | Used By | How to Get |
|-----|--------|---------|------------|
| `UNSPLASH_ACCESS_KEY` | 🟡 Optional | Fallback destination images when Google has no photo | [unsplash.com/developers](https://unsplash.com/developers) — free |
| `VIATOR_API_KEY` | 🟡 Optional | Real bookable experiences in Events tab | [partnerresources.viator.com](https://partnerresources.viator.com) — apply required |
| `FIRECRAWL_API_KEY` | ✅ Set | Web scraping (used in trend/fashion search) | Already configured |

---

## 11. Affiliate & Marketplace (Future — Prompt 24)

These power the geo-aware shopping and rental features. All optional — app falls back to Serper search.

| Key | Status | Used By | Notes |
|-----|--------|---------|-------|
| `ASOS_RAPIDAPI_KEY` | 🔵 Future | ASOS product search | Via RapidAPI |
| `RAKUTEN_API_KEY` | 🔵 Future | Rakuten affiliate products | [rakutenadvertising.com](https://rakutenadvertising.com) |
| `RENTTHERUNWAY_API_KEY` | 🔵 Future | Rental outfit search | Partnership required |
| `BYROTATION_API_KEY` | 🔵 Future | UK rental marketplace | Partnership required |
| `VESTIAIRE_API_KEY` | 🔵 Future | Pre-loved fashion | Partnership required |

---

## Quick-Reference: What to Set Right Now

Priority order for the next working session:

```bash
# 1. Site URL + CORS (affects invite links and Stripe redirects — set immediately)
npx supabase secrets set SITE_URL=https://your-netlify-url.netlify.app ALLOWED_ORIGINS=https://your-netlify-url.netlify.app

# 2. Spotify (Playlist tab is broken without this)
npx supabase secrets set SPOTIFY_CLIENT_ID=xxx SPOTIFY_CLIENT_SECRET=xxx

# 3. AviationStack (Today Tab flight tracking — Prompt 18)
npx supabase secrets set AVIATIONSTACK_API_KEY=xxx

# 4. Enable Distance Matrix API in Google Cloud Console (no key change needed)
# → console.cloud.google.com → APIs & Services → Enable APIs → Distance Matrix API

# 5. Stripe (when UK entity is set up — Prompt 17)
npx supabase secrets set STRIPE_SECRET_KEY=sk_live_... STRIPE_WEBHOOK_SECRET=whsec_... STRIPE_LUXE_PRICE_ID=price_... STRIPE_ATELIER_PRICE_ID=price_...
```

---

## Summary Table

| Key | Status | Priority |
|-----|--------|----------|
| `SUPABASE_URL` / `ANON_KEY` / `SERVICE_ROLE_KEY` / `DB_URL` | ✅ Set | — |
| `OPENAI_API_KEY` | ✅ Set | — |
| `SERPER_API_KEY` | ✅ Set | — |
| `GOOGLE_MAPS_API_KEY` | ✅ Set | Enable Distance Matrix |
| `FIRECRAWL_API_KEY` | ✅ Set | — |
| `SITE_URL` | 🔴 Missing | **Set now** |
| `ALLOWED_ORIGINS` | 🔴 Missing | **Set now** |
| `SPOTIFY_CLIENT_ID` | 🔴 Missing | **Set now** |
| `SPOTIFY_CLIENT_SECRET` | 🔴 Missing | **Set now** |
| `AVIATIONSTACK_API_KEY` | 🔴 Missing | Set for Prompt 18 |
| `STRIPE_SECRET_KEY` | 🔵 Future | Prompt 17 (needs UK entity) |
| `STRIPE_WEBHOOK_SECRET` | 🔵 Future | Prompt 17 |
| `STRIPE_LUXE_PRICE_ID` | 🔵 Future | Prompt 17 |
| `STRIPE_ATELIER_PRICE_ID` | 🔵 Future | Prompt 17 |
| `POSTMARK_API_KEY` | 🔵 Future | Prompt 22 |
| `UNSPLASH_ACCESS_KEY` | 🟡 Optional | Nice to have |
| `VIATOR_API_KEY` | 🟡 Optional | Requires partnership |
| `ASOS_RAPIDAPI_KEY` | 🔵 Future | Prompt 24 |
| `RAKUTEN_API_KEY` | 🔵 Future | Prompt 24 |
