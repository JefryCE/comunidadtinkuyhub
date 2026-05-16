import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
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
import NotificationsSettings from "./pages/NotificationsSettings";
import EventHistory from "./pages/EventHistory";
import NotificationPermission from "@/components/ui/NotificationPermission";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/eventos" element={<EventsMap />} />
            <Route path="/evento/:eventId" element={<EventDetail />} />
            <Route path="/organizacion/:orgId" element={<OrgProfile />} />
            <Route path="/ranking" element={<Leaderboard />} />
            <Route path="/evento/:eventId/asistencia" element={<ManageAttendance />} />
            <Route path="/notificaciones" element={<NotificationsSettings />} />
            <Route path="/historial" element={<EventHistory />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <NotificationPermission />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
