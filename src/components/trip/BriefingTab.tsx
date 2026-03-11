import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Shield, ShieldAlert, ChevronDown, ChevronRight, Heart, Globe2, Banknote,
  MapPin, Landmark, CloudSun, ExternalLink, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShimmerSkeleton } from "@/components/ui/shimmer-skeleton";
import { toast } from "@/hooks/use-toast";

interface BriefingTabProps {
  tripId: string;
  trip: {
    destination: string;
    country: string | null;
    trip_type: string | null;
    start_date: string;
    end_date: string;
  };
}

// ── Severity scoring ────────────────────────────────────────────────────────

type Severity = "red" | "amber" | "green";

const RED_KEYWORDS = [
  "required", "mandatory", "illegal", "banned", "forbidden", "prohibited",
  "law", "arrest", "jail", "prison", "unsafe", "critical", "dangerous",
  "high risk", "severe", "extreme", "zero tolerance", "serious", "avoid",
  "do not", "never", "restricted", "permit required", "death penalty",
];
const AMBER_KEYWORDS = [
  "recommended", "be aware", "check", "risk", "consider", "advisable",
  "moderate", "possible", "take care", "watch out", "limited",
  "may", "can be", "sometimes", "occasional",
];

function getSeverity(text: string | null): Severity {
  if (!text) return "green";
  const lower = text.toLowerCase();
  if (RED_KEYWORDS.some((k) => lower.includes(k))) return "red";
  if (AMBER_KEYWORDS.some((k) => lower.includes(k))) return "amber";
  return "green";
}

const SeverityDot = ({ severity }: { severity: Severity }) => (
  <span
    className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${
      severity === "red"
        ? "bg-red-500"
        : severity === "amber"
        ? "bg-amber-400"
        : "bg-emerald-500"
    }`}
  />
);

// ── Briefing card ────────────────────────────────────────────────────────────

function extractHeadline(text: string): { headline: string; detail: string } {
  // Try to extract a natural first sentence as the headline
  const firstSentence = text.split(/[.!]/)[0]?.trim() || "";
  const headline = firstSentence.length > 0 && firstSentence.length <= 100
    ? firstSentence
    : text.slice(0, 80).trim();
  const detail = text.slice(headline.length).replace(/^[.!\s]+/, "").trim();
  return { headline, detail };
}

const BriefingCard = ({ label, text }: { label: string; text: string | null }) => {
  if (!text) return null;
  const severity = getSeverity(text);
  const { headline, detail } = extractHeadline(text);

  return (
    <div className="flex gap-3 py-3 border-b border-border/40 last:border-0">
      <SeverityDot severity={severity} />
      <div className="min-w-0">
        <p className="text-xs tracking-[0.1em] uppercase text-muted-foreground font-body mb-0.5">{label}</p>
        <p className="text-sm font-body text-foreground font-medium leading-snug">{headline}{headline.length < text.length && !headline.endsWith(".") ? "." : ""}</p>
        {detail && (
          <p className="text-xs text-muted-foreground font-body mt-1 leading-relaxed">{detail}</p>
        )}
      </div>
    </div>
  );
};

// ── Collapsible section ──────────────────────────────────────────────────────

const BriefingSection = ({
  title,
  icon: Icon,
  cards,
  defaultOpen = false,
  footer,
}: {
  title: string;
  icon: React.ElementType;
  cards: { label: string; text: string | null }[];
  defaultOpen?: boolean;
  footer?: React.ReactNode;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const visibleCards = cards.filter((c) => c.text);
  if (visibleCards.length === 0) return null;

  const maxSeverity = visibleCards.reduce<Severity>((acc, c) => {
    const s = getSeverity(c.text);
    if (s === "red") return "red";
    if (s === "amber" && acc !== "red") return "amber";
    return acc;
  }, "green");

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-secondary/40 transition-colors"
      >
        <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
          <Icon size={15} className="text-primary" />
        </div>
        <span className="text-sm font-body font-medium text-foreground tracking-wide flex-1 text-left">{title}</span>
        <div className="flex items-center gap-2">
          <SeverityDot severity={maxSeverity} />
          {open ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 pt-1 divide-y divide-border/0">
              {visibleCards.map((c) => (
                <BriefingCard key={c.label} label={c.label} text={c.text} />
              ))}
            </div>
            {footer && <div className="px-5 pb-4">{footer}</div>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Top-level disclaimer banner (always visible) ─────────────────────────────

const DisclaimerBanner = () => (
  <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3.5 flex gap-3">
    <ShieldAlert size={16} className="text-primary flex-shrink-0 mt-0.5" />
    <div className="min-w-0">
      <p className="text-xs font-body text-muted-foreground leading-relaxed">
        This briefing is AI-generated and refreshed monthly. Always verify entry requirements, health advice, and travel advisories with your government's official travel advisory and a qualified medical professional before travel.
      </p>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
        <a
          href="https://www.gov.uk/foreign-travel-advice"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] font-body text-primary hover:text-primary/80 underline underline-offset-2 transition-colors flex items-center gap-1"
        >
          UK: gov.uk/foreign-travel-advice <ExternalLink size={9} />
        </a>
        <a
          href="https://travel.state.gov"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] font-body text-primary hover:text-primary/80 underline underline-offset-2 transition-colors flex items-center gap-1"
        >
          US: travel.state.gov <ExternalLink size={9} />
        </a>
      </div>
    </div>
  </div>
);

// ── Section-level disclaimer cards ───────────────────────────────────────────

const SectionDisclaimer = ({ text }: { text: string }) => (
  <div className="rounded-lg border border-amber-500/20 bg-amber-500/6 px-3.5 py-2.5 flex gap-2">
    <ShieldAlert size={12} className="text-amber-400/70 flex-shrink-0 mt-0.5" />
    <p className="text-[11px] font-body text-amber-200/70 leading-relaxed">{text}</p>
  </div>
);

// ── Shimmer loading state ────────────────────────────────────────────────────

const BriefingShimmer = () => (
  <div className="space-y-4">
    {[...Array(6)].map((_, i) => (
      <div key={i} className="glass-card rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-3">
          <ShimmerSkeleton className="w-8 h-8 rounded-lg" />
          <ShimmerSkeleton variant="text" className="flex-1 h-4" />
        </div>
        <ShimmerSkeleton variant="text" className="w-full h-3" />
        <ShimmerSkeleton variant="text" className="w-3/4 h-3" />
      </div>
    ))}
  </div>
);

// ── Main component ───────────────────────────────────────────────────────────

const BriefingTab = ({ tripId, trip }: BriefingTabProps) => {
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);

  const { data: briefing, isLoading } = useQuery({
    queryKey: ["briefing", trip.destination, trip.country],
    queryFn: async () => {
      // First try to load from DB directly (avoids GPT call if cached)
      const { data } = await supabase
        .from("destination_briefings")
        .select("*")
        .eq("destination", trip.destination)
        .eq("country", trip.country ?? "")
        .maybeSingle();

      if (data?.briefing_updated_at) {
        const age = Date.now() - new Date(data.briefing_updated_at).getTime();
        if (age < 30 * 24 * 60 * 60 * 1000) return data;
      }
      return null;
    },
  });

  const generateBriefing = async (forceRefresh = false) => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-briefing", {
        body: {
          destination: trip.destination,
          country: trip.country,
          trip_type: trip.trip_type,
          start_date: trip.start_date,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      await queryClient.invalidateQueries({ queryKey: ["briefing", trip.destination, trip.country] });
      await queryClient.refetchQueries({ queryKey: ["briefing", trip.destination, trip.country] });
      if (forceRefresh) toast({ title: "Briefing updated", description: "Fresh intelligence loaded." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Could not generate briefing.", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  // Auto-generate if no briefing exists yet
  const shouldAutoGenerate = !isLoading && !briefing && !generating;
  if (shouldAutoGenerate) {
    generateBriefing();
  }

  const isActive = isLoading || generating;

  if (isActive) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
        <DisclaimerBanner />
        <div className="flex items-center gap-3">
          <Shield size={16} className="text-primary" />
          <span className="text-sm tracking-[0.2em] uppercase text-muted-foreground font-body">
            Generating your briefing…
          </span>
          <span className="text-xs text-muted-foreground/60 font-body animate-pulse ml-auto">
            This takes about 10 seconds
          </span>
        </div>
        <BriefingShimmer />
      </motion.div>
    );
  }

  if (!briefing) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
        <DisclaimerBanner />
        <div className="glass-card rounded-2xl p-10 text-center">
          <Shield size={40} className="text-primary mx-auto mb-4 opacity-40" />
          <h3 className="font-heading text-xl mb-2">The Briefing</h3>
          <p className="text-muted-foreground font-body text-sm mb-6 max-w-md mx-auto">
            Essential pre-travel intelligence for {trip.destination} — health, entry, legal, safety, culture, and more.
          </p>
          <Button variant="champagne" onClick={() => generateBriefing()} disabled={generating}>
            <Shield size={16} />
            {generating ? "Generating…" : "Generate Briefing"}
          </Button>
        </div>
      </motion.div>
    );
  }

  // Determine if any red items exist (for the badge in TripDetail)
  const allFields = [
    briefing.health_malaria, briefing.health_water, briefing.health_vaccinations,
    briefing.health_uv, briefing.health_altitude, briefing.entry_visa,
    briefing.entry_passport, briefing.entry_customs, briefing.legal_drugs,
    briefing.legal_photography, briefing.legal_lgbt, briefing.legal_dresscode_law,
    briefing.money_cash_culture, briefing.money_tipping, briefing.money_atm_safety,
    briefing.connectivity_sim, briefing.connectivity_vpn, briefing.safety_areas_avoid,
    briefing.safety_scams, briefing.safety_emergency_numbers, briefing.cultural_calendar,
    briefing.cultural_greetings, briefing.cultural_bargaining, briefing.cultural_taboos,
    briefing.climate_notes,
  ];
  const hasRedItems = allFields.some((f) => getSeverity(f) === "red");

  // Calculate freshness for footer
  const updatedAt = briefing.briefing_updated_at ? new Date(briefing.briefing_updated_at) : null;
  const ageMs = updatedAt ? Date.now() - updatedAt.getTime() : null;
  const ageHours = ageMs ? ageMs / (1000 * 60 * 60) : null;
  const isFresh = ageHours !== null && ageHours < 1;
  const nextRefresh = updatedAt ? new Date(updatedAt.getTime() + 30 * 24 * 60 * 60 * 1000) : null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {/* Top disclaimer — always visible, cannot be dismissed */}
      <DisclaimerBanner />

      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-sm tracking-[0.2em] uppercase text-muted-foreground font-body flex items-center gap-2">
            <Shield size={14} className="text-primary" /> The Briefing
          </h2>
          <p className="text-xs text-muted-foreground/60 font-body mt-0.5">
            Pre-travel intelligence for {trip.destination}
            {hasRedItems && (
              <span className="ml-2 text-red-400 font-medium">— important items flagged below</span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => generateBriefing(true)}
          disabled={generating}
          className="p-2 rounded-xl hover:bg-secondary transition-colors"
          title="Refresh briefing"
        >
          <RefreshCw size={14} className={`text-muted-foreground ${generating ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Sections */}
      <BriefingSection
        title="Health"
        icon={Heart}
        defaultOpen={true}
        cards={[
          { label: "Malaria", text: briefing.health_malaria },
          { label: "Water Safety", text: briefing.health_water },
          { label: "Vaccinations", text: briefing.health_vaccinations },
          { label: "UV & Sun", text: briefing.health_uv },
          { label: "Altitude", text: briefing.health_altitude },
        ]}
        footer={
          <SectionDisclaimer text="Health recommendations are AI-generated. Consult your GP or a travel health clinic before travel — especially for vaccinations and malaria prophylaxis." />
        }
      />

      {/* Travel insurance CTA — shown within Health context */}
      <div className="glass-card rounded-xl px-5 py-4 flex items-center justify-between border border-primary/10">
        <div>
          <p className="text-xs font-body font-medium text-foreground">Travel insurance with medical evacuation cover</p>
          <p className="text-[11px] text-muted-foreground font-body mt-0.5">Strongly recommended for {trip.destination}</p>
        </div>
        <a
          href="#"
          className="flex items-center gap-1.5 text-xs font-body text-primary hover:text-primary/80 transition-colors whitespace-nowrap ml-4"
        >
          Get covered <ExternalLink size={10} />
        </a>
      </div>

      <BriefingSection
        title="Entry & Legal"
        icon={Globe2}
        cards={[
          { label: "Visa", text: briefing.entry_visa },
          { label: "Passport Validity", text: briefing.entry_passport },
          { label: "Customs", text: briefing.entry_customs },
          { label: "Drug Laws", text: briefing.legal_drugs },
          { label: "Photography", text: briefing.legal_photography },
          { label: "LGBTQ+ Safety", text: briefing.legal_lgbt },
          { label: "Dress Code Laws", text: briefing.legal_dresscode_law },
        ]}
        footer={
          <SectionDisclaimer text="Entry requirements change without notice. Verify visa requirements and passport validity with the official embassy or your government's travel advisory before booking." />
        }
      />

      <BriefingSection
        title="Money & Connectivity"
        icon={Banknote}
        cards={[
          { label: "Cash Culture", text: briefing.money_cash_culture },
          { label: "Tipping", text: briefing.money_tipping },
          { label: "ATM Safety", text: briefing.money_atm_safety },
          { label: "SIM Cards", text: briefing.connectivity_sim },
          { label: "VPN", text: briefing.connectivity_vpn },
        ]}
      />

      <BriefingSection
        title="On the Ground"
        icon={MapPin}
        cards={[
          { label: "Areas to Avoid", text: briefing.safety_areas_avoid },
          { label: "Common Scams", text: briefing.safety_scams },
          { label: "Emergency Numbers", text: briefing.safety_emergency_numbers },
        ]}
      />

      <BriefingSection
        title="Culture"
        icon={Landmark}
        cards={[
          { label: "Calendar & Holidays", text: briefing.cultural_calendar },
          { label: "Greetings", text: briefing.cultural_greetings },
          { label: "Bargaining", text: briefing.cultural_bargaining },
          { label: "Taboos", text: briefing.cultural_taboos },
        ]}
      />

      <BriefingSection
        title="Local Knowledge"
        icon={CloudSun}
        cards={[
          { label: "Climate Notes", text: briefing.climate_notes },
        ]}
      />

      {/* Last updated + cache indicator */}
      <div className="pt-2 pb-1 space-y-1 text-center">
        {updatedAt && (
          <p className="text-[10px] text-muted-foreground/50 font-body flex items-center justify-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isFresh ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />
            {isFresh ? "Just generated" : `Last updated ${updatedAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`}
          </p>
        )}
        {nextRefresh && !isFresh && (
          <p className="text-[10px] text-muted-foreground/30 font-body">
            Refreshes automatically {nextRefresh.toLocaleDateString("en-GB", { day: "numeric", month: "long" })}
          </p>
        )}
        <p className="text-[10px] text-muted-foreground/25 font-body">
          AI-generated · Not a substitute for professional advice
        </p>
      </div>
    </motion.div>
  );
};

export default BriefingTab;
export { getSeverity };
