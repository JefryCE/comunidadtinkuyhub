import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Bell, BellOff, MapPin, Mail, Clock, ChevronLeft, Loader2, Locate } from "lucide-react";

import Navbar from "@/components/landing/Navbar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { usePushNotifications, type NotificationFrequency } from "@/hooks/usePushNotifications";

const frequencyLabels: Record<NotificationFrequency, string> = {
  immediate: "Inmediato",
  daily: "Resumen diario",
  weekly: "Resumen semanal",
};

const frequencyDescriptions: Record<NotificationFrequency, string> = {
  immediate: "Recibe una notificación cada vez que se cree un evento cercano",
  daily: "Recibe un resumen de eventos nuevos cada día a las 9 AM",
  weekly: "Recibe un resumen semanal cada lunes a las 9 AM",
};

const NotificationsSettings = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const {
    settings,
    loading,
    permissionState,
    requestPermission,
    updateSettings,
    saveLocation,
  } = usePushNotifications();

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center pt-32">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 pt-24 pb-16">
        <div className="flex items-center gap-3 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">Notificaciones</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Configura cómo y cuándo te avisamos</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Browser permission status */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-2xl shadow-card p-5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {permissionState === "granted" ? (
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <Bell className="w-5 h-5 text-emerald-500" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                    <BellOff className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <p className="font-semibold text-sm text-foreground">Permisos del navegador</p>
                  <p className="text-xs text-muted-foreground">
                    {permissionState === "granted" && "Notificaciones activas ✅"}
                    {permissionState === "denied" && "Bloqueadas — actívalas en la configuración del navegador"}
                    {permissionState === "default" && "Aún no has dado permisos"}
                  </p>
                </div>
              </div>
              {permissionState !== "granted" && (
                <Button
                  size="sm"
                  onClick={requestPermission}
                  disabled={permissionState === "denied"}
                  className="gradient-cta text-primary-foreground border-0 text-xs"
                >
                  Activar
                </Button>
              )}
            </div>
          </motion.div>

          {/* Push Notifications toggle */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-card border border-border rounded-2xl shadow-card p-5 space-y-5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-primary" />
                <div>
                  <Label className="text-sm font-semibold">Notificaciones push</Label>
                  <p className="text-xs text-muted-foreground">Eventos cercanos en tu navegador</p>
                </div>
              </div>
              <Switch
                checked={settings?.push_enabled ?? true}
                onCheckedChange={(val) => updateSettings({ push_enabled: val })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-primary" />
                <div>
                  <Label className="text-sm font-semibold">Notificaciones por email</Label>
                  <p className="text-xs text-muted-foreground">Resumen de actividad en tu correo</p>
                </div>
              </div>
              <Switch
                checked={settings?.email_enabled ?? true}
                onCheckedChange={(val) => updateSettings({ email_enabled: val })}
              />
            </div>
          </motion.div>

          {/* Proximity radius */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card border border-border rounded-2xl shadow-card p-5 space-y-4"
          >
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-primary" />
              <div className="flex-1">
                <Label className="text-sm font-semibold">Radio de proximidad</Label>
                <p className="text-xs text-muted-foreground">
                  Solo eventos dentro de{" "}
                  <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-bold ml-0.5">
                    {settings?.proximity_radius_km ?? 10} km
                  </Badge>
                </p>
              </div>
            </div>

            <Slider
              min={1}
              max={100}
              step={1}
              value={[settings?.proximity_radius_km ?? 10]}
              onValueChange={([val]) => updateSettings({ proximity_radius_km: val })}
              className="mt-2"
            />

            <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium">
              <span>1 km</span>
              <span>50 km</span>
              <span>100 km</span>
            </div>

            <div className="pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-foreground">Tu ubicación guardada</p>
                  <p className="text-[10px] text-muted-foreground">
                    {settings?.last_lat && settings?.last_lng
                      ? `${settings.last_lat.toFixed(4)}, ${settings.last_lng.toFixed(4)}`
                      : "Sin ubicación guardada aún"}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={saveLocation}
                  className="text-xs gap-1.5"
                >
                  <Locate className="w-3.5 h-3.5" />
                  Actualizar
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Frequency */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-card border border-border rounded-2xl shadow-card p-5 space-y-4"
          >
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-primary" />
              <div className="flex-1">
                <Label className="text-sm font-semibold">Frecuencia</Label>
                <p className="text-xs text-muted-foreground">
                  {frequencyDescriptions[(settings?.frequency as NotificationFrequency) ?? "immediate"]}
                </p>
              </div>
            </div>

            <Select
              value={settings?.frequency ?? "immediate"}
              onValueChange={(val) => updateSettings({ frequency: val as NotificationFrequency })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(frequencyLabels) as NotificationFrequency[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {frequencyLabels[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default NotificationsSettings;
