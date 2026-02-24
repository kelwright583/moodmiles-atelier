# MoodMiles Atelier — Sprint Execution Plan

> **Programme Duration:** 12 weeks (6 sprints of 2 weeks each)
> **Start Date:** Week of 24 February 2026
> **Launch Target:** MVP1 production-ready by end of Sprint 4 (Week 8)
> **Post-Launch Optimisation:** Sprints 5–6
> **MVP2 (Native App + B2B):** Begins Sprint 7+ (separate planning)

---

## Programme Overview

```
Sprint 1 (Wk 1–2)  ▓▓▓▓▓▓▓▓  Security, Auth & Billing Foundation
Sprint 2 (Wk 3–4)  ▓▓▓▓▓▓▓▓  Brand Elevation & Landing Page
Sprint 3 (Wk 5–6)  ▓▓▓▓▓▓▓▓  Subscription Gating, Onboarding & Legal
Sprint 4 (Wk 7–8)  ▓▓▓▓▓▓▓▓  Polish, Performance & Production Launch
Sprint 5 (Wk 9–10) ▓▓▓▓▓▓▓▓  Growth, Affiliate & Analytics
Sprint 6 (Wk 11–12)▓▓▓▓▓▓▓▓  B2B Foundation & MVP2 Prep
```

### Milestones

| Milestone | Target | Sprint |
|-----------|--------|--------|
| App is secure and billable | End of Week 2 | Sprint 1 |
| Landing page feels luxury | End of Week 4 | Sprint 2 |
| Users can subscribe and be gated | End of Week 6 | Sprint 3 |
| **MVP1 PRODUCTION LAUNCH** | **End of Week 8** | **Sprint 4** |
| Growth engine running | End of Week 10 | Sprint 5 |
| B2B advertising MVP | End of Week 12 | Sprint 6 |

### Workstream Legend

| Tag | Workstream | Colour |
|-----|-----------|--------|
| `SEC` | Security & Infrastructure | Red |
| `AUTH` | Authentication & Identity | Blue |
| `BILL` | Billing & Subscriptions | Green |
| `BRAND` | Brand, Design & UX | Purple |
| `FEAT` | Features & Functionality | Orange |
| `LEGAL` | Legal & Compliance | Grey |
| `PERF` | Performance & Optimisation | Teal |
| `OPS` | DevOps & Monitoring | Brown |
| `GROW` | Growth & Analytics | Pink |
| `B2B` | Advertising & Partnerships | Gold |
| `BUG` | Bug Fixes | Black |

---

## Sprint 1: Lock the Foundation

**Dates:** 24 Feb – 9 Mar 2026
**Theme:** Make the app secure, authenticated properly, and ready to accept payments
**Goal:** Nobody can abuse the APIs, users can reset passwords and sign in with Google, Stripe is integrated

### Sprint 1 — Tickets

#### 1.1 Security Hardening

| # | Ticket | Tag | Priority | Est | Acceptance Criteria |
|---|--------|-----|----------|-----|-------------------|
| 1.1.1 | Restrict CORS to production domain across all 8 edge functions | `SEC` | P0 | 2h | All edge functions only accept requests from `moodmiles.com` and `localhost:8080`. Wildcard `*` removed. OPTIONS preflight returns correct headers. |
| 1.1.2 | Add Authorization header validation to `fetch-trends` and `google-places` | `SEC` | P0 | 2h | Both functions return 401 if no valid Supabase JWT is provided. Anonymous calls rejected. |
| 1.1.3 | Add Zod input validation to all 8 edge functions | `SEC` | P0 | 6h | Every edge function validates request body with Zod schema. Invalid inputs return 400 with descriptive error. No raw user input passed to external APIs without validation. |
| 1.1.4 | Add per-user rate limiting infrastructure | `SEC` | P0 | 6h | New `api_usage` table tracks calls per user per function. Rate limit check runs before expensive operations. Returns 429 with retry-after header when exceeded. Default limits: 50 calls/day per function per user. |
| 1.1.5 | Run `npm audit fix` and resolve vulnerabilities | `SEC` | P1 | 2h | Zero high-severity vulnerabilities. Moderate vulnerabilities documented if unfixable. |
| 1.1.6 | Enable TypeScript strict mode | `SEC` | P1 | 6h | `tsconfig.app.json` has `strict: true`. All type errors resolved. Build succeeds clean. |

#### 1.2 Authentication

| # | Ticket | Tag | Priority | Est | Acceptance Criteria |
|---|--------|-----|----------|-----|-------------------|
| 1.2.1 | Implement password reset flow | `AUTH` | P0 | 4h | "Forgot password?" link on Auth page. Sends reset email via Supabase. User clicks link → lands on reset form → sets new password → redirected to dashboard. Branded email template. |
| 1.2.2 | Add Google OAuth sign-in | `AUTH` | P0 | 4h | "Continue with Google" button on Auth page. Google OAuth configured in Supabase. Successful sign-in creates profile via trigger. Redirects to dashboard. |
| 1.2.3 | Enforce email verification before dashboard access | `AUTH` | P1 | 3h | Unverified users see "Please verify your email" screen. Resend verification button. Only verified users access protected routes. |

#### 1.3 Billing Foundation (Stripe)

| # | Ticket | Tag | Priority | Est | Acceptance Criteria |
|---|--------|-----|----------|-----|-------------------|
| 1.3.1 | Create Stripe account + configure products and prices | `BILL` | P0 | 2h | Stripe account active. Three products created: Free (no price), Luxe ($14.99/mo, $119/yr), Atelier ($29.99/mo, $249/yr). Test mode prices ready. |
| 1.3.2 | Build `create-checkout` edge function | `BILL` | P0 | 4h | Accepts `price_id` and `user_id`. Creates Stripe Checkout session with subscription mode. Returns checkout URL. Success/cancel URLs configured. Metadata includes user_id for webhook matching. |
| 1.3.3 | Build `stripe-webhook` edge function | `BILL` | P0 | 6h | Handles: `checkout.session.completed` (create subscription record, update `subscription_tier`), `customer.subscription.updated` (tier changes), `customer.subscription.deleted` (downgrade to free). Webhook signature verification. Idempotent processing. |
| 1.3.4 | Build `create-portal` edge function | `BILL` | P0 | 3h | Creates Stripe Customer Portal session for managing subscription. User can upgrade, downgrade, cancel, update payment method. Returns portal URL. |
| 1.3.5 | Create database tables: `stripe_customers`, `stripe_subscriptions` | `BILL` | P0 | 2h | Tables created with RLS. `stripe_customers` links `user_id` to `stripe_customer_id`. `stripe_subscriptions` tracks status, tier, period dates. Migration file created. |
| 1.3.6 | Wire Stripe into Settings page (subscription management) | `BILL` | P1 | 4h | Settings page shows current tier. "Manage Subscription" button opens Stripe Portal. Visual distinction between Free/Luxe/Atelier. |

#### 1.4 Bug Fixes

| # | Ticket | Tag | Priority | Est | Acceptance Criteria |
|---|--------|-----|----------|-----|-------------------|
| 1.4.1 | Fix delete trip CASCADE vs "Keep" logic | `BUG` | P1 | 3h | Remove CASCADE from outfit_suggestions and board_items foreign keys. Delete function manually handles "keep" vs "delete all" based on user selection in TripDeleteDialog. |
| 1.4.2 | Decide on CapsuleTab: integrate properly or remove | `BUG` | P1 | 2h | Decision made and implemented. If keeping: CapsuleTab properly wired with wardrobe_items CRUD. If removing: component and table cleaned up. |
| 1.4.3 | Fix origin city lat/lng not being set in CreateTrip | `BUG` | P1 | 1h | `handleOriginSelect` in CreateTrip extracts and stores latitude/longitude from Places API response for origin city. |

#### 1.5 Monitoring

| # | Ticket | Tag | Priority | Est | Acceptance Criteria |
|---|--------|-----|----------|-----|-------------------|
| 1.5.1 | Integrate Sentry for error monitoring | `OPS` | P0 | 3h | Sentry SDK installed. Error boundary wraps app. Unhandled exceptions, rejected promises, and edge function errors reported. Source maps uploaded on build. Environment tags (dev/staging/prod). |
| 1.5.2 | Integrate PostHog for product analytics | `OPS` | P1 | 3h | PostHog SDK installed. Page views tracked automatically. Key events identified and tracked: sign_up, sign_in, trip_created, outfit_generated, subscription_started. User identification on auth. |

### Sprint 1 — Summary

| Metric | Value |
|--------|-------|
| Total tickets | 17 |
| Total estimated hours | ~61h |
| P0 tickets | 12 |
| P1 tickets | 5 |
| Key deliverable | Secure, authenticated, billable app with monitoring |

### Sprint 1 — Definition of Done

- [ ] All 8 edge functions have CORS restricted and input validation
- [ ] Rate limiting prevents API abuse
- [ ] Users can reset password and sign in with Google
- [ ] Stripe Checkout creates subscriptions
- [ ] Stripe webhooks update user tier
- [ ] Stripe Portal lets users manage billing
- [ ] Sentry captures errors in production
- [ ] PostHog tracks key user events
- [ ] All known bugs triaged or fixed
- [ ] TypeScript strict mode enabled, build clean

---

## Sprint 2: Elevate the Brand

**Dates:** 10 Mar – 23 Mar 2026
**Theme:** Make every pixel feel luxury — the landing page is the front door
**Goal:** Landing page redesign complete, colour temperature warmed, brand feels elite

### Sprint 2 — Tickets

#### 2.1 Colour & Design System

| # | Ticket | Tag | Priority | Est | Acceptance Criteria |
|---|--------|-----|----------|-----|-------------------|
| 2.1.1 | Warm the colour temperature across the entire app | `BRAND` | P0 | 4h | CSS variables updated: backgrounds shift from blue-black (`220 15%`) to warm black (`30 8%`). All pages visually verified. Champagne accents remain. Text shifts from cool white to cream. See Master Roadmap §8.2 for exact HSL values. |
| 2.1.2 | Refine typography system | `BRAND` | P1 | 3h | Heading letter-spacing increased 0.01em for editorial feel. Italic Playfair used only for emphasis words (not full headings). Font preloading added (`<link rel="preload">`). `font-display: swap` on both fonts. |
| 2.1.3 | Create champagne shimmer skeleton loading component | `BRAND` | P1 | 3h | Reusable `<ShimmerSkeleton>` component. Warm champagne gradient animation (not grey pulse). Used across Dashboard trip cards, TripDetail tab content, and any loading state. |
| 2.1.4 | Upgrade toast/notification styling | `BRAND` | P2 | 2h | Toast notifications match brand. Warm background, champagne accent border. Slide-in animation from top-right. Success/error/info variants all branded. |

#### 2.2 Landing Page Redesign

| # | Ticket | Tag | Priority | Est | Acceptance Criteria |
|---|--------|-----|----------|-----|-------------------|
| 2.2.1 | Source and integrate premium hero imagery | `BRAND` | P0 | 4h | High-resolution editorial image or video loop sourced (licensed from Artgrid/Stocksy/Getty Premium or free high-quality Unsplash). Shows a styled person in an aspirational travel setting. Warm, golden tones. Minimum 1920px wide. |
| 2.2.2 | Redesign hero section | `BRAND` | P0 | 6h | Full-bleed 100vh hero. Subtle warm vignette (not heavy overlay). Ken Burns slow zoom effect on image (or video loop). Copy refined per Master Roadmap §9.4. CTA changed to "Request Early Access" or "Join the Membership". Scroll indicator (champagne line). Navbar transparent on hero, solid on scroll. |
| 2.2.3 | Build social proof section | `BRAND` | P0 | 4h | Horizontal bar below hero. Either: (a) "As featured in" with press/brand logos (placeholder if no real press yet) or (b) "Join [X] members styling their journeys" with member count. Subtle entrance animation. |
| 2.2.4 | Redesign features section (editorial layout) | `BRAND` | P0 | 6h | Replace 3-column icon grid with alternating full-width editorial layout: large image left + text right, then reversed. Parallax scroll effect on images. Three features: Destination Intelligence, Climate-Aware Capsules, Packing Optimisation. Premium photography for each. |
| 2.2.5 | Redesign destinations section (horizontal carousel) | `BRAND` | P1 | 5h | Replace static grid with horizontal scroll carousel. Oversized 3:4 aspect ratio cards. Subtle parallax on scroll. Editorial photography (fashion + travel, not tourism stock). Hover: reveal trend text with fade animation. Section header: "Trending Amongst Members". |
| 2.2.6 | Build "How It Works" section | `BRAND` | P1 | 4h | 3-step visual: (1) "Tell us where you're going" → (2) "We style it" → (3) "Arrive impeccably". Device mockup or app screenshots showing the actual product. Scroll-triggered step-by-step reveal animation. |
| 2.2.7 | Build testimonial section | `BRAND` | P1 | 3h | Single large editorial-style quote. Photo of the person, name, credential. Placeholder content for now: "I never travel without checking Moodmiles first." Elegant typography, centred layout, warm background. |
| 2.2.8 | Build membership preview section | `BRAND` | P0 | 5h | Two elegant tier cards (Luxe and Atelier). Not a SaaS pricing grid — editorial luxury style. Key features listed. "Founding member pricing" badge. CTA buttons linking to checkout. Annual pricing prominently displayed. |
| 2.2.9 | Redesign footer | `BRAND` | P1 | 3h | Full footer with: brand story (one sentence), navigation links (About, Pricing, Privacy, Terms, Contact), social links (Instagram, Pinterest icons), newsletter email signup input, copyright. Warm border-top, not stark. |
| 2.2.10 | Add parallax and scroll-triggered animations throughout | `BRAND` | P1 | 4h | Framer Motion `useScroll` + `useTransform` for parallax on images. `whileInView` with stagger for section reveals. Smooth scroll behaviour. No janky transitions — everything 60fps. |

#### 2.3 Dashboard Personalisation

| # | Ticket | Tag | Priority | Est | Acceptance Criteria |
|---|--------|-----|----------|-----|-------------------|
| 2.3.1 | Personalise dashboard greeting | `BRAND` | P0 | 3h | "Welcome back, [Name]" with user's avatar next to it. Falls back to "Welcome back" if no name set. Time-aware: "Good morning/afternoon/evening, [Name]". Subscription tier badge shown subtly (e.g. "Luxe Member"). |
| 2.3.2 | Improve empty states | `BRAND` | P1 | 3h | Empty trip list: editorial image + "Your first journey awaits" + CTA. Style profile aware: if no style tags set, prompt "Tell us your style" linking to Settings. Each empty state feels like an invitation, not a void. |
| 2.3.3 | Add trip card hover enhancements | `BRAND` | P2 | 2h | Trip cards on dashboard: subtle scale on hover (1.01), champagne glow shadow, image slight zoom. Smooth 500ms transitions. Feels tactile and premium. |

### Sprint 2 — Summary

| Metric | Value |
|--------|-------|
| Total tickets | 16 |
| Total estimated hours | ~64h |
| P0 tickets | 8 |
| P1 tickets | 6 |
| P2 tickets | 2 |
| Key deliverable | Luxury landing page, warm brand, personalised dashboard |

### Sprint 2 — Definition of Done

- [ ] Landing page looks and feels like a luxury membership platform
- [ ] Hero uses premium imagery with warm vignette (not murky overlay)
- [ ] Social proof, testimonials, and "How It Works" sections built
- [ ] Membership/pricing preview section on landing page
- [ ] Colour temperature warmed across entire app
- [ ] Dashboard greets user by name with tier badge
- [ ] Empty states feel editorial, not empty
- [ ] Footer has full navigation, social, and newsletter
- [ ] All animations run at 60fps, no jank
- [ ] Mobile responsive on all new sections

---

## Sprint 3: Gate, Onboard & Legalise

**Dates:** 24 Mar – 6 Apr 2026
**Theme:** Users hit a paywall, new users get onboarded, legal bases covered
**Goal:** Subscription gating enforced, onboarding wizard complete, ToS + Privacy live

### Sprint 3 — Tickets

#### 3.1 Subscription Gating

| # | Ticket | Tag | Priority | Est | Acceptance Criteria |
|---|--------|-----|----------|-----|-------------------|
| 3.1.1 | Build `check-subscription` utility for edge functions | `BILL` | P0 | 4h | Shared utility that edge functions import. Accepts user_id, returns `{ tier, canUse, remaining }`. Checks `stripe_subscriptions` + `api_usage` tables. Returns tier-appropriate limits. |
| 3.1.2 | Gate `generate-outfits` by tier | `BILL` | P0 | 3h | Free: 3 text-only suggestions (no DALL-E), 1 generation per trip. Luxe: 15 suggestions with images, 5 regenerations per trip. Atelier: 15 suggestions, 10 regenerations. Returns upgrade prompt JSON when limit hit. |
| 3.1.3 | Gate `search-fashion` by tier | `BILL` | P0 | 2h | Free: not available (return 403 with upgrade message). Luxe: 3 searches per trip. Atelier: 10 per trip. |
| 3.1.4 | Gate `suggest-activities` by tier | `BILL` | P0 | 2h | Free: 5 activities, 1 generation per trip. Luxe: full results, 5 regenerations. Atelier: unlimited. |
| 3.1.5 | Gate `suggest-packing` by tier | `BILL` | P0 | 2h | Free: 1 generation per trip. Luxe: 5 per trip. Atelier: unlimited. |
| 3.1.6 | Gate trip creation by tier | `BILL` | P0 | 3h | Free: 1 active trip maximum. When limit reached, CreateTrip shows upgrade prompt instead of form. Luxe/Atelier: unlimited. Count checked client-side and server-side. |
| 3.1.7 | Gate mood board uploads by tier | `BILL` | P1 | 2h | Free: 5 images per trip. Luxe/Atelier: unlimited. Upload endpoint checks count before accepting. |
| 3.1.8 | Build upgrade prompt component | `BILL` | P0 | 4h | Reusable `<UpgradePrompt>` component. Shows when user hits a free tier limit. Displays what they'd get with Luxe. "Unlock with Luxe" CTA opens Stripe Checkout. Elegant design matching brand (not a jarring popup). |
| 3.1.9 | Add tier-aware UI indicators | `BILL` | P1 | 3h | Subtle lock icons on gated features for free users. "Luxe" / "Atelier" badge next to user name in Navbar. Settings page shows current plan with "Upgrade" or "Manage" button. |

#### 3.2 Onboarding

| # | Ticket | Tag | Priority | Est | Acceptance Criteria |
|---|--------|-----|----------|-----|-------------------|
| 3.2.1 | Build post-signup onboarding wizard | `FEAT` | P0 | 8h | Multi-step wizard after first sign-in. Step 1: "What should we call you?" (name input). Step 2: "What's your style?" (tag selector from existing style options). Step 3: "How do you travel?" (luggage size selector). Step 4: "Welcome to Moodmiles" with CTA to create first trip. Progress indicator. Skip option on each step. Saves to profile on completion. Elegant animations between steps. |
| 3.2.2 | Route new users to onboarding | `FEAT` | P0 | 2h | After sign-up (not sign-in), redirect to `/onboarding` instead of `/dashboard`. Check if profile has `name` set — if not, show onboarding. Set a `onboarding_completed` flag in profile. |
| 3.2.3 | Build branded email templates | `FEAT` | P1 | 4h | Supabase email templates customised: verification email, password reset email, magic link email (future). Brand header with logo. Champagne accent colours. "Styled by Moodmiles" footer. Clean typography matching the app. |

#### 3.3 Legal

| # | Ticket | Tag | Priority | Est | Acceptance Criteria |
|---|--------|-----|----------|-----|-------------------|
| 3.3.1 | Create Terms of Service page | `LEGAL` | P0 | 5h | `/terms` route. Full Terms of Service covering: service description, user obligations, subscription terms, cancellation/refund policy, intellectual property, limitation of liability, governing law. Styled consistently with the app. |
| 3.3.2 | Create Privacy Policy page | `LEGAL` | P0 | 5h | `/privacy` route. Full Privacy Policy covering: data collected, how it's used, third-party processors (Supabase, Stripe, OpenAI, Google), user rights (access, deletion, export), cookie usage, data retention, contact information. GDPR-aware. |
| 3.3.3 | Build cookie consent banner | `LEGAL` | P0 | 3h | Non-intrusive banner at bottom of page. "We use cookies for essential functionality and analytics." Accept / Customise options. Customise: toggle analytics cookies. Consent stored in localStorage. PostHog only loads if analytics consent given. |
| 3.3.4 | Add Terms/Privacy checkboxes to sign-up | `LEGAL` | P0 | 2h | Sign-up form includes: "I agree to the Terms of Service and Privacy Policy" checkbox with links. Cannot create account without checking. Timestamp of acceptance stored. |
| 3.3.5 | Build refund/cancellation policy section | `LEGAL` | P1 | 2h | Within Terms of Service or separate page. Clear cancellation process (Stripe Portal). Prorated refund policy for annual plans. No-questions-asked within 14 days. Monthly plans: cancel anytime, access until period end. |

#### 3.4 Pricing Page

| # | Ticket | Tag | Priority | Est | Acceptance Criteria |
|---|--------|-----|----------|-----|-------------------|
| 3.4.1 | Build dedicated `/pricing` page | `FEAT` | P0 | 6h | Full pricing page (separate from landing page preview). Three tiers: Free, Luxe, Atelier. Feature comparison table. Monthly/annual toggle with savings shown. "Founding Member" badge. FAQ section (6-8 questions). CTA buttons open Stripe Checkout. Responsive. Brand-consistent luxury design. |
| 3.4.2 | Add pricing link to Navbar | `FEAT` | P1 | 1h | "Pricing" link in Navbar for logged-out users. For logged-in free users: "Upgrade" link with subtle champagne highlight. For paid users: no pricing link (they see "Manage" in Settings). |

### Sprint 3 — Summary

| Metric | Value |
|--------|-------|
| Total tickets | 18 |
| Total estimated hours | ~63h |
| P0 tickets | 14 |
| P1 tickets | 4 |
| Key deliverable | Paywall enforced, onboarding complete, legal pages live |

### Sprint 3 — Definition of Done

- [ ] Free users are limited to 1 trip, text-only outfits, basic features
- [ ] Hitting a limit shows an elegant upgrade prompt
- [ ] Luxe and Atelier users get full feature access
- [ ] New users go through onboarding wizard
- [ ] Terms of Service and Privacy Policy pages live
- [ ] Cookie consent banner functional
- [ ] Sign-up requires ToS acceptance
- [ ] Pricing page live with Stripe Checkout integration
- [ ] Branded email templates active
- [ ] Navbar shows tier-appropriate links

---

## Sprint 4: Polish & Launch

**Dates:** 7 Apr – 20 Apr 2026
**Theme:** Performance, polish, and ship it
**Goal:** MVP1 is production-ready and launched

### Sprint 4 — Tickets

#### 4.1 Performance

| # | Ticket | Tag | Priority | Est | Acceptance Criteria |
|---|--------|-----|----------|-----|-------------------|
| 4.1.1 | Code-split all routes with React.lazy | `PERF` | P0 | 4h | Every page loaded via `React.lazy` + `Suspense`. Initial bundle < 300 KB. Each route chunk < 100 KB. Suspense fallback uses champagne shimmer skeleton. |
| 4.1.2 | Optimise images with responsive srcset | `PERF` | P1 | 4h | Landing page images serve multiple sizes (400w, 800w, 1200w). Trip card images use Supabase image transforms or URL-based resizing. `loading="lazy"` on all below-fold images. WebP format where supported. |
| 4.1.3 | Add caching for expensive API responses | `PERF` | P0 | 5h | Outfit suggestions: cached in DB, only regenerate on explicit user request. Activity suggestions: cached, 24h TTL before allowing regeneration. Packing lists: cached, regenerate only when weather/events change. Trends: server-side cache (Supabase table), 6h TTL. |
| 4.1.4 | Preload critical fonts | `PERF` | P1 | 1h | `<link rel="preload">` for Playfair Display (400, 500, italic) and Inter (300, 400, 500). Added to `index.html` head. FOUT eliminated. |
| 4.1.5 | Add service worker for PWA support | `PERF` | P2 | 4h | Basic service worker for offline fallback page. Web app manifest with icons. "Add to Home Screen" prompt on mobile. App icon in champagne/dark brand colours. |

#### 4.2 SEO & Social

| # | Ticket | Tag | Priority | Est | Acceptance Criteria |
|---|--------|-----|----------|-----|-------------------|
| 4.2.1 | Add meta tags and OpenGraph tags | `GROW` | P0 | 3h | Landing page: title, description, OG image, OG title, OG description, Twitter card. Each page has appropriate `<title>`. Favicon and apple-touch-icon in brand colours. |
| 4.2.2 | Create OG image for social sharing | `GROW` | P1 | 2h | 1200x630 branded image for OpenGraph. "MoodMiles Atelier — Arrive Impeccably Everywhere" with brand styling. Used as default OG image. |
| 4.2.3 | Add sitemap.xml and robots.txt | `GROW` | P2 | 1h | Static sitemap listing public routes (/, /pricing, /terms, /privacy). robots.txt allowing all crawlers on public routes, blocking /dashboard, /trip, /settings. |

#### 4.3 Polish & Edge Cases

| # | Ticket | Tag | Priority | Est | Acceptance Criteria |
|---|--------|-----|----------|-----|-------------------|
| 4.3.1 | Redesign 404 page with brand styling | `BRAND` | P1 | 2h | 404 page matches luxury brand. Warm background. "This page has checked out." or similar witty copy. CTA to return to dashboard. |
| 4.3.2 | Add global error boundary with branded fallback | `OPS` | P0 | 3h | React error boundary catches unhandled errors. Branded error page: "Something went wrong." + "Return to dashboard" button. Error reported to Sentry with context. |
| 4.3.3 | Handle edge case: trip dates in the past | `FEAT` | P1 | 2h | Past trips marked as "Completed" in dashboard. Weather data not fetched for past trips. User can still view but not regenerate AI content. |
| 4.3.4 | Handle edge case: API failures gracefully | `FEAT` | P0 | 4h | Every AI feature has a graceful degradation path. OpenAI down → show "Our stylists are busy, try again shortly" with retry button. Google Places down → manual text input fallback. DALL-E fails → placeholder outfit illustration. No blank screens or raw error messages ever shown to user. |
| 4.3.5 | Mobile responsiveness audit | `BRAND` | P0 | 4h | Every page tested at 375px (iPhone SE), 390px (iPhone 14), 768px (iPad). Fix any overflow, truncation, or touch target issues. Landing page hero works on all breakpoints. Pricing table scrolls horizontally on mobile. |
| 4.3.6 | Cross-browser testing | `BRAND` | P1 | 3h | Tested on: Chrome, Safari, Firefox, Edge. Tested on: iOS Safari, Android Chrome. Glassmorphism (backdrop-filter) fallback for unsupported browsers. All animations degrade gracefully. |

#### 4.4 DevOps

| # | Ticket | Tag | Priority | Est | Acceptance Criteria |
|---|--------|-----|----------|-----|-------------------|
| 4.4.1 | Set up CI/CD pipeline (GitHub Actions) | `OPS` | P0 | 5h | On push to `main`: install → lint → test → build → deploy to production. On push to `develop`: deploy to staging. On PR: install → lint → test → build (no deploy). Slack/Discord notification on failure. |
| 4.4.2 | Set up staging environment | `OPS` | P0 | 4h | Separate Supabase project for staging. Staging URL (staging.moodmiles.com or similar). Stripe test mode on staging. Separate environment variables. |
| 4.4.3 | Configure uptime monitoring | `OPS` | P1 | 1h | UptimeRobot or Better Uptime monitoring: landing page, Supabase API, edge function health endpoint. Alert via email + Slack on downtime. 1-minute check interval. |
| 4.4.4 | Document deployment process | `OPS` | P1 | 2h | Clear runbook: how to deploy frontend, how to deploy edge functions, how to run migrations, how to roll back. Stored in repo as `DEPLOYMENT.md`. |

#### 4.5 Pre-Launch Checklist

| # | Ticket | Tag | Priority | Est | Acceptance Criteria |
|---|--------|-----|----------|-----|-------------------|
| 4.5.1 | Production environment configuration | `OPS` | P0 | 3h | All environment variables set in production. Stripe live mode keys configured. CORS restricted to production domain. Sentry DSN set. PostHog project key set. DNS configured. SSL verified. |
| 4.5.2 | Stripe live mode testing | `BILL` | P0 | 2h | End-to-end subscription flow tested in live mode with real card. Checkout → webhook → tier update → feature access verified. Cancellation → downgrade verified. Annual plan tested. |
| 4.5.3 | Load testing (basic) | `OPS` | P1 | 3h | Simulate 50 concurrent users. Landing page loads in < 2s. Dashboard loads in < 3s. Edge function response times logged. No errors under load. Identify bottlenecks. |
| 4.5.4 | Data backup verification | `OPS` | P1 | 1h | Verify Supabase PITR (Point in Time Recovery) is enabled. Test restore process documented. Backup retention period confirmed (minimum 7 days). |

### Sprint 4 — Summary

| Metric | Value |
|--------|-------|
| Total tickets | 20 |
| Total estimated hours | ~63h |
| P0 tickets | 11 |
| P1 tickets | 7 |
| P2 tickets | 2 |
| Key deliverable | **MVP1 PRODUCTION LAUNCH** |

### Sprint 4 — Definition of Done

- [ ] Bundle size < 300 KB initial load
- [ ] All images optimised and responsive
- [ ] Expensive API calls cached appropriately
- [ ] Meta tags and OG tags on all public pages
- [ ] 404 and error pages branded
- [ ] All API failures handled gracefully (no blank screens)
- [ ] Mobile responsive on all devices
- [ ] CI/CD pipeline active
- [ ] Staging environment running
- [ ] Production environment configured and verified
- [ ] Stripe live mode tested end-to-end
- [ ] Uptime monitoring active
- [ ] **App is live and accepting paying users**

---

## Sprint 5: Grow & Monetise

**Dates:** 21 Apr – 4 May 2026
**Theme:** Revenue optimisation, growth channels, data-driven decisions
**Goal:** Affiliate revenue flowing, referral programme live, analytics driving decisions

### Sprint 5 — Tickets

#### 5.1 Affiliate Revenue

| # | Ticket | Tag | Priority | Est | Acceptance Criteria |
|---|--------|-----|----------|-----|-------------------|
| 5.1.1 | Research and join affiliate programmes | `B2B` | P0 | 4h | Applied to: Net-a-Porter (via Rakuten/CJ), Farfetch, SSENSE, MatchesFashion. Affiliate links and tracking parameters documented. Commission rates confirmed. |
| 5.1.2 | Add "Shop this look" to outfit suggestions | `B2B` | P0 | 6h | Each outfit suggestion item can have a `shop_url`. "Shop" button next to each item. Opens affiliate link in new tab. Tracking pixel/click logged. Luxe+ only feature. |
| 5.1.3 | Build affiliate link attribution tracking | `B2B` | P1 | 4h | `affiliate_clicks` table: user_id, outfit_id, item_description, retailer, clicked_at. Dashboard for internal tracking. Monthly revenue report query. |

#### 5.2 Referral Programme

| # | Ticket | Tag | Priority | Est | Acceptance Criteria |
|---|--------|-----|----------|-----|-------------------|
| 5.2.1 | Build referral system backend | `GROW` | P0 | 6h | `referrals` table: referrer_user_id, referred_email, referred_user_id, status (pending/completed), reward_granted. Unique referral codes per user. Edge function to validate and process referrals. |
| 5.2.2 | Build referral UI in Settings | `GROW` | P0 | 4h | "Invite a Friend" section in Settings. Unique referral link with copy button. "Share" button (native share API on mobile). Stats: X friends invited, X joined. |
| 5.2.3 | Implement referral rewards | `GROW` | P1 | 4h | Referrer: 1 month free Luxe (or 1 month extension if already subscribed). Referred: 7-day Luxe trial. Applied via Stripe coupon/credit. Reward granted when referred user signs up. |

#### 5.3 Analytics Deep Dive

| # | Ticket | Tag | Priority | Est | Acceptance Criteria |
|---|--------|-----|----------|-----|-------------------|
| 5.3.1 | Instrument full user funnel | `GROW` | P0 | 4h | Track: landing_page_view → auth_page_view → sign_up → onboarding_complete → first_trip_created → first_outfit_generated → subscription_started. Funnel visualised in PostHog. |
| 5.3.2 | Track feature usage per tier | `GROW` | P0 | 3h | Track which features each tier uses most. Identify: what feature triggers upgrade? What feature has highest engagement? Data feeds into tier pricing decisions. |
| 5.3.3 | Set up weekly analytics email | `GROW` | P2 | 2h | PostHog or custom: weekly email with key metrics. New users, conversions, churn, top features, revenue. Sent to founder(s) every Monday. |

#### 5.4 Content & SEO

| # | Ticket | Tag | Priority | Est | Acceptance Criteria |
|---|--------|-----|----------|-----|-------------------|
| 5.4.1 | Build "About" page | `BRAND` | P1 | 3h | `/about` route. Brand story. Mission statement. Team (or founder) section. Design consistent with luxury brand. Photo or illustration. |
| 5.4.2 | Add structured data (JSON-LD) | `GROW` | P1 | 2h | Landing page: Organization schema. Pricing page: Product schema with offers. FAQ: FAQPage schema. Helps Google rich snippets. |
| 5.4.3 | Create "Styled by Moodmiles" social sharing cards | `GROW` | P1 | 4h | When user shares a trip or outfit (future feature), generate branded sharing card. Trip name, destination image, "Styled by Moodmiles" watermark. Downloadable as image. Luxe+ feature. |

#### 5.5 Quality

| # | Ticket | Tag | Priority | Est | Acceptance Criteria |
|---|--------|-----|----------|-----|-------------------|
| 5.5.1 | Write tests for critical paths | `OPS` | P1 | 8h | Tests for: authentication flow, trip CRUD, subscription gating (free user blocked, paid user allowed), rate limiting, Stripe webhook handling. Minimum 70% coverage on critical paths. |
| 5.5.2 | Accessibility audit and fixes | `BRAND` | P1 | 4h | WCAG 2.1 AA audit. Fix: colour contrast, focus indicators, keyboard navigation, screen reader labels, alt text on all images. Lighthouse accessibility score > 90. |

### Sprint 5 — Summary

| Metric | Value |
|--------|-------|
| Total tickets | 14 |
| Total estimated hours | ~58h |
| P0 tickets | 6 |
| P1 tickets | 6 |
| P2 tickets | 2 |
| Key deliverable | Affiliate links live, referrals working, analytics driving decisions |

### Sprint 5 — Definition of Done

- [ ] "Shop this look" affiliate links on outfit suggestions
- [ ] Affiliate click tracking operational
- [ ] Referral programme live with rewards
- [ ] Full user funnel instrumented in PostHog
- [ ] Feature usage tracked by tier
- [ ] About page live
- [ ] Social sharing cards available for Luxe+ users
- [ ] Critical path tests passing in CI
- [ ] Accessibility score > 90

---

## Sprint 6: B2B Foundation & MVP2 Prep

**Dates:** 5 May – 18 May 2026
**Theme:** Build the advertising foundation and prepare for native app
**Goal:** Events can submit promoted content, native app project initialised

### Sprint 6 — Tickets

#### 6.1 B2B: Promoted Experiences

| # | Ticket | Tag | Priority | Est | Acceptance Criteria |
|---|--------|-----|----------|-----|-------------------|
| 6.1.1 | Design promoted activity display in Things to Do tab | `B2B` | P0 | 4h | Promoted activities appear with subtle "Featured" badge. Visually distinguished but not disruptive. Blends with organic suggestions. Premium feel (not "ad-like"). Maximum 2 promoted per trip. |
| 6.1.2 | Build `ad_campaigns` and `ad_events` database tables | `B2B` | P0 | 3h | Migration: `ad_campaigns` (advertiser_id, name, destination_target, date_range, trip_type_targets[], budget, spent, status, creative fields). `ad_events` (campaign_id, user_id, trip_id, event_type: impression/click/save). RLS policies. |
| 6.1.3 | Build ad serving logic in `suggest-activities` | `B2B` | P0 | 5h | After generating organic activities, query `ad_campaigns` for matching destination + date range + trip type. Insert up to 2 promoted activities with `is_promoted: true`. Log impression in `ad_events`. |
| 6.1.4 | Build promoted activity click/save tracking | `B2B` | P0 | 3h | `track-ad-event` edge function. Logs click or save events. Links to campaign for reporting. Called from ThingsToDoTab when user interacts with promoted content. |
| 6.1.5 | Build simple advertiser submission form | `B2B` | P1 | 6h | `/advertise` page (public). Form: business name, contact email, event/experience name, destination city, date range, description, image URL, booking URL. Stores in `ad_campaigns` with status "pending_review". Email notification to admin. |
| 6.1.6 | Build admin review interface (basic) | `B2B` | P1 | 6h | Protected admin route (check user email against allowlist). List pending campaigns. Approve/reject with one click. Approved campaigns go "active" and start serving. Simple but functional. |

#### 6.2 GDPR & Data Management

| # | Ticket | Tag | Priority | Est | Acceptance Criteria |
|---|--------|-----|----------|-----|-------------------|
| 6.2.1 | Build user data export endpoint | `LEGAL` | P0 | 5h | `export-user-data` edge function. Collects all user data: profile, trips, events, outfits, activities, packing, board items, usage data. Returns as JSON download. Accessible from Settings. |
| 6.2.2 | Build account deletion flow | `LEGAL` | P0 | 5h | "Delete my account" in Settings. Confirmation dialog with password re-entry. `delete-user-data` edge function: cancels Stripe subscription, deletes all user data from all tables, deletes storage files, deletes auth user. Sends confirmation email. 30-day grace period with "undo" option. |

#### 6.3 MVP2 Native App Prep

| # | Ticket | Tag | Priority | Est | Acceptance Criteria |
|---|--------|-----|----------|-----|-------------------|
| 6.3.1 | Initialise React Native (Expo) project | `FEAT` | P1 | 4h | New `mobile/` directory. Expo project initialised with TypeScript. Supabase client configured. Navigation structure (React Navigation) mirroring web routes. Runs on iOS simulator and Android emulator. |
| 6.3.2 | Implement auth flow in native app | `FEAT` | P1 | 6h | Sign in, sign up, Google OAuth in native app. Supabase session persistence. Protected navigation. Same auth as web — shared Supabase project. |
| 6.3.3 | Build native dashboard screen | `FEAT` | P1 | 6h | Dashboard screen with trip list. Pull-to-refresh. Trip card with image, destination, dates. Create trip FAB. Trending preview. Native styling matching brand (warm blacks, champagne accents). |
| 6.3.4 | Document native app architecture decisions | `OPS` | P1 | 2h | ADR (Architecture Decision Record): why Expo, navigation structure, state management approach, shared vs native UI components, deployment strategy. Stored in `mobile/ARCHITECTURE.md`. |

#### 6.4 Platform Improvements

| # | Ticket | Tag | Priority | Est | Acceptance Criteria |
|---|--------|-----|----------|-----|-------------------|
| 6.4.1 | Add trip sharing (read-only link) | `FEAT` | P1 | 5h | "Share trip" button generates unique public URL. Recipient sees read-only trip overview (no auth required). Weather, outfits, activities visible. Packing list hidden. "Styled by Moodmiles" branding. Luxe+ feature. |
| 6.4.2 | Add .ics calendar export for trip events | `FEAT` | P2 | 3h | "Add to Calendar" button on trip events. Generates .ics file with event name, date, location. Works with Google Calendar, Apple Calendar, Outlook. |

### Sprint 6 — Summary

| Metric | Value |
|--------|-------|
| Total tickets | 14 |
| Total estimated hours | ~63h |
| P0 tickets | 7 |
| P1 tickets | 6 |
| P2 tickets | 1 |
| Key deliverable | B2B ad foundation live, native app skeleton, GDPR compliance |

### Sprint 6 — Definition of Done

- [ ] Promoted activities appear in Things to Do tab with "Featured" badge
- [ ] Ad impressions and clicks tracked
- [ ] Advertiser submission form live
- [ ] Admin can approve/reject campaigns
- [ ] Users can export all their data (GDPR)
- [ ] Users can delete their account (GDPR)
- [ ] React Native project initialised with auth
- [ ] Native dashboard screen functional
- [ ] Trip sharing via public link available

---

## Post-Sprint 6: Continuing Roadmap

### Sprints 7–8: Native App Core (Weeks 13–16)

| Focus | Key Deliverables |
|-------|-----------------|
| Native trip creation | Create trip form with Places autocomplete |
| Native trip detail | All 6 tabs with native scrolling and gestures |
| Native AI features | Outfit generation, activities, packing (same edge functions) |
| Push notifications | "Your trip to [X] is in 3 days — outfits ready" |
| Offline mode | Download trip plan for flight |
| App Store prep | Screenshots, metadata, privacy labels |

### Sprints 9–10: B2B Scale (Weeks 17–20)

| Focus | Key Deliverables |
|-------|-----------------|
| Self-serve advertiser dashboard | Full campaign management at business.moodmiles.com |
| Advertiser analytics | Impressions, clicks, saves, conversion tracking |
| Stripe Connect for advertisers | Automated billing for ad campaigns |
| Sponsored destinations | Tourism board placements in Trending and dashboard |
| Content moderation | Automated + manual review pipeline |

### Sprints 11–12: Platform Expansion (Weeks 21–24)

| Focus | Key Deliverables |
|-------|-----------------|
| Trip collaboration | Multiple users on one trip, real-time sync |
| PDF lookbook export | Downloadable trip outfit plan |
| Multi-language | French, Italian (key luxury travel markets) |
| Apple Watch companion | Weather + today's outfit on wrist |
| Camera wardrobe scan | Photograph clothes → AI adds to capsule |

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| OpenAI API costs exceed projections | Medium | High | Implement aggressive caching, reduce DALL-E calls for free tier, set up billing alerts |
| Low initial conversion (free → paid) | High | High | A/B test paywall placement, offer 14-day trial, founding member discount |
| Stripe webhook failures | Low | High | Idempotent processing, dead letter queue, manual reconciliation process |
| DALL-E 3 quality inconsistent | Medium | Medium | Prompt engineering, retry failed generations, quality scoring |
| Google Places API pricing increases | Low | Medium | Abstract behind interface, have Mapbox/Nominatim as fallback |
| App Store rejection (native) | Medium | Medium | Follow Apple guidelines strictly, submit early for review |
| Data breach / security incident | Low | Critical | CORS restriction, rate limiting, input validation, Sentry monitoring, incident response plan |
| Founder burnout (solo development) | High | Critical | Prioritise ruthlessly, automate what you can, consider technical co-founder |

---

## Success Metrics

### Launch (End of Sprint 4)

| Metric | Target |
|--------|--------|
| App live and accessible | Yes |
| Stripe processing payments | Yes |
| Zero critical security vulnerabilities | Yes |
| Landing page Lighthouse score | > 90 |
| Error rate | < 1% |

### Month 1 Post-Launch (End of Sprint 6)

| Metric | Target |
|--------|--------|
| Total sign-ups | 200+ |
| Paid subscribers | 10+ |
| MRR | > $150 |
| Landing → Sign-up conversion | > 5% |
| Free → Paid conversion | > 3% |
| Monthly churn | < 10% |
| Avg trips per user | > 1.5 |

### Month 3

| Metric | Target |
|--------|--------|
| Total sign-ups | 1,000+ |
| Paid subscribers | 50+ |
| MRR | > $750 |
| Affiliate revenue | > $100/mo |
| B2B campaigns | 3+ active |
| Native app | In App Store |

### Month 6

| Metric | Target |
|--------|--------|
| Total sign-ups | 5,000+ |
| Paid subscribers | 200+ |
| MRR | > $3,000 |
| Affiliate revenue | > $500/mo |
| B2B revenue | > $500/mo |
| Net revenue positive | Yes |

---

## Dependency Map

```
Sprint 1 ──┬── Sprint 2 ──┬── Sprint 3 ──── Sprint 4 (LAUNCH)
            │              │                      │
            │              │                      ├── Sprint 5 ── Sprint 6
            │              │                      │
            │              │                      └── Native App (Sprint 7+)
            │              │
            │              └── Colour changes needed before gating UI (Sprint 3)
            │
            └── Stripe must be integrated before gating (Sprint 3)
                Rate limiting must exist before launch (Sprint 4)

Key Dependencies:
  Sprint 1 → Sprint 3: Stripe integration required for gating
  Sprint 2 → Sprint 3: Colour/brand must be set before building pricing page
  Sprint 3 → Sprint 4: Gating must work before launch
  Sprint 4 → Sprint 5: Must be live before growth features matter
  Sprint 4 → Sprint 6: Must be live before B2B makes sense
  Sprint 6 → Sprint 7+: Native app skeleton needed before full build
```

---

## Appendix: Sprint Velocity Assumptions

| Assumption | Value |
|-----------|-------|
| Working hours per week | 40h (full-time) or 20h (part-time alongside other work) |
| Sprint duration | 2 weeks |
| Average ticket size | 3.5h |
| Buffer for unknowns | 15% added to estimates |
| Hours per sprint (full-time) | ~65h usable (80h minus meetings, context switching) |
| Hours per sprint (part-time) | ~32h usable |

All hour estimates in this plan assume **focused development time** (no meetings, no context switching). If working part-time, each sprint may stretch to 3 weeks. Adjust timelines accordingly.

---

*Last updated: 2026-02-24*
*Companion document: [MOODMILES_MASTER.md](./MOODMILES_MASTER.md)*
