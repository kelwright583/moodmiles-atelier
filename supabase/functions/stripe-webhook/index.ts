import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey || !webhookSecret) {
    console.error("Stripe missing config");
    return new Response("Server error", { status: 500 });
  }

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("No signature", { status: 400 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2024-11-20.acacia", httpClient: Stripe.createFetchHttpClient() });

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        const subscriptionId = session.subscription as string;
        if (!userId || !subscriptionId) break;

        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

        // Resolve tier: prefer session metadata → subscription metadata → price ID lookup → fallback "luxe"
        const ATELIER_PRICE_ID = Deno.env.get("STRIPE_ATELIER_PRICE_ID");
        const sessionTier = session.metadata?.tier;
        const subTier = sub.metadata?.tier;
        const priceId = sub.items.data[0]?.price?.id;
        const tierFromPrice = ATELIER_PRICE_ID && priceId === ATELIER_PRICE_ID ? "atelier" : "luxe";
        const tier = sessionTier || subTier || tierFromPrice;

        await supabase.from("stripe_subscriptions").upsert(
          {
            user_id: userId,
            stripe_subscription_id: subscriptionId,
            stripe_customer_id: customerId,
            status: sub.status,
            tier,
            current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "stripe_subscription_id" },
        );

        await supabase.from("profiles").update({ subscription_tier: tier }).eq("user_id", userId);
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        let userId = sub.metadata?.user_id;
        if (!userId) {
          const { data: existing } = await supabase.from("stripe_subscriptions").select("user_id").eq("stripe_subscription_id", sub.id).single();
          userId = existing?.user_id;
        }

        await supabase.from("stripe_subscriptions").update({
          status: sub.status,
          current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("stripe_subscription_id", sub.id);

        if (userId && (sub.status === "canceled" || sub.status === "unpaid" || sub.status === "past_due" || sub.status === "incomplete_expired")) {
          await supabase.from("profiles").update({ subscription_tier: "free" }).eq("user_id", userId);
        }
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    return new Response("Handler error", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
