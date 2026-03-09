import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import Navbar from "@/components/landing/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import GamificationStats from "@/components/GamificationStats";

type ProfileRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

type EventRow = {
  id: string;
  title: string;
  description: string;
  type: string;
  emoji: string;
  location: string;
  date: string;
  schedule: string;
  requirements: string;
  max_volunteers: number;
  color: string;
  created_at: string;
};

type RegistrationRow = {
  id: string;
  event_id: string;
  user_id: string;
  registered_at: string;
  attendance_status: string;
  points_awarded: boolean;
};

const getInitials = (nameOrEmail?: string | null) => {
  if (!nameOrEmail) return "U";
  const parts = nameOrEmail.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
};

const Profile = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [savingName, setSavingName] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [loading, user, navigate]);

  const profileQuery = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<ProfileRow> => {
      if (!user) throw new Error("No authenticated user");

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) return data as ProfileRow;

      const { data: created, error: createError } = await supabase
        .from("profiles")
        .insert({
          id: user.id,
          full_name: (user.user_metadata?.full_name as string | undefined) ?? null,
          avatar_url: null,
        })
        .select("*")
        .single();

      if (createError) throw createError;
      return created as ProfileRow;
    },
  });

  useEffect(() => {
    if (profileQuery.data && fullName === "") {
      setFullName(profileQuery.data.full_name ?? "");
    }
  }, [profileQuery.data, fullName]);

  const registrationsQuery = useQuery({
    queryKey: ["my-registrations", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Array<{ registration: RegistrationRow; event: EventRow | null }>> => {
      if (!user) throw new Error("No authenticated user");

      const { data: regs, error: regsError } = await supabase
        .from("event_registrations")
        .select("id, event_id, user_id, registered_at, attendance_status, points_awarded")
        .order("registered_at", { ascending: false });

      if (regsError) throw regsError;

      const registrations = (regs ?? []) as RegistrationRow[];
      const eventIds = Array.from(new Set(registrations.map((r) => r.event_id)));

      if (eventIds.length === 0) return [];

      const { data: events, error: eventsError } = await supabase
        .from("events")
        .select("*")
        .in("id", eventIds);

      if (eventsError) throw eventsError;

      const eventsById = new Map((events ?? []).map((e) => [e.id, e as EventRow]));
      return registrations.map((registration) => ({
        registration,
        event: eventsById.get(registration.event_id) ?? null,
      }));
    },
  });

  const displayName = useMemo(() => {
    return (profileQuery.data?.full_name ?? user?.user_metadata?.full_name ?? user?.email ?? "Usuario") as string;
  }, [profileQuery.data?.full_name, user?.user_metadata?.full_name, user?.email]);

  const handleSaveName = async () => {
    if (!user) return;
    setSavingName(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName.trim() || null })
        .eq("id", user.id);

      if (error) throw error;
      toast.success("Perfil actualizado");
      await profileQuery.refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo guardar el nombre");
    } finally {
      setSavingName(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Contraseña actualizada");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo actualizar la contraseña");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (!user) return;

    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;

    setUploadingAvatar(true);
    try {
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = data.publicUrl;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      toast.success("Foto actualizada");
      await profileQuery.refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo subir la foto");
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <div className="flex items-start justify-between gap-6 flex-col sm:flex-row">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground">Mi perfil</h1>
            <p className="text-muted-foreground mt-2">Gestiona tu cuenta y revisa tus inscripciones.</p>
          </div>
          <Button variant="outline" onClick={() => navigate("/")}>Volver al inicio</Button>
        </div>

        <div className="mt-10 grid lg:grid-cols-3 gap-8">
          <section className="lg:col-span-1 bg-card border border-border rounded-2xl shadow-card p-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={profileQuery.data?.avatar_url ?? undefined} alt="Avatar" />
                <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-card-foreground">{displayName}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>

            <Separator className="my-6" />

            <div className="space-y-2">
              <Label htmlFor="avatar">Subir foto</Label>
              <Input
                id="avatar"
                type="file"
                accept="image/*"
                disabled={uploadingAvatar}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleAvatarUpload(file);
                }}
              />
              <p className="text-xs text-muted-foreground">
                Formatos: JPG/PNG/WebP. Se guardará en tu cuenta.
              </p>
            </div>
          </section>

          <section className="lg:col-span-2 space-y-8">
            {/* Gamification */}
            <GamificationStats />
            <div className="bg-card border border-border rounded-2xl shadow-card p-6">
              <h2 className="text-xl font-bold text-card-foreground">Datos</h2>
              <div className="mt-5 grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Label htmlFor="fullName">Nombre completo</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Tu nombre"
                    disabled={profileQuery.isLoading || savingName}
                  />
                </div>
              </div>
              <div className="mt-5 flex justify-end">
                <Button onClick={handleSaveName} disabled={savingName || profileQuery.isLoading}>
                  {savingName ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl shadow-card p-6">
              <h2 className="text-xl font-bold text-card-foreground">Cambiar contraseña</h2>
              <div className="mt-5 grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="newPassword">Nueva contraseña</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={savingPassword}
                  />
                </div>
                <div>
                  <Label htmlFor="confirmPassword">Confirmar</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={savingPassword}
                  />
                </div>
              </div>
              <div className="mt-5 flex justify-end">
                <Button onClick={handleChangePassword} disabled={savingPassword}>
                  {savingPassword ? "Actualizando..." : "Actualizar contraseña"}
                </Button>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl shadow-card p-6">
              <h2 className="text-xl font-bold text-card-foreground">Mis eventos</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Aquí verás los eventos a los que te registraste.
              </p>

              <div className="mt-5 space-y-3">
                {registrationsQuery.isLoading ? (
                  <p className="text-sm text-muted-foreground">Cargando tus eventos...</p>
                ) : registrationsQuery.isError ? (
                  <p className="text-sm text-destructive">No se pudo cargar tu lista de eventos.</p>
                ) : (registrationsQuery.data?.length ?? 0) === 0 ? (
                  <p className="text-sm text-muted-foreground">Aún no estás registrado en ningún evento.</p>
                ) : (
                  registrationsQuery.data!.map(({ registration, event }) => (
                    <div
                      key={registration.id}
                      className="rounded-xl border border-border bg-background p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-foreground">
                            {event ? `${event.emoji} ${event.title}` : "Evento"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {event ? `${event.location} • ${event.date}` : `ID: ${registration.event_id}`}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground whitespace-nowrap">
                          Inscrito: {new Date(registration.registered_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Profile;
