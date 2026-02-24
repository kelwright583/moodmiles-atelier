import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Plus, CloudSun, MapPin, Calendar, ArrowRight, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/layout/Navbar";
import dest1 from "@/assets/destination-1.jpg";
import dest2 from "@/assets/destination-2.jpg";
import dest3 from "@/assets/destination-3.jpg";

const mockTrips = [
  {
    id: "1",
    destination: "Paris",
    country: "France",
    dates: "Mar 15 – 22, 2026",
    type: "Fashion Week",
    weather: "12°C / Light rain",
    image: dest2,
  },
  {
    id: "2",
    destination: "Amalfi Coast",
    country: "Italy",
    dates: "Apr 5 – 12, 2026",
    type: "Leisure",
    weather: "22°C / Sunny",
    image: dest1,
  },
];

const trending = [
  { city: "Milan", trend: "Quiet luxury & structured tailoring", image: dest3 },
  { city: "Paris", trend: "Layered neutrals & statement coats", image: dest2 },
  { city: "Amalfi", trend: "Linen resort & gold accessories", image: dest1 },
];

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-28 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-end justify-between mb-16"
          >
            <div>
              <p className="text-sm tracking-[0.3em] uppercase text-primary mb-2 font-body">Dashboard</p>
              <h1 className="text-4xl md:text-5xl font-heading">
                Good evening
              </h1>
            </div>
            <Link to="/create-trip">
              <Button variant="champagne" size="lg">
                <Plus size={18} />
                New Trip
              </Button>
            </Link>
          </motion.div>

          {/* Upcoming Trips */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-20"
          >
            <h2 className="text-sm tracking-[0.2em] uppercase text-muted-foreground mb-8 font-body">Upcoming Trips</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {mockTrips.map((trip) => (
                <Link to={`/trip/${trip.id}`} key={trip.id}>
                  <div className="group glass-card rounded-2xl overflow-hidden hover:shadow-champagne transition-all duration-500 cursor-pointer">
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={trip.image}
                        alt={trip.destination}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
                      <div className="absolute top-4 right-4">
                        <span className="text-xs tracking-[0.15em] uppercase bg-secondary/80 backdrop-blur-sm px-3 py-1.5 rounded-full text-primary font-body">
                          {trip.type}
                        </span>
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-xl font-heading">{trip.destination}</h3>
                          <p className="text-sm text-muted-foreground font-body">{trip.country}</p>
                        </div>
                        <ArrowRight size={18} className="text-primary mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground font-body">
                        <span className="flex items-center gap-1.5">
                          <Calendar size={12} className="text-primary" />
                          {trip.dates}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <CloudSun size={12} className="text-primary" />
                          {trip.weather}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </motion.section>

          {/* Trending */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center gap-2 mb-8">
              <TrendingUp size={14} className="text-primary" />
              <h2 className="text-sm tracking-[0.2em] uppercase text-muted-foreground font-body">Trending This Week</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {trending.map((t, i) => (
                <motion.div
                  key={t.city}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  className="glass-card rounded-xl p-5 hover:shadow-champagne transition-all duration-500"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <img src={t.image} alt={t.city} className="w-10 h-10 rounded-lg object-cover" />
                    <div>
                      <p className="text-sm font-heading">{t.city}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin size={10} className="text-primary" />
                        Style Intel
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground font-body leading-relaxed">
                    {t.trend}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.section>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
