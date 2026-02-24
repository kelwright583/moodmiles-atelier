import { useState } from "react";
import { motion } from "framer-motion";
import { CloudSun, Droplets, Wind, Sun, Moon, Calendar, MapPin, Shirt, Briefcase, Grid3X3, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/layout/Navbar";
import dest2 from "@/assets/destination-2.jpg";

// Mock data
const weatherData = [
  { day: "Mon 15", high: 14, low: 8, rain: 30, icon: CloudSun, condition: "Partly cloudy" },
  { day: "Tue 16", high: 12, low: 6, rain: 60, icon: Droplets, condition: "Light rain" },
  { day: "Wed 17", high: 15, low: 9, rain: 10, icon: Sun, condition: "Clear" },
  { day: "Thu 18", high: 13, low: 7, rain: 45, icon: CloudSun, condition: "Overcast" },
  { day: "Fri 19", high: 16, low: 10, rain: 5, icon: Sun, condition: "Sunny" },
  { day: "Sat 20", high: 14, low: 8, rain: 20, icon: CloudSun, condition: "Partly cloudy" },
  { day: "Sun 21", high: 13, low: 7, rain: 40, icon: Droplets, condition: "Showers" },
];

const events = [
  { name: "Paris Fashion Week SS27", type: "Fashion", date: "Mar 15–20", location: "Palais de Tokyo" },
  { name: "Louvre Late Night Opening", type: "Cultural", date: "Mar 17", location: "Musée du Louvre" },
  { name: "Salon du Vintage", type: "Exhibition", date: "Mar 18–19", location: "Carreau du Temple" },
];

const capsuleItems = [
  { category: "Day Look", description: "Tailored wool trousers, cashmere turtleneck, structured blazer", tags: ["Structured", "Minimal"], color: "Camel / Charcoal" },
  { category: "Evening Look", description: "Silk midi dress, statement earrings, pointed heel", tags: ["Feminine", "Classic"], color: "Black / Gold" },
  { category: "Travel Day", description: "Wide-leg trousers, soft knit, leather jacket, clean sneakers", tags: ["Minimal", "Street"], color: "Navy / Cream" },
  { category: "Statement", description: "Sculptural coat, monochrome outfit, bold clutch", tags: ["Avant-garde", "Tailored"], color: "All black" },
  { category: "Rain Ready", description: "Water-resistant trench, ankle boots, crossbody bag", tags: ["Classic", "Structured"], color: "Khaki / Black" },
];

const packingMatrix = [
  { item: "Tops", recommended: 5, note: "Layerable, mix of knit & silk" },
  { item: "Bottoms", recommended: 3, note: "Neutral tones, versatile" },
  { item: "Dresses", recommended: 2, note: "1 day, 1 evening" },
  { item: "Outerwear", recommended: 2, note: "Blazer + trench" },
  { item: "Shoes", recommended: 3, note: "Sneaker, heel, ankle boot" },
  { item: "Accessories", recommended: 4, note: "Scarf, earrings, bag, belt" },
];

const tabs = ["Overview", "Capsule", "Packing", "Board"] as const;
type Tab = typeof tabs[number];

const TripDetail = () => {
  const [activeTab, setActiveTab] = useState<Tab>("Overview");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <div className="relative h-72 overflow-hidden">
        <img src={dest2} alt="Paris" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute bottom-8 left-8 right-8 max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <span className="text-xs tracking-[0.2em] uppercase text-primary font-body">Fashion Week</span>
            <h1 className="text-4xl md:text-5xl font-heading mt-1">Paris</h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground font-body">
              <span className="flex items-center gap-1"><Calendar size={12} className="text-primary" /> Mar 15 – 21, 2026</span>
              <span className="flex items-center gap-1"><MapPin size={12} className="text-primary" /> France</span>
            </div>
          </motion.div>
        </div>
      </div>

      <main className="px-6 pb-20">
        <div className="max-w-6xl mx-auto">
          {/* Tabs */}
          <div className="flex gap-1 mt-8 mb-12 border-b border-border">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-3 text-sm font-body tracking-wide transition-all duration-300 relative ${
                  activeTab === tab ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab}
                {activeTab === tab && (
                  <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-px bg-gradient-champagne" />
                )}
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {activeTab === "Overview" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12">
              {/* Weather */}
              <section>
                <h2 className="text-sm tracking-[0.2em] uppercase text-muted-foreground mb-6 font-body flex items-center gap-2">
                  <CloudSun size={14} className="text-primary" /> 7-Day Forecast
                </h2>
                <div className="grid grid-cols-7 gap-3">
                  {weatherData.map((d) => (
                    <div key={d.day} className="glass-card rounded-xl p-4 text-center hover:shadow-champagne transition-all duration-300">
                      <p className="text-xs text-muted-foreground font-body mb-3">{d.day}</p>
                      <d.icon size={20} className="mx-auto text-primary mb-3" />
                      <p className="text-lg font-heading">{d.high}°</p>
                      <p className="text-xs text-muted-foreground">{d.low}°</p>
                      <div className="mt-3 flex items-center justify-center gap-1">
                        <Droplets size={10} className="text-primary/60" />
                        <span className="text-xs text-muted-foreground">{d.rain}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Events */}
              <section>
                <h2 className="text-sm tracking-[0.2em] uppercase text-muted-foreground mb-6 font-body flex items-center gap-2">
                  <Calendar size={14} className="text-primary" /> Local Events
                </h2>
                <div className="space-y-3">
                  {events.map((e) => (
                    <div key={e.name} className="glass-card rounded-xl p-5 flex items-center justify-between hover:shadow-champagne transition-all duration-300">
                      <div>
                        <h3 className="font-heading text-base">{e.name}</h3>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground font-body">
                          <span>{e.date}</span>
                          <span className="flex items-center gap-1"><MapPin size={10} />{e.location}</span>
                        </div>
                      </div>
                      <span className="text-xs tracking-[0.15em] uppercase text-primary font-body bg-secondary px-3 py-1 rounded-full">{e.type}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Quick Style Intel */}
              <section className="glass-card rounded-2xl p-8">
                <h2 className="text-sm tracking-[0.2em] uppercase text-muted-foreground mb-4 font-body">Paris Style Intel</h2>
                <p className="text-muted-foreground font-body leading-relaxed text-sm">
                  March in Paris calls for <span className="text-foreground">structured layering</span> — tailored coats over knits, 
                  with a focus on <span className="text-foreground">neutral palettes</span>. Fashion Week brings a shift toward 
                  <span className="text-foreground"> elevated minimalism</span>. Pack statement outerwear and consider 
                  <span className="text-foreground"> rain-appropriate footwear</span> for afternoon showers.
                </p>
              </section>
            </motion.div>
          )}

          {/* Capsule Tab */}
          {activeTab === "Capsule" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm tracking-[0.2em] uppercase text-muted-foreground font-body flex items-center gap-2">
                  <Shirt size={14} className="text-primary" /> Curated Capsule
                </h2>
                <p className="text-xs text-muted-foreground font-body">Based on your style profile & weather</p>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {capsuleItems.map((item) => (
                  <div key={item.category} className="glass-card rounded-xl p-6 hover:shadow-champagne transition-all duration-300 group">
                    <div className="w-full aspect-[3/4] rounded-lg bg-secondary mb-4 flex items-center justify-center">
                      <Shirt size={32} className="text-muted-foreground/30" />
                    </div>
                    <span className="text-xs tracking-[0.15em] uppercase text-primary font-body">{item.category}</span>
                    <p className="text-sm font-body text-foreground mt-2 leading-relaxed">{item.description}</p>
                    <p className="text-xs text-muted-foreground font-body mt-2">Palette: {item.color}</p>
                    <div className="flex gap-2 mt-3">
                      {item.tags.map((tag) => (
                        <span key={tag} className="text-xs bg-secondary text-muted-foreground px-2 py-0.5 rounded-full font-body">{tag}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Packing Tab */}
          {activeTab === "Packing" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-sm tracking-[0.2em] uppercase text-muted-foreground font-body flex items-center gap-2">
                  <Briefcase size={14} className="text-primary" /> Packing Matrix
                </h2>
                <div className="glass-card rounded-full px-4 py-1.5">
                  <span className="text-xs font-body text-primary">Medium Case · 7 Days</span>
                </div>
              </div>

              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="grid grid-cols-3 gap-px bg-border text-xs tracking-[0.15em] uppercase text-muted-foreground font-body">
                  <div className="bg-card p-4">Category</div>
                  <div className="bg-card p-4 text-center">Recommended</div>
                  <div className="bg-card p-4">Notes</div>
                </div>
                {packingMatrix.map((row) => (
                  <div key={row.item} className="grid grid-cols-3 gap-px bg-border">
                    <div className="bg-card p-4 font-heading text-sm">{row.item}</div>
                    <div className="bg-card p-4 text-center">
                      <span className="text-lg font-heading text-gradient-champagne">{row.recommended}</span>
                    </div>
                    <div className="bg-card p-4 text-xs text-muted-foreground font-body">{row.note}</div>
                  </div>
                ))}
              </div>

              <div className="mt-8 glass-card rounded-xl p-6">
                <p className="text-xs tracking-[0.15em] uppercase text-primary font-body mb-2">Smart Tip</p>
                <p className="text-sm text-muted-foreground font-body leading-relaxed">
                  Your trip includes 2 rain days. Prioritise a versatile trench and waterproof ankle boots. 
                  Rewear potential: your neutral bottoms work across all 5 outfit categories.
                </p>
              </div>
            </motion.div>
          )}

          {/* Board Tab */}
          {activeTab === "Board" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-sm tracking-[0.2em] uppercase text-muted-foreground font-body flex items-center gap-2">
                  <Grid3X3 size={14} className="text-primary" /> Mood Board
                </h2>
                <Button variant="champagne-outline" size="sm">
                  Add Item
                </Button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="group glass-card rounded-xl overflow-hidden cursor-pointer hover:shadow-champagne transition-all duration-300"
                    style={{ aspectRatio: i % 3 === 0 ? "3/4" : "1/1" }}
                  >
                    <div className="w-full h-full bg-secondary flex items-center justify-center">
                      <div className="text-center">
                        <Grid3X3 size={24} className="mx-auto text-muted-foreground/20 mb-2" />
                        <p className="text-xs text-muted-foreground/40 font-body">Look {i + 1}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-xs text-muted-foreground font-body mt-6 text-center">
                Drag and drop to reorder · Click to edit · Private by default
              </p>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
};

export default TripDetail;
