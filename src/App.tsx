import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { AndroidAppShell } from "@/components/AndroidAppShell";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Profile from "./pages/Profile";
import Dashboard from "./pages/Dashboard";
import EventsMap from "./pages/EventsMap";
import EventDetail from "./pages/EventDetail";
import OrgProfile from "./pages/OrgProfile";
import NotFound from "./pages/NotFound";
import Leaderboard from "./pages/Leaderboard";
import ManageAttendance from "./pages/ManageAttendance";
import UserProfile from "./pages/UserProfile";
import NotificationsSettings from "./pages/NotificationsSettings";
import EventHistory from "./pages/EventHistory";
import ResetPassword from "./pages/ResetPassword";
import DeleteAccount from "./pages/DeleteAccount";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import NotificationPermission from "@/components/ui/NotificationPermission";

const queryClient = new QueryClient();

// En la app nativa (Android) no tiene sentido mostrar la landing de marketing
// pensada para la web: quien se descargó la app ya quiere entrar. En la web
// la landing pública se mantiene igual, para descubrimiento sin cuenta.
const HomeRoute = () => {
  const { user, loading } = useAuth();
  if (!loading && Capacitor.isNativePlatform() && !user) {
    return <Navigate to="/auth" replace />;
  }
  return <Index />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomeRoute />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/eventos" element={<EventsMap />} />
            <Route path="/evento/:eventId" element={<EventDetail />} />
            <Route path="/organizacion/:orgId" element={<OrgProfile />} />
            <Route path="/ranking" element={<Leaderboard />} />
            <Route path="/evento/:eventId/asistencia" element={<ManageAttendance />} />
            <Route path="/usuario/:userId" element={<UserProfile />} />
            <Route path="/notificaciones" element={<NotificationsSettings />} />
            <Route path="/historial" element={<EventHistory />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/eliminar-cuenta" element={<DeleteAccount />} />
            <Route path="/privacidad" element={<PrivacyPolicy />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <NotificationPermission />
          <AndroidAppShell />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
