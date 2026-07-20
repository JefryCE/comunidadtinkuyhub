import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"

// Despachador de notificaciones push (FCM HTTP v1).
//
// Disparador: Database Webhook sobre INSERT en public.events (igual que
// send-event-confirmation escucha event_registrations). Al publicarse un
// evento, notifica a los usuarios que:
//   - activaron push (push_enabled) y tienen token FCM registrado, y
//   - están dentro de su radio de proximidad configurado respecto al evento
//     (si el evento o el usuario no tienen coordenadas, se les incluye), y
//   - no son quien creó el evento.
//
// Secretos requeridos (Edge Functions > Secrets):
//   FIREBASE_SERVICE_ACCOUNT  → contenido completo del JSON de cuenta de
//   servicio de Firebase (Consola Firebase > Configuración del proyecto >
//   Cuentas de servicio > Generar nueva clave privada).

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
const FIREBASE_SERVICE_ACCOUNT = Deno.env.get("FIREBASE_SERVICE_ACCOUNT")

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// --- OAuth2 con la cuenta de servicio (JWT RS256 -> access token) ---------
function base64url(data: Uint8Array | string): string {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data
  let bin = ""
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

async function getAccessToken(sa: { client_email: string; private_key: string }): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))
  const claims = base64url(JSON.stringify({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }))

  const pem = sa.private_key.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "")
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0))
  const key = await crypto.subtle.importKey(
    "pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"],
  )
  const signature = new Uint8Array(
    await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(`${header}.${claims}`)),
  )
  const jwt = `${header}.${claims}.${base64url(signature)}`

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=${encodeURIComponent("urn:ietf:params:oauth:grant-type:jwt-bearer")}&assertion=${jwt}`,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`OAuth error: ${JSON.stringify(data)}`)
  return data.access_token
}

// Distancia haversine en km
function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!FIREBASE_SERVICE_ACCOUNT) {
      throw new Error("Falta el secreto FIREBASE_SERVICE_ACCOUNT")
    }
    const sa = JSON.parse(FIREBASE_SERVICE_ACCOUNT)

    const payload = await req.json()
    const event = payload.record
    if (!event || !event.id || !event.title) {
      return new Response(JSON.stringify({ error: "Payload sin evento válido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    const { data: settings, error: settingsError } = await supabase
      .from("user_notification_settings")
      .select("user_id, fcm_token, proximity_radius_km, last_lat, last_lng")
      .eq("push_enabled", true)
      .not("fcm_token", "is", null)

    if (settingsError) throw new Error(settingsError.message)

    const recipients = (settings ?? []).filter((s: any) => {
      if (s.user_id === event.created_by) return false
      if (event.latitude == null || event.longitude == null) return true
      if (s.last_lat == null || s.last_lng == null) return true
      const d = distanceKm(s.last_lat, s.last_lng, event.latitude, event.longitude)
      return d <= (s.proximity_radius_km ?? 10)
    })

    if (recipients.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: "Sin destinatarios" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const accessToken = await getAccessToken(sa)
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`

    let sent = 0
    const staleTokens: string[] = []

    for (const r of recipients) {
      const res = await fetch(fcmUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            token: r.fcm_token,
            notification: {
              title: `${event.emoji ?? "🌱"} Nuevo evento: ${event.title}`,
              body: `${event.date ?? ""} · ${event.location ?? ""}`.trim(),
            },
            data: { event_id: String(event.id) },
            android: { priority: "high" },
          },
        }),
      })

      if (res.ok) {
        sent++
      } else {
        const err = await res.json().catch(() => ({}))
        const code = err?.error?.details?.[0]?.errorCode ?? err?.error?.status
        // Token vencido/desinstalado: lo limpiamos para no reintentar siempre
        if (code === "UNREGISTERED" || code === "INVALID_ARGUMENT") {
          staleTokens.push(r.fcm_token)
        }
        console.error(`FCM error para user ${r.user_id}:`, JSON.stringify(err))
      }
    }

    if (staleTokens.length > 0) {
      await supabase
        .from("user_notification_settings")
        .update({ fcm_token: null })
        .in("fcm_token", staleTokens)
    }

    return new Response(JSON.stringify({ sent, cleaned: staleTokens.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error: any) {
    console.error("Error in send-push-notification:", error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
