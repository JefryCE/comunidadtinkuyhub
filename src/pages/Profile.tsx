import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Linkedin, Facebook, Instagram, Globe } from "lucide-react";

import Navbar from "@/components/landing/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import GamificationStats from "@/components/GamificationStats";

type ProfileRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
  linkedin: string | null;
  facebook: string | null;
  tiktok: string | null;
  instagram: string | null;
  website: string | null;
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

  const [bio, setBio] = useState("");

  const [linkedin, setLinkedin] = useState("");
  const [facebook, setFacebook] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [instagram, setInstagram] = useState("");
  const [website, setWebsite] = useState("");
  const [savingSocial, setSavingSocial] = useState(false);

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
      setBio(profileQuery.data.bio ?? "");
      setLinkedin(profileQuery.data.linkedin ?? "");
      setFacebook(profileQuery.data.facebook ?? "");
      setTiktok(profileQuery.data.tiktok ?? "");
      setInstagram(profileQuery.data.instagram ?? "");
      setWebsite(profileQuery.data.website ?? "");
    }
  }, [profileQuery.data, fullName]);


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

  const handleSaveSocial = async () => {
    if (!user) return;
    setSavingSocial(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          linkedin: linkedin.trim() || null,
          facebook: facebook.trim() || null,
          tiktok: tiktok.trim() || null,
          instagram: instagram.trim() || null,
          website: website.trim() || null,
        } as any)
        .eq("id", user.id);

      if (error) throw error;
      toast.success("Redes sociales actualizadas");
      await profileQuery.refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo guardar las redes sociales");
    } finally {
      setSavingSocial(false);
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
              <h2 className="text-xl font-bold text-card-foreground">Redes sociales</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Agrega tus redes sociales para que otros voluntarios te conozcan.
              </p>
              <div className="mt-5 space-y-4">
                <div className="flex items-center gap-3">
                  <Linkedin className="h-5 w-5 text-muted-foreground shrink-0" />
                  <Input
                    value={linkedin}
                    onChange={(e) => setLinkedin(e.target.value)}
                    placeholder="https://linkedin.com/in/tu-perfil"
                    disabled={savingSocial}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Facebook className="h-5 w-5 text-muted-foreground shrink-0" />
                  <Input
                    value={facebook}
                    onChange={(e) => setFacebook(e.target.value)}
                    placeholder="https://facebook.com/tu-perfil"
                    disabled={savingSocial}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <svg className="h-5 w-5 text-muted-foreground shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15.2a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.8a8.18 8.18 0 0 0 4.76 1.52v-3.4a4.85 4.85 0 0 1-1-.23z"/></svg>
                  <Input
                    value={tiktok}
                    onChange={(e) => setTiktok(e.target.value)}
                    placeholder="https://tiktok.com/@tu-usuario"
                    disabled={savingSocial}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Instagram className="h-5 w-5 text-muted-foreground shrink-0" />
                  <Input
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    placeholder="https://instagram.com/tu-usuario"
                    disabled={savingSocial}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Globe className="h-5 w-5 text-muted-foreground shrink-0" />
                  <Input
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://tu-pagina-web.com"
                    disabled={savingSocial}
                  />
                </div>
              </div>
              <div className="mt-5 flex justify-end">
                <Button onClick={handleSaveSocial} disabled={savingSocial}>
                  {savingSocial ? "Guardando..." : "Guardar redes"}
                </Button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Profile;
