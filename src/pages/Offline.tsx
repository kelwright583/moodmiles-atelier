import { WifiOff } from "lucide-react";

const Offline = () => {
  const cachedTrips: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("trip_cache_")) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.destination) cachedTrips.push(parsed.destination);
        }
      }
    }
  } catch {
    // localStorage unavailable
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-6">
          <WifiOff size={28} className="text-primary" />
        </div>
        <h1 className="text-3xl font-heading mb-3">You're offline</h1>
        <p className="text-muted-foreground font-body text-sm mb-8">
          It looks like you've lost your connection. Don't worry — your trips are still here.
        </p>

        {cachedTrips.length > 0 && (
          <div className="text-left">
            <p className="text-xs tracking-[0.2em] uppercase text-primary font-body mb-3">
              Cached Trips
            </p>
            <ul className="space-y-2">
              {cachedTrips.map((dest, i) => (
                <li key={i} className="text-sm font-body text-foreground bg-secondary rounded-xl px-4 py-3">
                  {dest}
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          onClick={() => window.location.reload()}
          className="mt-8 text-sm text-primary font-body hover:underline"
        >
          Try again
        </button>

        <p className="mt-12 text-xs text-muted-foreground/40 font-body tracking-[0.2em] uppercase">
          Concierge Styled
        </p>
      </div>
    </div>
  );
};

export default Offline;
