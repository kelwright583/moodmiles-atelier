import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface AuthResult {
  userId: string;
  supabase: ReturnType<typeof createClient>;
}

export function getServiceClient(): ReturnType<typeof createClient> {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

export async function requireAuth(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    throw new AuthError("Missing authorization header");
  }

  const token = authHeader.replace("Bearer ", "");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: { user }, error } = await userClient.auth.getUser(token);
  if (error || !user) {
    throw new AuthError("Invalid or expired token");
  }

  const serviceClient = getServiceClient();
  return { userId: user.id, supabase: serviceClient };
}

/**
 * Lightweight user ID extraction from JWT without full verification.
 * Use for rate limiting where we also have the service client doing the actual work.
 * Falls back to null if token is malformed.
 */
export function extractUserIdFromJwt(req: Request): string | null {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;

  const token = authHeader.replace("Bearer ", "");
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const decoded = JSON.parse(atob(payload));
    return decoded.sub || null;
  } catch {
    return null;
  }
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}
