-- API usage tracking for rate limiting and cost monitoring
CREATE TABLE IF NOT EXISTS public.api_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    function_name TEXT NOT NULL,
    trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
    called_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    tokens_used INTEGER DEFAULT 0,
    cost_estimate NUMERIC(10, 6) DEFAULT 0
);

ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage" ON public.api_usage
    FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX idx_api_usage_user_function ON public.api_usage (user_id, function_name, called_at);
CREATE INDEX idx_api_usage_daily ON public.api_usage (user_id, function_name, (called_at::date));
