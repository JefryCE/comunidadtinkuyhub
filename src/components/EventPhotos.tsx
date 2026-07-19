import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Trash2, Upload, Download, ImageOff } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const MAX_PHOTOS = 2;

type Props = {
  eventId: string;
  /** True if the logged-in user created the event */
  isCreator: boolean;
  /** True if the logged-in user is admin or moderator */
  isModeratorOrAdmin?: boolean;
};

type PhotoRow = {
  id: string;
  photo_url: string;
  caption: string | null;
  created_at: string;
};

const EventPhotos = ({ eventId, isCreator, isModeratorOrAdmin = false }: Props) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const photosQuery = useQuery({
    queryKey: ["event-photos", eventId],
    queryFn: async (): Promise<PhotoRow[]> => {
      const { data, error } = await supabase
        .from("event_photos" as any)
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const photos = photosQuery.data ?? [];
  const canUpload = (isCreator || isModeratorOrAdmin) && photos.length < MAX_PHOTOS;
  const canManage = isCreator || isModeratorOrAdmin;

  const handleUpload = async (file: File) => {
    if (!user) return;
    if (photos.length >= MAX_PHOTOS) {
      toast.error(`Solo se pueden subir hasta ${MAX_PHOTOS} fotos por evento.`);
      return;
    }

    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      toast.error("Configuración de Cloudinary faltante. Agrega VITE_CLOUDINARY_CLOUD_NAME y VITE_CLOUDINARY_UPLOAD_PRESET a tu archivo .env");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", uploadPreset);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error?.message ?? "Error al subir la imagen a Cloudinary");
      }

      const data = await response.json();
      const photoUrl = data.secure_url;

      const { error: insertError } = await supabase
        .from("event_photos" as any)
        .insert({
          event_id: eventId,
          uploaded_by: user.id,
          photo_url: photoUrl,
        } as any);

      if (insertError) throw insertError;

      toast.success("📸 Foto subida correctamente");
      queryClient.invalidateQueries({ queryKey: ["event-photos", eventId] });
    } catch (e: any) {
      toast.error(e?.message ?? "Error al subir foto");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (photo: PhotoRow) => {
    try {
      const { error } = await supabase
        .from("event_photos" as any)
        .delete()
        .eq("id", photo.id);

      if (error) throw error;
      toast.success("Foto eliminada");
      queryClient.invalidateQueries({ queryKey: ["event-photos", eventId] });
    } catch (e: any) {
      toast.error(e?.message ?? "Error al eliminar");
    }
  };

  const handleDownload = async (photo: PhotoRow, index: number) => {
    try {
      const response = await fetch(photo.photo_url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `foto-evento-${index + 1}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error("No se pudo descargar la foto");
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Camera className="w-5 h-5" /> Fotos del evento
          </h3>
          <Badge
            variant="outline"
            className="text-[10px] h-5 font-medium text-muted-foreground"
          >
            {photos.length}/{MAX_PHOTOS}
          </Badge>
        </div>

        {canUpload && (
          <label className="cursor-pointer">
            <Button size="sm" variant="outline" disabled={uploading} asChild>
              <span>
                <Upload className="w-4 h-4 mr-1" />
                {uploading ? "Subiendo..." : "Subir foto"}
              </span>
            </Button>
            <Input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file);
                // reset so same file can be re-selected
                e.target.value = "";
              }}
            />
          </label>
        )}

        {canManage && photos.length >= MAX_PHOTOS && (
          <Badge
            variant="outline"
            className="text-[10px] h-6 px-2 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800"
          >
            Límite de {MAX_PHOTOS} fotos alcanzado
          </Badge>
        )}
      </div>

      {/* Photos grid */}
      {photos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-3 text-muted-foreground">
          <ImageOff className="w-8 h-8 opacity-30" />
          <p className="text-sm text-center">
            {canManage
              ? `Sube hasta ${MAX_PHOTOS} fotos del evento para compartir con los voluntarios.`
              : "Aún no hay fotos."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {photos.map((photo, i) => (
            <motion.div
              key={photo.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.08 }}
              className="relative group rounded-xl overflow-hidden border border-border aspect-video bg-muted"
            >
              <img
                src={photo.photo_url}
                alt={`Foto del evento ${i + 1}`}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />

              {/* Overlay actions */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300" />

              <div className="absolute bottom-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                {/* Download — visible to everyone */}
                <button
                  onClick={() => handleDownload(photo, i)}
                  title="Descargar foto"
                  className="bg-white/90 text-gray-800 p-1.5 rounded-lg hover:bg-white transition-colors shadow-sm"
                >
                  <Download className="w-4 h-4" />
                </button>

                {/* Delete — only creator or mod/admin */}
                {canManage && (
                  <button
                    onClick={() => handleDelete(photo)}
                    title="Eliminar foto"
                    className="bg-white/90 text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors shadow-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Photo number badge */}
              <div className="absolute top-2 left-2">
                <Badge className="text-[10px] h-5 bg-black/50 text-white border-0 backdrop-blur-sm">
                  Foto {i + 1}
                </Badge>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Helper text for moderators */}
      {isModeratorOrAdmin && !isCreator && (
        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary/50" />
          Como moderador puedes subir y eliminar fotos de este evento.
        </p>
      )}
    </div>
  );
};

export default EventPhotos;
