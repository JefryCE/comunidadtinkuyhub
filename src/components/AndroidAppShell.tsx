import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Capacitor } from "@capacitor/core";

/**
 * Inicialización que solo tiene sentido dentro de la app nativa (Capacitor):
 * - botón físico de "atrás" de Android navega por el historial en vez de cerrar la app
 * - oculta el splash screen nativo una vez que React ya montó
 * - fija el color de la barra de estado acorde al theme
 *
 * No renderiza nada; se monta una sola vez en App.tsx, igual que NotificationPermission.
 */
export function AndroidAppShell() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let backListener: { remove: () => void } | undefined;
    let cancelled = false;

    (async () => {
      const { App: CapacitorApp } = await import("@capacitor/app");
      const handle = await CapacitorApp.addListener("backButton", () => {
        if (location.pathname !== "/" && window.history.length > 1) {
          navigate(-1);
        } else {
          CapacitorApp.exitApp();
        }
      });
      if (cancelled) {
        handle.remove();
      } else {
        backListener = handle;
      }
    })();

    return () => {
      cancelled = true;
      backListener?.remove();
    };
    // location.pathname se lee dentro del listener más reciente en cada render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, location.pathname]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    (async () => {
      try {
        const { SplashScreen } = await import("@capacitor/splash-screen");
        await SplashScreen.hide();
      } catch {
        // el plugin puede no estar disponible en web/desarrollo; no es crítico
      }

      try {
        const { StatusBar, Style } = await import("@capacitor/status-bar");
        const isDark = document.documentElement.classList.contains("dark");
        await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
        await StatusBar.setBackgroundColor({ color: isDark ? "#15171b" : "#ffffff" });
      } catch {
        // idem
      }
    })();
  }, []);

  return null;
}
