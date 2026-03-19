import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, MapPin, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

export interface TrendingDestination {
  city: string;
  country: string;
  tagline: string;
  why_trending: string;
  highlights: string[];
  vibe: string;
  best_for: string[];
  image_url?: string | null;
}

interface Props {
  destination: TrendingDestination | null;
  onClose: () => void;
}

const TrendingDestinationDrawer = ({ destination, onClose }: Props) => {
  if (!destination) return null;

  return (
    <AnimatePresence>
      {destination && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[92vh] overflow-y-auto rounded-t-3xl bg-background border-t border-border md:inset-x-auto md:left-1/2 md:top-1/2 md:bottom-auto md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-2xl md:w-[calc(100%-3rem)] md:max-h-[85vh] md:rounded-2xl md:border"
          >
            {/* Hero image */}
            <div className="relative aspect-[16/10] md:aspect-[16/9] overflow-hidden rounded-t-3xl md:rounded-t-2xl">
              {destination.image_url ? (
                <img
                  src={destination.image_url}
                  alt={destination.city}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full bg-secondary" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />

              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-background/60 backdrop-blur-md flex items-center justify-center text-foreground hover:bg-background/80 transition-colors"
              >
                <X size={18} />
              </button>

              {/* Vibe pill over the image */}
              <div className="absolute top-4 left-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/60 backdrop-blur-md text-xs tracking-[0.15em] uppercase font-body text-primary">
                  <Sparkles size={12} />
                  {destination.vibe}
                </span>
              </div>

              {/* City + country over the image */}
              <div className="absolute bottom-6 left-6 right-6">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <MapPin size={14} className="text-primary" />
                  <span className="eyebrow">{destination.country}</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-heading leading-tight">{destination.city}</h2>
                <p className="text-sm md:text-base font-body italic text-primary mt-1">{destination.tagline}</p>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 md:px-8 py-6 md:py-8 space-y-8">
              {/* Why it's trending */}
              <div>
                <p className="eyebrow text-primary mb-3">Why It's Trending</p>
                <p className="text-sm md:text-base text-muted-foreground font-body leading-relaxed">
                  {destination.why_trending}
                </p>
              </div>

              {/* Highlights */}
              <div>
                <p className="eyebrow text-primary mb-4">What Makes It Extraordinary</p>
                <div className="space-y-3">
                  {destination.highlights.map((h, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-1 h-1 rounded-full bg-primary mt-2 shrink-0" />
                      <p className="text-sm text-foreground/90 font-body leading-relaxed">{h}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Best for tags */}
              <div>
                <p className="eyebrow text-primary mb-3">Best For</p>
                <div className="flex flex-wrap gap-2">
                  {destination.best_for.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1.5 rounded-full bg-secondary text-xs font-body text-muted-foreground tracking-wide"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <div className="pt-2 pb-2">
                <Link
                  to={`/create-trip?destination=${encodeURIComponent(destination.city)}`}
                  className="inline-flex items-center justify-center gap-3 font-body w-full md:w-auto"
                >
                  Plan Your Trip to {destination.city}
                  <ArrowRight size={16} strokeWidth={2} />
                </Link>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default TrendingDestinationDrawer;
