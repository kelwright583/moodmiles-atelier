import { getServiceClient } from "../_shared/auth.ts";

// Internal helper module — NOT a Deno.serve HTTP endpoint.
// Other edge functions import createNotification from this file.
export async function createNotification(params: {
  user_id: string;
  trip_id?: string | null;
  type: string;
  title: string;
  body?: string | null;
  action_url?: string | null;
}): Promise<void> {
  try {
    const supabase = getServiceClient();
    await supabase.from("notifications").insert({
      user_id: params.user_id,
      trip_id: params.trip_id ?? null,
      type: params.type,
      title: params.title,
      body: params.body ?? null,
      is_read: false,
      action_url: params.action_url ?? null,
    });
  } catch (err) {
    // Never block the caller — log and swallow
    console.error("createNotification error:", err instanceof Error ? err.message : String(err));
  }
}
