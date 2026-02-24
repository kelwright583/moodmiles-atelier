# Landing Page Images

## Current setup: Picsum Photos

The landing page uses [Picsum Photos](https://picsum.photos) — a free, no-API-required service. Images load from `https://picsum.photos/seed/{seed}/{width}/{height}`. Each seed returns a consistent image.

**Pros:** Always works, no API key, no rate limits  
**Cons:** Images are random — not curated for luxury/travel

---

## Option: Unsplash API (for curated luxury imagery)

To use glamorous, on-brand images:

1. **Get a free API key:** [Unsplash Developers](https://unsplash.com/developers)
   - Create an app
   - Free tier: 50 requests/hour (enough for landing page)

2. **Add to Supabase secrets** (if using edge function) or `.env`:
   ```
   VITE_UNSPLASH_ACCESS_KEY=your_key
   ```

3. **Use Unsplash URLs** — Replace the Picsum URLs in `src/pages/Index.tsx` with Unsplash CDN URLs, e.g.:
   ```
   https://images.unsplash.com/photo-{id}?w=1920&q=85
   ```
   Get IDs from [Unsplash](https://unsplash.com) when you find images you like.

4. **Or use local images** — Add images to `public/images/` and reference as `/images/hero.jpg`, etc. Full control, no external dependency.
