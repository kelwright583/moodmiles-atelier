const ALLOWED_HEADERS =
  "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version";

const DEV_ORIGINS = [
  "http://localhost:8080",
  "http://localhost:5173",
  "http://localhost:3000",
];

/** Patterns like *.netlify.app - origin must end with the part after * */
const WILDCARD_PATTERNS = [".netlify.app", ".vercel.app"];

function getAllowedOrigins(): string[] {
  const envOrigins = Deno.env.get("ALLOWED_ORIGINS");
  const origins = envOrigins
    ? envOrigins.split(",").map((o) => o.trim()).filter(Boolean)
    : [];
  return [...origins, ...DEV_ORIGINS];
}

function isOriginAllowed(origin: string, allowed: string[]): boolean {
  if (allowed.includes(origin)) return true;
  return WILDCARD_PATTERNS.some((pattern) => origin.endsWith(pattern));
}

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") || "";
  const allowed = getAllowedOrigins();
  const matchedOrigin = isOriginAllowed(origin, allowed) ? origin : allowed[0] || "";

  return {
    "Access-Control-Allow-Origin": matchedOrigin,
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

export function handleCorsPreflightRequest(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }
  return null;
}
