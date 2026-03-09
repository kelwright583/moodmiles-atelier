import { readFileSync } from "fs";
import { resolve } from "path";

// --- Load SERPER_API_KEY ---
// Try .env in project root first, then fall back to process.env
let SERPER_API_KEY = process.env.SERPER_API_KEY || "";

if (!SERPER_API_KEY) {
  try {
    const envPath = resolve(process.cwd(), ".env");
    const envContent = readFileSync(envPath, "utf-8");
    const match = envContent.match(/^SERPER_API_KEY=["']?([^"'\n]+)["']?/m);
    if (match) {
      SERPER_API_KEY = match[1].trim();
      console.log("Loaded SERPER_API_KEY from .env");
    }
  } catch {
    // .env not found
  }
}

if (!SERPER_API_KEY) {
  console.error(
    "\nNo SERPER_API_KEY found.\n" +
    "Either:\n" +
    "  1. Add SERPER_API_KEY=your_key to your .env file\n" +
    "  2. Run: SERPER_API_KEY=your_key npx tsx scripts/test-serper.ts\n"
  );
  process.exit(1);
}

console.log(`\nUsing key: ${SERPER_API_KEY.slice(0, 6)}...${SERPER_API_KEY.slice(-4)}`);

// --- Test 1: /images endpoint ---
console.log("\n=== TEST 1: POST https://google.serper.dev/images ===");
const imagesPayload = { q: "summer fashion editorial vogue", gl: "us", hl: "en", num: 5 };
console.log("Request body:", JSON.stringify(imagesPayload, null, 2));

const imagesRes = await fetch("https://google.serper.dev/images", {
  method: "POST",
  headers: { "X-API-KEY": SERPER_API_KEY, "Content-Type": "application/json" },
  body: JSON.stringify(imagesPayload),
});

console.log("HTTP status:", imagesRes.status, imagesRes.statusText);
const imagesData = await imagesRes.json() as Record<string, unknown>;

// Show all top-level keys returned
console.log("Top-level keys in response:", Object.keys(imagesData));

// Show first result in full to reveal exact field names
const candidates = ["images", "results", "image_results", "organic"];
for (const key of candidates) {
  if (Array.isArray(imagesData[key])) {
    const arr = imagesData[key] as unknown[];
    console.log(`\nFound results under key: "${key}" — ${arr.length} items`);
    if (arr.length > 0) {
      console.log("First result (all fields):", JSON.stringify(arr[0], null, 2));
    }
  }
}

// If none of the expected keys matched, dump the whole response
const foundAny = candidates.some((k) => Array.isArray(imagesData[k]));
if (!foundAny) {
  console.log("\nNo known array key found. Full response:");
  console.log(JSON.stringify(imagesData, null, 2));
}

// --- Test 2: /search endpoint as fallback comparison ---
console.log("\n=== TEST 2: POST https://google.serper.dev/search (for comparison) ===");
const searchRes = await fetch("https://google.serper.dev/search", {
  method: "POST",
  headers: { "X-API-KEY": SERPER_API_KEY, "Content-Type": "application/json" },
  body: JSON.stringify({ q: "summer fashion editorial vogue", gl: "us", hl: "en", num: 3 }),
});
console.log("HTTP status:", searchRes.status, searchRes.statusText);
const searchData = await searchRes.json() as Record<string, unknown>;
console.log("Top-level keys:", Object.keys(searchData));
if (Array.isArray(searchData.organic) && searchData.organic.length > 0) {
  console.log("First organic result:", JSON.stringify((searchData.organic as unknown[])[0], null, 2));
}
