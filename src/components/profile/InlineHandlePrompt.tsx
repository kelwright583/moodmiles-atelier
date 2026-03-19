/**
 * InlineHandlePrompt — dropped into modals that require handle_set = true
 * (invite modal, share trip modal). Shows inline handle input + save button,
 * then calls onComplete when handle is successfully saved.
 */
import { useState, useRef } from "react";
import { Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

interface InlineHandlePromptProps {
  onComplete: (handle: string) => void;
  promptText?: string;
}

const InlineHandlePrompt = ({
  onComplete,
  promptText = "Choose your @handle first so your friend knows who's inviting them",
}: InlineHandlePromptProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [handle, setHandle] = useState("");
  const [status, setStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkHandle = async (value: string) => {
    const h = value.toLowerCase().trim();
    if (!h || !/^[a-z0-9_]{3,20}$/.test(h)) { setStatus(h ? "invalid" : "idle"); return; }
    setStatus("checking");
    try {
      const { data } = await supabase.functions.invoke("check-handle", { body: { handle: h } });
      setStatus(data?.available ? "available" : "taken");
    } catch { setStatus("idle"); }
  };

  const handleInput = (value: string) => {
    const cleaned = value.toLowerCase().replace(/[^a-z0-9_]/g, "");
    setHandle(cleaned);
    setStatus("idle");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (cleaned.length >= 3) {
      debounceRef.current = setTimeout(() => checkHandle(cleaned), 400);
    }
  };

  const save = async () => {
    if (!user || status !== "available") return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ handle, handle_set: true })
        .eq("user_id", user.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
      toast({ title: `@${handle} saved` });
      onComplete(handle);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
      <p className="text-xs font-body text-muted-foreground leading-relaxed">{promptText}</p>
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-body text-sm">@</span>
          <Input
            value={handle}
            onChange={(e) => handleInput(e.target.value)}
            placeholder="yourhandle"
            className="bg-secondary border-border h-10 font-body pl-7 pr-8 text-sm"
            maxLength={20}
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
            {status === "checking" && <Loader2 size={13} className="text-muted-foreground animate-spin" />}
            {status === "available" && <Check size={13} className="text-live-text" />}
            {(status === "taken" || status === "invalid") && <X size={13} className="text-red-400" />}
          </div>
        </div>
        <Button
          variant="champagne"
          size="sm"
          onClick={save}
          disabled={status !== "available" || saving}
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : "Save"}
        </Button>
      </div>
      {status === "taken" && (
        <p className="text-xs text-red-400 font-body">That handle is taken — try another.</p>
      )}
      {status === "invalid" && handle.length > 0 && (
        <p className="text-xs text-muted-foreground font-body">3-20 chars, lowercase letters, numbers and underscores only.</p>
      )}
    </div>
  );
};

export default InlineHandlePrompt;
