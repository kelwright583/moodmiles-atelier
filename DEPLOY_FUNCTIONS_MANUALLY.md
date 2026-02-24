# Deploy Edge Functions — Browser Only

No terminal. No token. Just click and paste.

---

## Part A: Add your OpenAI key first

1. Open: **https://supabase.com/dashboard/project/hwykcvpcwpaiotatzise/settings/functions**
2. Click **"Secrets"** or **"Add secret"**
3. Name: `OPENAI_API_KEY`
4. Value: paste your OpenAI key (the one that starts with sk-)
5. Save

---

## Part B: Add each function

1. Open: **https://supabase.com/dashboard/project/hwykcvpcwpaiotatzise/functions**

2. For each function (do 1–8 in order):

   **In Cursor (left side):**
   - Click the folder: `supabase` → `functions` → [function name] → `index.ts`
   - Press Ctrl+A (select all)
   - Press Ctrl+C (copy)

   **In Supabase (browser):**
   - Click **"Create a new function"**
   - Name: type the exact name from the list below
   - Click in the code box
   - Press Ctrl+V (paste)
   - Click **"Deploy"**

---

**Function names (type these exactly):**

1. `generate-outfits`
2. `suggest-packing`
3. `suggest-activities`
4. `search-fashion`
5. `fetch-trends`
6. `fetch-destination-image`
7. `google-places`
8. `fetch-weather`

---

**That's it.** Same steps for each: copy from Cursor, paste in Supabase, Deploy.
