import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { App as CapacitorApp } from "@capacitor/app";
import { supabase } from "@/integrations/supabase/client";

// Debe coincidir con el intent-filter agregado en android/app/src/main/AndroidManifest.xml
// y con una Redirect URL registrada en Supabase Dashboard > Authentication > URL Configuration.
const NATIVE_REDIRECT = "com.tinkuyhub.app://auth-callback";

/**
 * Inicia sesión con Google. En la app nativa (Capacitor) abre el flujo OAuth en una
 * Custom Tab en vez de una WebView simple, porque Google bloquea el login dentro de
 * WebViews genéricas ("disallowed_useragent"). En web usa el flujo estándar de Supabase.
 */
export async function signInWithGoogle(): Promise<{ error: string | null }> {
  if (!Capacitor.isNativePlatform()) {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    return { error: error?.message ?? null };
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: NATIVE_REDIRECT, skipBrowserRedirect: true },
  });

  if (error || !data?.url) {
    return { error: error?.message ?? "No se pudo iniciar el flujo de Google." };
  }

  return new Promise((resolve) => {
    let settled = false;

    CapacitorApp.addListener("appUrlOpen", async ({ url }) => {
      if (settled || !url.startsWith(NATIVE_REDIRECT)) return;
      settled = true;
      CapacitorApp.removeAllListeners();
      await Browser.close().catch(() => {});

      const hash = url.split("#")[1] ?? "";
      const params = new URLSearchParams(hash);
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");

      if (!access_token || !refresh_token) {
        resolve({ error: "No se pudo completar el inicio de sesión con Google." });
        return;
      }

      const { error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token });
      resolve({ error: sessionError?.message ?? null });
    });

    Browser.open({ url: data.url }).catch(() => {
      if (!settled) {
        settled = true;
        CapacitorApp.removeAllListeners();
        resolve({ error: "No se pudo abrir el navegador para iniciar sesión." });
      }
    });

    // Si el usuario cierra la Custom Tab sin completar el login, no dejamos la promesa colgada.
    setTimeout(() => {
      if (!settled) {
        settled = true;
        CapacitorApp.removeAllListeners();
        resolve({ error: null });
      }
    }, 120000);
  });
}
