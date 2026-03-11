import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const SpotifyCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const run = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const error = params.get("error");

      if (error || !code) {
        toast({
          title: "Spotify connection failed",
          description: error ?? "No code returned",
          variant: "destructive",
        });
        navigate("/settings");
        return;
      }

      try {
        const redirect_uri = window.location.origin + "/auth/spotify/callback";
        const { data, error: fnError } = await supabase.functions.invoke("save-spotify-tokens", {
          body: { code, redirect_uri },
        });

        if (fnError) throw fnError;
        if (data?.error) throw new Error(data.error);

        toast({ title: "Spotify connected!" });
        navigate("/settings");
      } catch (err) {
        toast({
          title: "Spotify connection failed",
          description: err instanceof Error ? err.message : String(err),
          variant: "destructive",
        });
        navigate("/settings");
      }
    };

    run();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-sm font-body text-muted-foreground">Connecting Spotify…</p>
      </div>
    </div>
  );
};

export default SpotifyCallback;
