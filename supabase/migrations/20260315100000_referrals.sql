-- Referrals table for growth / VIP referral programme
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
  referred_email TEXT,
  referred_user_id UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  reward_granted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own referrals"
  ON referrals FOR SELECT
  USING (referrer_user_id = auth.uid());

CREATE POLICY "Service role can insert referrals"
  ON referrals FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update referrals"
  ON referrals FOR UPDATE
  USING (true);

-- Index for fast lookup by referrer
CREATE INDEX IF NOT EXISTS referrals_referrer_idx ON referrals(referrer_user_id);
