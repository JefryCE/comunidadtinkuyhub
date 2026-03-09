import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type Props = {
  eventId: string;
  isCreator: boolean;
};

type PhotoRow = {
  id: string;
  photo_url: string;
  caption: string;
  created_at: string;
};

const EventPhotos = ({ eventId, isCreator }: Props) => {
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
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const handleUpload = async (file: File) => {
    if (!user) return;
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${user.id}/${eventId}/${Date.now()}.${ext}`;

    setUploading(true);
    try {
      const { error: uploadError } = await supabase.storage
        .from("event-photos")
        .upload(path, file, { upsert: false, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("event-photos").getPublicUrl(path);

      const { error: insertError } = await supabase
        .from("event_photos" as any)
        .insert({
          event_id: eventId,
          uploaded_by: user.id,
          photo_url: data.publicUrl,
        } as any);

      if (insertError) throw insertError;

      toast.success("📸 Foto subida");
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

  const photos = photosQuery.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Camera className="w-5 h-5" /> Fotos del evento
        </h3>
        {isCreator && (
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
              }}
            />
          </label>
        )}
      </div>

      {photos.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          {isCreator ? "Sube fotos del evento para compartir con los voluntarios." : "Aún no hay fotos."}
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map((photo, i) => (
            <motion.div
              key={photo.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="relative group rounded-xl overflow-hidden border border-border aspect-square"
            >
              <img
                src={photo.photo_url}
                alt="Foto del evento"
                className="w-full h-full object-cover"
                loading="lazy"
              />
              {isCreator && (
                <button
                  onClick={() => handleDelete(photo)}
                  className="absolute top-2 right-2 bg-background/80 text-destructive p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EventPhotos;
