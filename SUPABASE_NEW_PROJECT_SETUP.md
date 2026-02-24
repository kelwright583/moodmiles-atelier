# MoodMiles — New Supabase Project Setup

Follow these steps to connect a **new** Supabase project to MoodMiles.

---

## Step 1: Create a New Supabase Project

1. Go to **[supabase.com/dashboard](https://supabase.com/dashboard)**
2. Sign in (or create an account)
3. Click **"New Project"**
4. Choose your organization
5. Set:
   - **Name:** MoodMiles (or any name)
   - **Database Password:** Choose a strong password (save it)
   - **Region:** Closest to you
6. Click **"Create new project"** and wait for it to finish

---

## Step 2: Run the Database Setup

1. In your project, go to **SQL Editor**
2. Click **"New query"**
3. Open the file **`supabase/FULL_SETUP.sql`** from this repo
4. Copy its **entire contents** and paste into the SQL Editor
5. Click **"Run"** (or Ctrl+Enter)
6. You should see "Success. No rows returned"

**If storage bucket inserts fail:** Create them manually:
- Go to **Storage** → **New bucket**
- Create: `board-images`, `avatars`, `outfit-images` (all **public**)

---

## Step 3: Get Your API Keys

1. Go to **Project Settings** (gear icon) → **API**
2. Copy:
   - **Project URL** (e.g. `https://xxxxx.supabase.co`)
   - **anon public** key (under "Project API keys")

---

## Step 4: Update Your `.env` File

In your project root, create or update `.env`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key-here
VITE_SUPABASE_PROJECT_ID=YOUR_PROJECT_REF
```

Replace `YOUR_PROJECT_REF` and `your-anon-key-here` with the values from Step 3.

---

## Step 5: Enable Email Auth (Optional but Recommended)

1. Go to **Authentication** → **Providers**
2. **Email** should be enabled by default
3. Under **Email**, you can:
   - Disable "Confirm email" for faster local testing
   - Or leave it on for production

---

## Step 6: Deploy Edge Functions (Optional)

Edge functions power: weather, trends, activities, outfits, packing suggestions, places autocomplete, destination images.

1. Install Supabase CLI: `npm install -g supabase`
2. Log in: `supabase login`
3. Link your project: `supabase link --project-ref YOUR_PROJECT_REF`
4. Deploy: `supabase functions deploy`

Then add secrets in **Project Settings** → **Edge Functions** → **Secrets**:

| Secret | Used For |
|--------|----------|
| `OPENAI_API_KEY` | **Recommended.** AI for outfits, packing, activities, trends |
| `LOVABLE_API_KEY` | Alternative (has credit limits) |
| `GOOGLE_MAPS_API_KEY` | Places autocomplete, trending images |
| `UNSPLASH_ACCESS_KEY` | Trip card images, trending fallback |

**Without these:** The app still works. You’ll get fallbacks (e.g. static trending, placeholder images).

---

## Step 7: Test

1. Run `npm run dev`
2. Open http://localhost:8080
3. Sign up with an email
4. Create a trip

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "relation does not exist" | Re-run `FULL_SETUP.sql` from the start |
| Auth not working | Check Email provider is enabled |
| Storage upload fails | Ensure buckets exist and are public |
| Edge functions fail | Deploy functions and set secrets |
