import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Compass, CloudSun, Shirt } from "lucide-react";
import heroImage from "@/assets/hero-travel.jpg";
import dest1 from "@/assets/destination-1.jpg";
import dest2 from "@/assets/destination-2.jpg";
import dest3 from "@/assets/destination-3.jpg";
import Navbar from "@/components/layout/Navbar";

const features = [
  {
    icon: Compass,
    title: "Destination Intelligence",
    description: "Weather forecasts, local events, and cultural insights — curated before you even pack.",
  },
  {
    icon: CloudSun,
    title: "Climate-Aware Capsules",
    description: "Wardrobe suggestions that adapt to temperature shifts, rain, and evening occasions.",
  },
  {
    icon: Shirt,
    title: "Packing Optimisation",
    description: "Smart layering and rewear logic that fits your style into any luggage size.",
  },
];

const destinations = [
  { image: dest1, name: "Amalfi Coast", tag: "Resort" },
  { image: dest2, name: "Paris", tag: "Fashion Week" },
  { image: dest3, name: "Milan", tag: "City Break" },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt="Luxury travel fashion"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/30" />
        </div>

        <div className="relative z-10 text-center max-w-3xl mx-auto px-6">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-sm tracking-[0.3em] uppercase text-primary mb-6 font-body"
          >
            Travel, Styled.
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-3xl sm:text-5xl md:text-7xl font-heading font-medium leading-tight mb-6 md:mb-8"
          >
            Arrive Impeccably
            <br />
            <span className="text-gradient-champagne italic">Everywhere</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="text-lg text-muted-foreground max-w-lg mx-auto mb-10 font-body font-light leading-relaxed"
          >
            Intelligent travel wardrobe planning for the modern, elevated traveller.
            What to wear, what to pack, how to arrive — styled.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="flex items-center justify-center gap-4"
          >
            <Link to="/auth">
              <Button variant="champagne" size="xl">
                Begin Your Journey
                <ArrowRight className="ml-2" size={18} />
              </Button>
            </Link>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.2 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
        >
          <div className="w-px h-16 bg-gradient-to-b from-primary/50 to-transparent" />
        </motion.div>
      </section>

      {/* Features */}
      <section className="py-16 md:py-32 px-4 md:px-6">
        <div className="max-w-5xl mx-auto">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-sm tracking-[0.3em] uppercase text-primary mb-4 font-body"
          >
            The Intelligence
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-5xl font-heading mb-20"
          >
            Your private stylist,
            <br />
            <span className="text-gradient-champagne italic">everywhere you go</span>
          </motion.h2>

          <div className="grid md:grid-cols-3 gap-12">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="group"
              >
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-6 group-hover:shadow-champagne transition-shadow duration-500">
                  <f.icon size={20} className="text-primary" />
                </div>
                <h3 className="text-lg font-heading mb-3">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed font-body">
                  {f.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Destinations */}
      <section className="py-16 md:py-32 px-4 md:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-sm tracking-[0.3em] uppercase text-primary mb-4 font-body"
          >
            Trending Now
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-5xl font-heading mb-16"
          >
            Featured Destinations
          </motion.h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {destinations.map((d, i) => (
              <motion.div
                key={d.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group relative aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer"
              >
                <img
                  src={d.image}
                  alt={d.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <span className="text-xs tracking-[0.2em] uppercase text-primary font-body">{d.tag}</span>
                  <h3 className="text-2xl font-heading mt-1">{d.name}</h3>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-32 px-4 md:px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto"
        >
          <h2 className="text-3xl md:text-5xl font-heading mb-6">
            I travel <span className="text-gradient-champagne italic">differently</span>
          </h2>
          <p className="text-muted-foreground mb-10 font-body leading-relaxed">
            Join Moodmiles. Intelligent, beautiful, private.
          </p>
          <Link to="/auth">
            <Button variant="champagne" size="xl">
              Start Planning
              <ArrowRight className="ml-2" size={18} />
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <span className="font-heading text-lg">
            Mood<span className="text-gradient-champagne">miles</span>
          </span>
          <p className="text-xs text-muted-foreground font-body">
            © 2026 Moodmiles. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
