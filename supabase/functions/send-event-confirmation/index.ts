import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error("Missing RESEND_API_KEY environment variable")
    }

    const payload = await req.json()
    console.log("Webhook payload received:", JSON.stringify(payload))

    // Database webhooks send the record in payload.record
    const record = payload.record
    if (!record || !record.event_id || !record.user_id) {
      return new Response(JSON.stringify({ error: "Invalid payload record structure" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    // 1. Fetch Event details
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("*")
      .eq("id", record.event_id)
      .single()

    if (eventError || !event) {
      throw new Error(`Failed to fetch event: ${eventError?.message || "Not found"}`)
    }

    // 2. Fetch User/Profile details (and get email from auth.users via admin API or profiles table)
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", record.user_id)
      .single()

    if (profileError || !profile) {
      throw new Error(`Failed to fetch profile: ${profileError?.message || "Not found"}`)
    }

    const userEmail = profile.email
    const userName = profile.full_name || "Voluntario"

    if (!userEmail) {
      console.log(`User ${record.user_id} has no email configured in public.profiles. Skipping email.`)
      return new Response(JSON.stringify({ message: "Skipped: user has no email in profile" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    // 3. Prepare Email content
    const whatsappText = event.whatsapp_group_link 
      ? `<p>👉 <b>Únete al grupo de WhatsApp del evento para coordinar:</b> <a href="${event.whatsapp_group_link}">${event.whatsapp_group_link}</a></p>`
      : ''

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #10b981; margin: 0;">¡Inscripción Confirmada! 🎉</h2>
          <p style="color: #666;">TinkuyHub - Conectando Voluntariado</p>
        </div>
        <hr style="border: 0; border-top: 1px solid #eee;" />
        <p>Hola <b>${userName}</b>,</p>
        <p>Te has inscrito exitosamente al evento de voluntariado. Aquí tienes todos los detalles para que estés listo:</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #333;">${event.emoji} ${event.title}</h3>
          <p style="margin: 5px 0;">📅 <b>Fecha:</b> ${event.date}</p>
          <p style="margin: 5px 0;">🕒 <b>Horario:</b> ${event.schedule}</p>
          <p style="margin: 5px 0;">📍 <b>Lugar:</b> ${event.location}</p>
          <p style="margin: 5px 0;">📋 <b>Requisitos:</b> ${event.requirements}</p>
        </div>

        ${whatsappText}

        <p style="font-size: 13px; color: #888; margin-top: 30px;">
          Si tienes alguna duda o necesitas cancelar tu asistencia, puedes hacerlo directamente ingresando a tu cuenta en la plataforma.
        </p>
        <hr style="border: 0; border-top: 1px solid #eee; margin-top: 20px;" />
        <div style="text-align: center; font-size: 12px; color: #aaa;">
          TinkuyHub © 2026. Todos los derechos reservados.
        </div>
      </div>
    `

    // 4. Call Resend API
    console.log(`Sending confirmation email to ${userEmail} for event "${event.title}"...`)
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "TinkuyHub <no-reply@tinkuyhub.com>",
        to: [userEmail],
        subject: `Confirmación de Inscripción: ${event.emoji} ${event.title}`,
        html: emailHtml,
      }),
    })

    const resData = await res.json()
    console.log("Resend API response:", JSON.stringify(resData))

    if (!res.ok) {
      throw new Error(`Resend error: ${JSON.stringify(resData)}`)
    }

    return new Response(JSON.stringify({ success: true, data: resData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })

  } catch (error: any) {
    console.error("Error in Edge Function:", error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})
