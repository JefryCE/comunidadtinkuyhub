import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Elimina la cuenta del usuario que llama a esta función (y, en cascada, todos
// sus datos: perfil, inscripciones, insignias, fotos, eventos creados, etc,
// vía los ON DELETE CASCADE ya definidos en el esquema). El id del usuario a
// borrar se obtiene SIEMPRE del JWT verificado, nunca de un parámetro que
// mande el cliente, para que nadie pueda borrar la cuenta de otra persona.
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Falta la sesión de autenticación')
    }
    const token = authHeader.replace(/^Bearer\s+/i, '')

    const admin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    // admin.auth.getUser(token) valida el JWT del que llama sin necesitar la
    // anon key por separado — solo depende de SUPABASE_URL y
    // SUPABASE_SERVICE_ROLE_KEY, que sí están garantizadas como secretos
    // automáticos en toda Edge Function.
    const { data: { user }, error: userError } = await admin.auth.getUser(token)
    if (userError || !user) {
      throw new Error('No se pudo verificar tu sesión. Vuelve a iniciar sesión e inténtalo de nuevo.')
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id)
    if (deleteError) {
      throw new Error(deleteError.message)
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error: any) {
    console.error("Error in delete-account function:", error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
