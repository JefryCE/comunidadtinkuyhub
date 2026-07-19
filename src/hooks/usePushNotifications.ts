import { useEffect, useState, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type NotificationFrequency = "immediate" | "daily" | "weekly";

export interface NotificationSettings {
  id: string;
  user_id: string;
  push_enabled: boolean;
  email_enabled: boolean;
  proximity_radius_km: number;
  frequency: NotificationFrequency;
  last_lat: number | null;
  last_lng: number | null;
  fcm_token: string | null;
  fcm_token_updated_at: string | null;
  created_at: string;
  updated_at: string;
}

const DEFAULT_SETTINGS: Omit<
  NotificationSettings,
  "id" | "user_id" | "created_at" | "updated_at" | "fcm_token" | "fcm_token_updated_at"
> = {
  push_enabled: true,
  email_enabled: true,
  proximity_radius_km: 10,
  frequency: "immediate",
  last_lat: null,
  last_lng: null,
};

export function usePushNotifications() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissionState, setPermissionState] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );

  // Fetch settings from DB
  const fetchSettings = useCallback(async () => {
    if (!user) {
      setSettings(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("user_notification_settings" as any)
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings(data as any as NotificationSettings);
      } else {
        // Create default settings
        const { data: created, error: createError } = await supabase
          .from("user_notification_settings" as any)
          .insert({ user_id: user.id, ...DEFAULT_SETTINGS } as any)
          .select("*")
          .single();

        if (createError) throw createError;
        setSettings(created as any as NotificationSettings);
      }
    } catch (e: any) {
      console.error("Error fetching notification settings:", e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Registra el token FCM del dispositivo en user_notification_settings para que
  // el backend (pendiente: Edge Function despachadora, ver plan de app Android)
  // pueda enviar push reales. Solo aplica dentro de la app nativa (Capacitor).
  const registerNativePush = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    const { PushNotifications } = await import("@capacitor/push-notifications");

    const permStatus = await PushNotifications.checkPermissions();
    let granted = permStatus.receive === "granted";

    if (!granted && permStatus.receive !== "denied") {
      const req = await PushNotifications.requestPermissions();
      granted = req.receive === "granted";
    }

    if (!granted) {
      toast.error("Las notificaciones están bloqueadas. Habilítalas en la configuración de Android.");
      setPermissionState("denied");
      return false;
    }

    setPermissionState("granted");

    return new Promise((resolve) => {
      PushNotifications.addListener("registration", async (token) => {
        try {
          await supabase
            .from("user_notification_settings" as any)
            .update({ fcm_token: token.value, fcm_token_updated_at: new Date().toISOString() } as any)
            .eq("user_id", user.id);
          toast.success("🔔 ¡Notificaciones activadas!");
          resolve(true);
        } catch (e: any) {
          console.error("No se pudo guardar el token de notificaciones:", e);
          resolve(false);
        }
      });

      PushNotifications.addListener("registrationError", (err) => {
        console.error("Error registrando push notifications:", err);
        toast.error("No se pudo activar las notificaciones push.");
        resolve(false);
      });

      PushNotifications.register();
    });
  }, [user]);

  // Solicita permiso de notificaciones. En la app nativa registra push reales (FCM);
  // en navegador usa la Notification API (no llega con la app/pestaña cerrada).
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (Capacitor.isNativePlatform()) {
      return registerNativePush();
    }

    if (typeof Notification === "undefined") {
      toast.error("Tu navegador no soporta notificaciones push.");
      return false;
    }

    if (Notification.permission === "granted") {
      setPermissionState("granted");
      return true;
    }

    if (Notification.permission === "denied") {
      toast.error("Las notificaciones están bloqueadas. Habilítalas en la configuración del navegador.");
      setPermissionState("denied");
      return false;
    }

    const result = await Notification.requestPermission();
    setPermissionState(result);

    if (result === "granted") {
      toast.success("🔔 ¡Notificaciones activadas!");
      return true;
    } else {
      toast.info("No se activaron las notificaciones.");
      return false;
    }
  }, [registerNativePush]);

  // Update settings in DB
  const updateSettings = useCallback(
    async (updates: Partial<Omit<NotificationSettings, "id" | "user_id" | "created_at">>) => {
      if (!user || !settings) return;

      try {
        const { error } = await supabase
          .from("user_notification_settings" as any)
          .update({ ...updates, updated_at: new Date().toISOString() } as any)
          .eq("user_id", user.id);

        if (error) throw error;

        setSettings((prev) => (prev ? { ...prev, ...updates } : prev));
        toast.success("Preferencias actualizadas");
      } catch (e: any) {
        toast.error(e?.message ?? "No se pudieron guardar los cambios");
      }
    },
    [user, settings]
  );

  // Save user's current GPS location
  const saveLocation = useCallback(async () => {
    if (!user) return;

    if (!navigator.geolocation) {
      toast.error("Tu navegador no soporta geolocalización.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        await updateSettings({ last_lat: lat, last_lng: lng });
        toast.success("📍 Ubicación guardada para notificaciones de proximidad");
      },
      () => {
        toast.error("No se pudo obtener tu ubicación. Permítelo en tu navegador.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [user, updateSettings]);

  // Send a local browser notification (no aplica en la app nativa: ahí las push
  // reales las entrega el sistema operativo vía FCM, no el navegador).
  const sendLocalNotification = useCallback((title: string, body: string, url?: string) => {
    if (Capacitor.isNativePlatform()) return;
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;

    const notif = new Notification(title, {
      body,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
    });

    if (url) {
      notif.onclick = () => {
        window.focus();
        window.location.href = url;
      };
    }
  }, []);

  return {
    settings,
    loading,
    permissionState,
    requestPermission,
    updateSettings,
    saveLocation,
    sendLocalNotification,
    refetch: fetchSettings,
  };
}
