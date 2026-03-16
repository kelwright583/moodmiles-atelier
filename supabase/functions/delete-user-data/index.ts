/// <reference path="../deno.d.ts" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { requireAuth, getServiceClient } from "../_shared/auth.ts";

serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;

  const corsHeaders = getCorsHeaders(req);

  try {
    const { userId } = await requireAuth(req);
    const supabase = getServiceClient();

    // 1. Cancel Stripe subscription if one exists
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (stripeKey) {
      const stripe = new Stripe(stripeKey, {
        apiVersion: "2024-11-20.acacia",
        httpClient: Stripe.createFetchHttpClient(),
      });

      const { data: customer } = await supabase
        .from("stripe_customers")
        .select("stripe_customer_id")
        .eq("user_id", userId)
        .single();

      if (customer?.stripe_customer_id) {
        try {
          const subscriptions = await stripe.subscriptions.list({
            customer: customer.stripe_customer_id,
            status: "active",
            limit: 5,
          });
          for (const sub of subscriptions.data) {
            await stripe.subscriptions.cancel(sub.id);
          }
        } catch (stripeErr) {
          console.warn("Stripe cancellation warning:", stripeErr);
          // Non-fatal — continue with deletion
        }
      }
    }

    // 2. Delete storage files
    const storageBuckets = ["avatars", "board-images", "outfit-images", "trip-photos"];
    for (const bucket of storageBuckets) {
      try {
        const { data: files } = await supabase.storage.from(bucket).list(userId);
        if (files && files.length > 0) {
          const paths = files.map((f: { name: string }) => `${userId}/${f.name}`);
          await supabase.storage.from(bucket).remove(paths);
        }
      } catch {
        // Non-fatal — bucket may not exist or user may have no files
      }
    }

    // 3. Delete database records (trips cascade-delete child records)
    await supabase.from("stripe_subscriptions").delete().eq("user_id", userId);
    await supabase.from("stripe_customers").delete().eq("user_id", userId);
    await supabase.from("trips").delete().eq("user_id", userId);
    await supabase.from("profiles").delete().eq("user_id", userId);

    // 4. Delete auth user (must be last)
    const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(userId);
    if (deleteAuthError) {
      console.error("Auth user deletion error:", deleteAuthError);
      throw deleteAuthError;
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("delete-user-data error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
