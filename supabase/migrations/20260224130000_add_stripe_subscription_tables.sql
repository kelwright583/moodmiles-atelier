-- Update profiles subscription_tier to support 'free' and 'luxe' only
UPDATE public.profiles SET subscription_tier = 'luxe' WHERE subscription_tier = 'premium';
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_subscription_tier_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_subscription_tier_check
  CHECK (subscription_tier IN ('free', 'luxe'));

-- Stripe customer mapping
CREATE TABLE IF NOT EXISTS public.stripe_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  stripe_customer_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.stripe_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own stripe customer" ON public.stripe_customers
  FOR SELECT USING (auth.uid() = user_id);

-- Stripe subscriptions (service role inserts/updates via webhook)
CREATE TABLE IF NOT EXISTS public.stripe_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  tier TEXT NOT NULL DEFAULT 'luxe' CHECK (tier IN ('free', 'luxe')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.stripe_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription" ON public.stripe_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX idx_stripe_subscriptions_user ON public.stripe_subscriptions(user_id);
CREATE INDEX idx_stripe_subscriptions_stripe_id ON public.stripe_subscriptions(stripe_subscription_id);
