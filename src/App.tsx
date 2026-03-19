import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { lazy, Suspense, useEffect } from "react";
import { initAnalytics } from "./lib/analytics";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Offline from "./pages/Offline";
import FloatingActionButton from "./components/layout/FloatingActionButton";
import InstallPrompt from "./components/InstallPrompt";
import { CookieConsent } from "./components/CookieConsent";

// Lazy-loaded pages — reduces initial bundle size
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const CreateTrip = lazy(() => import("./pages/CreateTrip"));
const TripDetail = lazy(() => import("./pages/TripDetail"));
const TripLookbook = lazy(() => import("./pages/TripLookbook"));
const Settings = lazy(() => import("./pages/Settings"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Profile = lazy(() => import("./pages/Profile"));
const InviteAccept = lazy(() => import("./pages/InviteAccept"));
const PublicEvent = lazy(() => import("./pages/PublicEvent"));
const SpotifyCallback = lazy(() => import("./pages/SpotifyCallback"));
const PublicTrip = lazy(() => import("./pages/PublicTrip"));

const queryClient = new QueryClient();

const LoadingSpinner = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="w-8 h-8 rounded-full bg-gold animate-pulse" />
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/auth" replace />;
  if (!user.email_confirmed_at && user.app_metadata?.provider === "email") {
    return <Navigate to="/auth?verify=1" replace />;
  }
  return <>{children}</>;
};

/** Wraps protected routes — redirects to /onboarding if profile not complete */
const OnboardingGuard = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const { data: profile, isLoading } = useQuery({
    queryKey: ["onboarding-check", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("user_id", user!.id)
        .single();
      return data;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 min cache — don't re-check on every nav
  });

  if (isLoading) return <LoadingSpinner />;
  if (profile && !profile.onboarding_completed) {
    return <Navigate to="/onboarding" replace />;
  }
  return <>{children}</>;
};

const AppInner = () => {
  useEffect(() => { initAnalytics(); }, []);
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AppInner />
        <BrowserRouter>
          <FloatingActionButton />
          <InstallPrompt />
          <CookieConsent />
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              {/* Public */}
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/profile/:handle" element={<Profile />} />
              <Route path="/invite/:token" element={<InviteAccept />} />
              <Route path="/event/:share_token" element={<PublicEvent />} />
              <Route path="/auth/spotify/callback" element={<SpotifyCallback />} />
              <Route path="/trip/share/:shareToken" element={<PublicTrip />} />

              {/* Onboarding — protected but no OnboardingGuard (is the onboarding itself) */}
              <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />

              {/* Settings — protected, skip OnboardingGuard so users can edit during onboarding */}
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

              {/* Main app — protected + onboarding required */}
              <Route path="/dashboard" element={<ProtectedRoute><OnboardingGuard><Dashboard /></OnboardingGuard></ProtectedRoute>} />
              <Route path="/create-trip" element={<ProtectedRoute><OnboardingGuard><CreateTrip /></OnboardingGuard></ProtectedRoute>} />
              <Route path="/trip/:id" element={<ProtectedRoute><OnboardingGuard><TripDetail /></OnboardingGuard></ProtectedRoute>} />
              <Route path="/trip/:tripId/lookbook" element={<ProtectedRoute><TripLookbook /></ProtectedRoute>} />

              <Route path="/offline" element={<Offline />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
