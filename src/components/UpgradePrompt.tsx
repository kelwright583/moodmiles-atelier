import { useState } from "react";
import { Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface UpgradePromptProps {
  feature: string;
  tier: "luxe" | "atelier";
  description?: string;
}

export const UpgradePrompt = ({ feature, tier, description }: UpgradePromptProps) => {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { plan: tier },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err: unknown) {
      toast({
        title: "Could not open checkout",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const tierLabel = tier === "luxe" ? "Luxe" : "Atelier";

  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-5">
        <Crown size={20} className="text-primary" />
      </div>
      <h3 className="text-lg font-heading mb-2">
        {feature} is a {tierLabel} feature
      </h3>
      <p className="text-sm text-muted-foreground font-body mb-7 max-w-xs leading-relaxed">
        {description ||
          `Upgrade to ${tierLabel} to unlock ${feature.toLowerCase()} and everything else in the collection.`}
      </p>
      <div className="flex items-center gap-3">
        <Button variant="champagne" onClick={handleUpgrade} disabled={loading}>
          {loading ? "Opening..." : `Unlock with ${tierLabel}`}
        </Button>
        <a
          href="/pricing"
          className="text-xs text-muted-foreground hover:text-foreground font-body transition-colors underline underline-offset-2"
        >
          Compare plans
        </a>
      </div>
    </div>
  );
};
