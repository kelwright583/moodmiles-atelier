# Concierge Styled — Current Build Plan
*Working document for autonomous execution*

---

## Status Legend
- ✅ Done
- 🔄 In Progress
- ❌ Not Started
- 🔴 Critical Blocker

---

## Codebase Quick Reference

- **Frontend:** `src/pages/` — page components; `src/components/trip/` — tab components
- **Routing:** `src/App.tsx` — all routes defined here; add new pages here
- **Auth context:** `src/contexts/AuthContext.tsx`
- **Supabase client:** `src/integrations/supabase/client.ts`
- **Edge functions:** `supabase/functions/` — Deno TypeScript
- **Styling:** Tailwind CSS; brand classes: `bg-gradient-champagne`, `font-heading` (Playfair Display), `font-body` (Inter), `glass-card`, `shadow-champagne`
- **Subscription tiers:** `profile.subscription_tier` — values: `"free"`, `"luxe"`, `"atelier"`

---

## Phase 1: Critical Blockers (Must fix before launch)

### 1.1 Onboarding Navigation — Status: ✅ Already Fixed

**Verification:** `src/pages/Onboarding.tsx` lines 54–58 already correctly use `useEffect` for the redirect:
```tsx
useEffect(() => {
  if (!profileLoading && profile?.onboarding_completed) {
    navigate("/dashboard", { replace: true });
  }
}, [profileLoading, profile, navigate]);
```
No action needed here.

---

### 1.2 Google OAuth Redirect — Status: ❌ Needs Supabase Config

**File:** `src/pages/Auth.tsx`

**Current code (lines 55–69):** The `handleGoogleSignIn` function is implemented correctly. It calls `supabase.auth.signInWithOAuth` with `provider: "google"` and `redirectTo: window.location.origin + "/dashboard"`.

**The real problem:** Google OAuth is NOT enabled in the Supabase project. The code works; the Supabase dashboard configuration does not.

**Fix steps (manual — requires browser):**
1. Go to https://supabase.com/dashboard/project/hwykcvpcwpaiotatzise/auth/providers
2. Enable **Google** provider
3. Create a Google OAuth app at https://console.cloud.google.com/
   - Create project → Credentials → OAuth 2.0 Client ID → Web application
   - Authorised JavaScript origins: `https://hwykcvpcwpaiotatzise.supabase.co` and your Netlify URL
   - Authorised redirect URIs: `https://hwykcvpcwpaiotatzise.supabase.co/auth/v1/callback`
4. Copy Client ID and Client Secret into Supabase
5. In `src/pages/Auth.tsx`, update the `redirectTo` to point to `/onboarding` for new sign-ups (currently it goes to `/dashboard` which skips onboarding for Google users):

**Exact fix in `src/pages/Auth.tsx`:**
Change line 61 from:
```tsx
redirectTo: `${window.location.origin}/dashboard`,
```
To:
```tsx
redirectTo: `${window.location.origin}/auth/callback`,
```
Then create `src/pages/AuthCallback.tsx` (new file):
```tsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const AuthCallback = () => {
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { navigate("/auth"); return; }
      // Check if onboarding completed
      supabase.from("profiles")
        .select("onboarding_completed")
        .eq("user_id", session.user.id)
        .single()
        .then(({ data }) => {
          if (data?.onboarding_completed) {
            navigate("/dashboard", { replace: true });
          } else {
            navigate("/onboarding", { replace: true });
          }
        });
    });
  }, [navigate]);
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 rounded-full bg-gradient-champagne animate-pulse" />
    </div>
  );
};
export default AuthCallback;
```
Add route in `src/App.tsx` inside the `<Routes>` block (after the `/auth` route):
```tsx
import AuthCallback from "./pages/AuthCallback";
// ...
<Route path="/auth/callback" element={<AuthCallback />} />
```

**Acceptance criteria:** Google sign-in button on `/auth` page redirects to Google, returns to app, new users land on `/onboarding`, returning users land on `/dashboard`.

---

### 1.3 Create Pricing Page — Status: ❌ Not Started

**New file to create:** `src/pages/Pricing.tsx`

**Route to add in `src/App.tsx`:** Add `import Pricing from "./pages/Pricing";` and `<Route path="/pricing" element={<Pricing />} />` in the public routes section (after the `/reset-password` route, line 82).

**Pricing tiers (from CONCIERGE_STYLED_MASTER.md):**
- **Free:** $0 — 1 trip, text-only outfits, limited packing, no fashion search
- **Luxe:** $14.99/mo or $119/yr — unlimited trips, DALL-E images, fashion search, 5 outfit regenerations/trip
- **Atelier:** $29.99/mo or $249/yr — everything + PDF lookbook, group collaboration, unlimited regenerations

**Page structure to implement in `src/pages/Pricing.tsx`:**
```tsx
import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Crown, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/layout/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
```

**Key sections:**
1. **Hero:** `<h1 className="text-5xl md:text-6xl font-heading">Travel, Styled.</h1>` with subtitle "Choose the membership that fits your journey."
2. **Monthly/Annual toggle:** `useState` for `isAnnual`. Show savings badge "Save 33%" when annual.
3. **Three tier cards:** Use `glass-card rounded-2xl p-8` for each. Mark Luxe as "Most Popular" with `border-primary` highlight.
4. **Feature comparison table:** Full table below the cards.
5. **FAQ section:** 6 questions.
6. **CTA buttons:** Call `supabase.functions.invoke("create-checkout", { body: { plan: "luxe" | "atelier", billing: "monthly" | "annual" } })` then redirect to `data.url`.

**Feature comparison rows for the table:**
| Feature | Free | Luxe | Atelier |
|---------|------|------|---------|
| Active trips | 1 | Unlimited | Unlimited |
| AI outfit suggestions | Text only | Text + Images | Text + Images |
| Outfit regenerations | 1/trip | 5/trip | Unlimited |
| Fashion search | — | 3/trip | 10/trip |
| Packing list | Basic | Full | Full |
| Mood board uploads | 5/trip | Unlimited | Unlimited |
| Group collaboration | — | ✓ | ✓ |
| PDF lookbook export | — | — | ✓ |
| Trip sharing | — | ✓ | ✓ |

**Annual pricing display logic:**
```tsx
const monthlyPrice = isAnnual ? (119 / 12).toFixed(2) : "14.99"; // "9.92" vs "14.99"
const atelierMonthlyPrice = isAnnual ? (249 / 12).toFixed(2) : "29.99";
```

**Acceptance criteria:** Page renders at `/pricing`, all three tiers visible, annual toggle works, "Upgrade to Luxe" button calls `create-checkout` edge function and redirects to Stripe Checkout, page is mobile-responsive.

---

### 1.4 Complete Feature Gating UI — Status: 🔄 Partial

**Current state:** Trip creation blocks at 1 trip for free users (in `src/pages/CreateTrip.tsx`). Subscription upgrade buttons exist in `src/pages/Settings.tsx`. Edge functions partially gate by tier.

**What's missing:**
- No `<UpgradePrompt>` reusable component
- `generate-outfits` and `search-fashion` edge functions return tier errors but the UI doesn't show a nice gate
- No visual lock icons on gated features

**Fix: Create `src/components/UpgradePrompt.tsx`:**
```tsx
import { Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";

interface UpgradePromptProps {
  feature: string;   // e.g. "Fashion search"
  tier: "luxe" | "atelier";  // minimum tier required
  description?: string;
}

export const UpgradePrompt = ({ feature, tier, description }: UpgradePromptProps) => {
  const [loading, setLoading] = useState(false);
  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", { body: { plan: tier } });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  };
  return (
    <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <Crown size={20} className="text-primary" />
      </div>
      <h3 className="text-lg font-heading mb-2">{feature} is a {tier === "luxe" ? "Luxe" : "Atelier"} feature</h3>
      <p className="text-sm text-muted-foreground font-body mb-6 max-w-xs">
        {description || `Upgrade to ${tier === "luxe" ? "Luxe" : "Atelier"} to unlock ${feature.toLowerCase()}.`}
      </p>
      <Button variant="champagne" onClick={handleUpgrade} disabled={loading}>
        {loading ? "Opening..." : `Unlock with ${tier === "luxe" ? "Luxe" : "Atelier"}`}
      </Button>
    </div>
  );
};
```

**Where to use `<UpgradePrompt>`:**
- `src/components/trip/StyleTab.tsx`: When `subscription_tier === "free"` and user tries fashion search, show `<UpgradePrompt feature="Fashion search" tier="luxe" />`
- `src/components/trip/PhotosTab.tsx`: Already has `PHOTO_LIMITS` — add visual indicator when at limit
- Any tab that hits a 403 from an edge function: catch the error and render `<UpgradePrompt>` inline instead of a toast

**Acceptance criteria:** Free users see a branded, non-jarring upgrade prompt (not a raw error toast) when hitting tier limits. UpgradePrompt is used in at least StyleTab and PhotosTab.

---

### 1.5 Legal Pages — Terms of Service & Privacy Policy — Status: ❌ Not Started

**Files to create:**
- `src/pages/Terms.tsx` — renders at `/terms`
- `src/pages/Privacy.tsx` — renders at `/privacy`

**Routes to add in `src/App.tsx`:**
```tsx
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
// In <Routes>:
<Route path="/terms" element={<Terms />} />
<Route path="/privacy" element={<Privacy />} />
```

**Structure for `src/pages/Terms.tsx`:**
```tsx
import Navbar from "@/components/layout/Navbar";
// Standard page wrapper matching app brand
// Sections: 1. Service Description, 2. User Obligations, 3. Subscription Terms,
//           4. Cancellation & Refunds, 5. Intellectual Property,
//           6. Limitation of Liability, 7. Governing Law, 8. Contact
// Key subscription terms to include:
//   - Monthly: cancel anytime, access until period end
//   - Annual: prorated refund within 14 days, no refund after
//   - Cancellation via Stripe Customer Portal at /settings
```

**Structure for `src/pages/Privacy.tsx`:**
```tsx
// Sections: 1. Data We Collect (email, name, trip data, style profile, usage),
//           2. How We Use Data (personalise AI, billing, improve product),
//           3. Third-Party Processors: Supabase (database/auth), Stripe (billing),
//              OpenAI (AI features — trip data sent to API), Google Places (search),
//              Unsplash (images), Firecrawl (web search), PostHog (analytics),
//           4. User Rights (access, correction, deletion, export),
//           5. Data Retention (account data deleted 30 days after account deletion),
//           6. Cookie Policy (essential, analytics — opt-out via cookie banner),
//           7. GDPR / UK GDPR rights
//           8. Contact: [fill in contact email]
```

**Footer links:** Find `src/components/layout/Footer.tsx` or wherever the footer is rendered and add links to `/terms` and `/privacy`. If no Footer component exists, add links to the footer section of `src/pages/Index.tsx`.

**Acceptance criteria:** `/terms` and `/privacy` render without errors, styled consistently with the rest of the app, linked from footer and from the sign-up form in `src/pages/Auth.tsx`.

---

### 1.6 Cookie Consent Banner — Status: ❌ Not Started

**New file:** `src/components/CookieConsent.tsx`

**Logic:**
- Check `localStorage.getItem("cookie_consent")` on mount
- If null, show banner at bottom of page
- "Accept All" → set `localStorage.setItem("cookie_consent", "all")` → hide banner
- "Necessary Only" → set `localStorage.setItem("cookie_consent", "necessary")` → hide banner
- PostHog (when integrated) should only initialise if `cookie_consent === "all"`

**Implementation:**
```tsx
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

export const CookieConsent = () => {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!localStorage.getItem("cookie_consent")) setVisible(true);
  }, []);
  if (!visible) return null;
  const accept = (level: "all" | "necessary") => {
    localStorage.setItem("cookie_consent", level);
    setVisible(false);
  };
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6">
      <div className="max-w-2xl mx-auto glass-card rounded-2xl p-5 border border-border flex flex-col md:flex-row items-start md:items-center gap-4">
        <p className="text-sm font-body text-muted-foreground flex-1">
          We use cookies for essential functionality and analytics to improve your experience.
        </p>
        <div className="flex gap-2 flex-shrink-0">
          <Button variant="champagne-outline" size="sm" onClick={() => accept("necessary")}>
            Necessary Only
          </Button>
          <Button variant="champagne" size="sm" onClick={() => accept("all")}>
            Accept All
          </Button>
        </div>
      </div>
    </div>
  );
};
```

**Where to add it:** In `src/App.tsx`, add `<CookieConsent />` inside the `<BrowserRouter>` block alongside `<FloatingActionButton />` and `<InstallPrompt />`.

**Acceptance criteria:** Banner appears on first visit, consent persisted to localStorage, banner does not reappear after consent given.

---

### 1.7 GDPR: Export & Delete Account — Status: ❌ Not Started

**Edge functions needed:**
- `supabase/functions/export-user-data/index.ts` — collects all data for a user and returns as JSON
- `supabase/functions/delete-user-data/index.ts` — cancels Stripe sub, deletes all records, deletes auth user

**UI changes in `src/pages/Settings.tsx`:**

Add a new "Account" section at the bottom of the Settings page (before the sign-out button). Add these two buttons:

1. **Export Data button:**
```tsx
const handleExportData = async () => {
  try {
    const { data, error } = await supabase.functions.invoke("export-user-data", { body: {} });
    if (error) throw error;
    // Trigger download
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "concierge-styled-data.json";
    a.click();
    URL.revokeObjectURL(url);
  } catch (err: any) {
    toast({ title: "Error", description: err.message, variant: "destructive" });
  }
};
```

2. **Delete Account button:** Opens a confirmation dialog (use the existing `AlertDialog` from shadcn). Requires password re-entry. On confirm, calls `supabase.functions.invoke("delete-user-data", { body: { password } })`, then calls `supabase.auth.signOut()` and navigates to `/`.

**`export-user-data` edge function structure:**
```ts
// Collect from tables: profiles, trips, trip_events, outfit_suggestions,
// activity_suggestions, packing_items, board_items, weather_data
// Return as: { profile, trips: [{ ...trip, events, outfits, activities, packing, board }] }
```

**`delete-user-data` edge function structure:**
```ts
// 1. Cancel Stripe subscription via stripe.subscriptions.cancel(sub_id)
// 2. DELETE from stripe_subscriptions WHERE user_id = ?
// 3. DELETE from stripe_customers WHERE user_id = ?
// 4. DELETE from all user tables (trips cascade-deletes child records)
// 5. Delete storage files: avatars/{user_id}/*, board-images/{user_id}/*, outfit-images/{user_id}/*
// 6. Delete auth user: supabase.auth.admin.deleteUser(user_id)
```

**Acceptance criteria:** User can download a JSON file of all their data. User can delete their account, which removes all data and cancels Stripe subscription.

---

## Phase 2: Polish & UX

### 2.1 Post-Upgrade Celebration Modal — Status: ❌ Not Started

**Where to implement:** In `src/pages/Settings.tsx`, after Stripe redirects back (Stripe appends `?session_id=xxx` to the success URL).

**Logic:** On component mount, check `new URLSearchParams(window.location.search).get("session_id")`. If present, show a success modal: "Welcome to Luxe — you're now impeccably equipped." with confetti animation. Clear the param from URL using `window.history.replaceState`.

**File:** `src/pages/Settings.tsx` — add a `useEffect` at the top:
```tsx
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  if (params.get("session_id")) {
    // Show celebration modal
    setShowCelebration(true);
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}, []);
```

Create `src/components/UpgradeCelebration.tsx` — a full-screen modal overlay with champagne gradient animation.

---

### 2.2 Trip Hero Image — Status: ✅ Already Implemented

**Verification:** `src/pages/TripDetail.tsx` lines 77–94, the `TripHero` component already checks `trip.image_url` and renders it with `animate-ken-burns` + gradient overlay. No action needed.

---

### 2.3 crossOrigin Fix for Trip Card Download — Status: ❌ Not Started

**File:** `src/pages/TripDetail.tsx`

**Problem:** `html-to-image` (the `toPng` call used for trip card sharing) fails on cross-origin images (destination hero, avatar).

**Fix:** Find the `handleDownloadCard` function in `TripDetail.tsx` (it uses `toPng(tripCardRef.current, ...)`). Add `fetchRequestInit` option:
```tsx
const dataUrl = await toPng(tripCardRef.current!, {
  cacheBust: true,
  fetchRequestInit: { cache: "no-cache" },
  // If still failing, use useCORS or proxy images through a Supabase function
});
```

For destination images fetched from Unsplash: ensure the `<img>` tag has `crossOrigin="anonymous"`. In `TripHero`, add `crossOrigin="anonymous"` to the `<img>` at line 82.

---

### 2.4 Empty States Improvements — Status: ❌ Not Started

**Files to update:**
- `src/pages/Dashboard.tsx` — empty trip list state
- `src/components/trip/StyleTab.tsx` — no outfits yet
- `src/components/trip/PackingTab.tsx` — no items yet
- `src/components/trip/BoardTab.tsx` — no board items

**Pattern for each empty state:**
```tsx
<div className="flex flex-col items-center justify-center py-16 px-6 text-center">
  <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center mb-5">
    <[RelevantIcon] size={22} className="text-muted-foreground/50" />
  </div>
  <h3 className="text-lg font-heading mb-2">[Aspirational heading]</h3>
  <p className="text-sm text-muted-foreground font-body mb-6 max-w-xs">[Helpful description]</p>
  <Button variant="champagne" size="sm" onClick={[relevant action]}>
    [Single clear CTA]
  </Button>
</div>
```

**Example copy for Dashboard empty state:**
- Heading: "Your first journey awaits"
- Body: "Tell us where you're going — we'll handle the style."
- CTA: "Plan a Trip" → navigate to `/create-trip`

---

### 2.5 Mobile Polish — Status: 🔄 Partial

**Files most in need of mobile review:**
- `src/pages/Index.tsx` — landing page (check hero on 375px)
- `src/pages/TripDetail.tsx` — tab bar on mobile (horizontal scroll)
- `src/components/trip/StyleTab.tsx` — outfit grid layout
- `src/pages/Pricing.tsx` (new) — ensure tier cards stack vertically on mobile

**Pattern for tab bar on mobile:** Ensure the tab bar uses `overflow-x-auto scrollbar-hide` and each tab has `flex-shrink-0`.

---

## Phase 3: Missing Tabs (All tabs exist but some need content)

### 3.1 Today Tab — Status: ✅ Implemented

**File:** `src/components/trip/TodayTab.tsx` — fully implemented with countdown timers, today's events, weather, and outfit suggestion. Only renders for active (travel mode) trips.

**Note:** The tab only shows in `TRAVEL_PRIMARY_TABS` in `TripDetail.tsx` — this is correct.

---

### 3.2 Photos Tab — Status: ✅ Implemented

**File:** `src/components/trip/PhotosTab.tsx` — implements photo upload with tier-based limits (`PHOTO_LIMITS`), gallery view, and download. Uses `trip_photos` table.

**Note:** Only shown for `active` and `completed` trips. This is correct per the tab constants in `TripDetail.tsx`.

---

### 3.3 Expenses Tab — Status: ✅ Implemented

**File:** `src/components/trip/ExpensesTab.tsx` — category-based expense tracking with `TripExpense` type, currency support, and per-person splitting. Uses `trip_expenses` table.

**Potential gap:** Verify `trip_expenses` table exists in Supabase. If not, the SQL migration needs to create it.

---

### 3.4 Memories Tab — Status: ✅ Implemented

**File:** `src/components/trip/MemoriesTab.tsx` — photo slideshow export with three frame styles (minimal, editorial, clean). Uses `html-to-image` for download. Requires `trip_photos` to be populated.

**Potential gap:** Same `crossOrigin` fix applies here as in 2.3.

---

## Phase 4: Performance

### 4.1 Code Splitting — Status: 🔄 Partial

**Current state:** TripDetail already uses `React.lazy` for all tab components (lines 19–31 in `TripDetail.tsx`). However, the page-level routes in `App.tsx` are imported statically.

**Fix in `src/App.tsx`:** Convert page imports to lazy:
```tsx
// Replace static imports like:
import Dashboard from "./pages/Dashboard";
// With:
const Dashboard = lazy(() => import("./pages/Dashboard"));
// etc. for all page components
```
Add `import { lazy, Suspense } from "react";` and wrap routes in `<Suspense fallback={<LoadingSpinner />}>`.

**Note:** Keep `Index`, `Auth`, and `NotFound` as static imports (they're needed immediately).

---

### 4.2 Image Optimisation — Status: ❌ Not Started

**Files to update:**
- All `<img>` tags for below-fold images: add `loading="lazy"`
- Destination images from Unsplash: append `?w=800&q=80&fm=webp` to URL
- Trip card images on Dashboard: already use Supabase storage — add transform param `?width=400&quality=75`

**In `src/pages/Dashboard.tsx`:** Find where `trip.image_url` is rendered in trip cards and add URL transform + `loading="lazy"`.

---

### 4.3 Service Worker — Status: ❌ Not Started

**Check:** `public/sw.js` may already exist (PWA was mentioned as working in the overview). Verify with `ls public/`.

If not present:
- Add `vite-plugin-pwa` to `package.json`: `npm install -D vite-plugin-pwa`
- Configure in `vite.config.ts`:
```ts
import { VitePWA } from 'vite-plugin-pwa'
// In plugins:
VitePWA({
  registerType: 'autoUpdate',
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
    runtimeCaching: [
      { urlPattern: /^https:\/\/fonts\.googleapis\.com/, handler: 'CacheFirst' },
      { urlPattern: /^https:\/\/.*\.supabase\.co\/rest/, handler: 'NetworkFirst' },
    ]
  }
})
```

---

## Phase 5: DevOps

### 5.1 CI/CD Pipeline — Status: ❌ Not Started

**New file:** `.github/workflows/deploy.yml`

```yaml
name: Deploy
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run build
      - name: Deploy to Netlify (production)
        if: github.ref == 'refs/heads/main'
        uses: netlify/actions/cli@master
        with:
          args: deploy --prod --dir=dist
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

**Secrets to add in GitHub repo settings:**
- `NETLIFY_AUTH_TOKEN` — from Netlify user settings
- `NETLIFY_SITE_ID` — from Netlify site settings

---

### 5.2 Staging Environment — Status: ❌ Not Started

**Steps:**
1. Create a new Supabase project named "concierge-styled-staging"
2. Run `supabase/FULL_SETUP.sql` in staging project
3. Create `.env.staging` with staging Supabase URL and anon key
4. Create a second Netlify site (or use branch deploys) for staging
5. Set `NETLIFY_SITE_ID_STAGING` in GitHub secrets and add a deploy step for the `develop` branch

---

### 5.3 Uptime Monitoring — Status: ❌ Not Started

**Quick setup with UptimeRobot (free tier):**
1. Go to uptimerobot.com → Add New Monitor
2. Monitor type: HTTPS
3. URL: your Netlify production URL
4. Check interval: 5 minutes
5. Alert contacts: email

Also monitor the Supabase edge function health (create a simple `ping` edge function that returns `{ ok: true }` and monitor that URL).

---

## Phase 6: Growth Features

### 6.1 Promo Codes / Founding Member Discount — Status: ❌ Not Started

**Stripe setup (manual):** Create a coupon in Stripe dashboard (e.g. `FOUNDING50` = 50% off first 3 months).

**UI in `src/pages/Pricing.tsx`:** Add a promo code input field on the pricing page:
```tsx
const [promoCode, setPromoCode] = useState("");
// Pass promoCode to create-checkout:
supabase.functions.invoke("create-checkout", { body: { plan, billing, promo_code: promoCode } })
```

**Edge function `supabase/functions/create-checkout/index.ts`:** Add `discounts` to the Stripe Checkout session if `promo_code` is provided:
```ts
if (body.promo_code) {
  sessionParams.discounts = [{ coupon: body.promo_code }];
}
```

---

### 6.2 Referral / VIP Links — Status: ❌ Not Started

**Database:** A `referrals` table needs to exist (check if it's in `supabase/FULL_SETUP.sql`). If not, create a migration:
```sql
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
  referred_email TEXT,
  referred_user_id UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  reward_granted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own referrals" ON referrals FOR SELECT USING (referrer_user_id = auth.uid());
```

**UI in `src/pages/Settings.tsx`:** Add "Invite a Friend" section:
```tsx
// Generate referral URL: window.location.origin + "/auth?ref=" + profile.handle
// Copy-to-clipboard button
// Show stats: X friends invited, X joined
```

**Signup logic in `src/pages/Auth.tsx`:** On sign-up, check `new URLSearchParams(window.location.search).get("ref")`. If present, after sign-up success, call a `process-referral` edge function with the referrer's handle.

---

### 6.3 Analytics Instrumentation — Status: ❌ Not Started

**Package to install:** `npm install posthog-js`

**Setup file:** `src/lib/analytics.ts`
```ts
import posthog from 'posthog-js';

export const initAnalytics = () => {
  const consent = localStorage.getItem("cookie_consent");
  if (consent === "all" && import.meta.env.VITE_POSTHOG_KEY) {
    posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
      api_host: 'https://app.posthog.com',
      capture_pageview: false, // We'll track manually
    });
  }
};

export const trackEvent = (event: string, properties?: Record<string, unknown>) => {
  if (typeof posthog !== 'undefined') posthog.capture(event, properties);
};

export const identifyUser = (userId: string, properties?: Record<string, unknown>) => {
  if (typeof posthog !== 'undefined') posthog.identify(userId, properties);
};
```

**Key events to track** (add these calls at the relevant code locations):
- `sign_up` → in `src/pages/Auth.tsx`, after successful `supabase.auth.signUp()`
- `sign_in` → in `src/pages/Auth.tsx`, after successful `supabase.auth.signInWithPassword()`
- `onboarding_completed` → in `src/pages/Onboarding.tsx`, after `handleFinish()` succeeds
- `trip_created` → in `src/pages/CreateTrip.tsx`, after trip insert
- `outfit_generated` → in `src/components/trip/StyleTab.tsx`, after `generate-outfits` call
- `subscription_started` → triggered by Stripe webhook (log in edge function), or detect via `session_id` param in Settings
- `upgrade_prompt_seen` → in `src/components/UpgradePrompt.tsx`, on mount
- `upgrade_clicked` → in `src/components/UpgradePrompt.tsx`, on button click

**Add to `src/App.tsx`:**
```tsx
import { initAnalytics } from "./lib/analytics";
// At top of App component (or in a useEffect in AuthProvider):
initAnalytics();
```

**Add `VITE_POSTHOG_KEY` to `.env` and Netlify environment variables.**

---

## Appendix A: Missing Routes Summary

Routes that need to be added to `src/App.tsx`:

```tsx
// These are all MISSING and need to be added:
<Route path="/auth/callback" element={<AuthCallback />} />  // Phase 1.2
<Route path="/pricing" element={<Pricing />} />              // Phase 1.3
<Route path="/terms" element={<Terms />} />                  // Phase 1.5
<Route path="/privacy" element={<Privacy />} />              // Phase 1.5
```

---

## Appendix B: Edge Functions Status

| Function | File | Status |
|---------|------|--------|
| `generate-outfits` | `supabase/functions/generate-outfits/` | ✅ Deployed |
| `search-fashion` | `supabase/functions/search-fashion/` | ✅ Deployed |
| `suggest-activities` | `supabase/functions/suggest-activities/` | ✅ Deployed |
| `suggest-packing` | `supabase/functions/suggest-packing/` | ✅ Deployed |
| `fetch-destination-image` | `supabase/functions/fetch-destination-image/` | ✅ Deployed |
| `google-places` | `supabase/functions/google-places/` | ✅ Deployed |
| `fetch-weather` | `supabase/functions/fetch-weather/` | ✅ Deployed |
| `fetch-trends` | `supabase/functions/fetch-trends/` | ✅ Deployed |
| `create-checkout` | `supabase/functions/create-checkout/` | ✅ Deployed |
| `create-portal` | `supabase/functions/create-portal/` | ✅ Deployed |
| `stripe-webhook` | `supabase/functions/stripe-webhook/` | ✅ Deployed |
| `complete-onboarding` | `supabase/functions/complete-onboarding/` | ✅ Deployed |
| `check-handle` | `supabase/functions/check-handle/` | ✅ Deployed |
| `export-user-data` | `supabase/functions/export-user-data/` | ❌ Needs creating |
| `delete-user-data` | `supabase/functions/delete-user-data/` | ❌ Needs creating |

---

## Appendix C: Environment Variables Checklist

Variables that must exist in `.env` (and Netlify environment settings):

| Variable | Used For | Status |
|----------|---------|--------|
| `VITE_SUPABASE_URL` | Supabase connection | Must exist |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key | Must exist |
| `VITE_SUPABASE_PROJECT_ID` | Project ref | Must exist |
| `VITE_SPOTIFY_CLIENT_ID` | Spotify OAuth | Optional |
| `VITE_POSTHOG_KEY` | Analytics | ❌ Add when PostHog created |

Supabase Edge Function secrets (set in Supabase Dashboard → Project Settings → Edge Functions → Secrets):

| Secret | Used For |
|--------|---------|
| `OPENAI_API_KEY` | All AI features |
| `GOOGLE_MAPS_API_KEY` | Places autocomplete |
| `UNSPLASH_ACCESS_KEY` | Destination images |
| `STRIPE_SECRET_KEY` | Billing |
| `STRIPE_WEBHOOK_SECRET` | Webhook verification |
| `FIRECRAWL_API_KEY` | Web scraping for fashion/trends |

---

## Appendix D: Database Tables That May Need Creating

These tables are referenced in the code but may not exist in the Supabase schema. Verify in the SQL editor with `\dt` or check the Dashboard:

| Table | Referenced In | Notes |
|-------|-------------|-------|
| `trip_expenses` | `ExpensesTab.tsx` | Expense tracking |
| `trip_photos` | `PhotosTab.tsx`, `MemoriesTab.tsx` | Photo uploads |
| `trip_collaborators` | `ExpensesTab.tsx` | Multi-user trips |
| `spotify_connections` | `Settings.tsx` | Spotify OAuth tokens |
| `imported_bookings` | `Settings.tsx` | Email booking import |
| `profiles_handle_history` | `Settings.tsx` | Handle change audit |
| `stripe_customers` | `stripe-webhook` | Stripe customer mapping |
| `stripe_subscriptions` | `stripe-webhook` | Subscription records |
| `referrals` | Phase 6.2 | Referral programme |

Run `supabase/FULL_SETUP.sql` in a fresh project to see what's included. If a table is missing, create a migration in `supabase/migrations/`.

---

## Appendix E: Known Bugs From Codebase Audit

| Bug | File | Fix |
|-----|------|-----|
| Delete trip "Keep inspiration" doesn't work (CASCADE deletes child records) | `src/components/trip/TripDeleteDialog.tsx` | Remove CASCADE from `outfit_suggestions` and `board_items` FK. Manually handle deletion logic in the edge function or client. |
| PlacesAutocomplete for origin city doesn't save lat/lng | `src/pages/CreateTrip.tsx` | Find `handleOriginSelect` — ensure it calls `setOriginLat(place.geometry.location.lat())` and `setOriginLng(place.geometry.location.lng())`. |
| Large JS bundle (~770KB, needs splitting) | Build output | Addressed in Phase 4.1 above |
| 19 npm audit vulnerabilities | `package.json` | Run `npm audit fix` — fix all auto-fixable. Document any that require major version bumps. |
| TypeScript strict mode disabled | `tsconfig.app.json` | Enable `"strict": true`. Fix resulting type errors one by one. |

---

*Last updated: 2026-03-15*
*Build plan version: 1.0*
