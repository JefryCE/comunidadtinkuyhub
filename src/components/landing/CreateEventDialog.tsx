import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import LocationPicker from "@/components/LocationPicker";

const EVENT_TYPES = [
  { value: "Limpieza", emoji: "🌊", color: "from-cyan-400 to-blue-500" },
  { value: "Reforestación", emoji: "🌱", color: "from-emerald-400 to-green-600" },
  { value: "Educación", emoji: "📚", color: "from-amber-400 to-orange-500" },
  { value: "Social", emoji: "🤝", color: "from-violet-400 to-purple-600" },
  { value: "Salud", emoji: "❤️", color: "from-rose-400 to-red-500" },
  { value: "Animales", emoji: "🐾", color: "from-yellow-400 to-amber-500" },
];

const CreateEventDialog = () => {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [typeIndex, setTypeIndex] = useState<string>("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [schedule, setSchedule] = useState("");
  const [requirements, setRequirements] = useState("");
  const [maxVolunteers, setMaxVolunteers] = useState("20");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setTypeIndex("");
    setLocation("");
    setDate("");
    setSchedule("");
    setRequirements("");
    setMaxVolunteers("20");
  };

  const handleOpen = () => {
    if (!user) {
      toast.info("Inicia sesión para crear un evento.");
      navigate("/auth");
      return;
    }
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim() || !typeIndex || !location.trim() || !date.trim()) {
      toast.error("Completa todos los campos obligatorios.");
      return;
    }

    const eventType = EVENT_TYPES[Number(typeIndex)];
    setSaving(true);

    try {
      const { error } = await supabase.from("events").insert({
        title: title.trim(),
        description: description.trim(),
        type: eventType.value,
        emoji: eventType.emoji,
        color: eventType.color,
        location: location.trim(),
        date: date.trim(),
        schedule: schedule.trim() || "Por definir",
        requirements: requirements.trim() || "Ninguno",
        max_volunteers: Number(maxVolunteers) || 20,
        created_by: user!.id,
      } as any);

      if (error) throw error;

      toast.success("🎉 ¡Evento creado exitosamente!");
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-events"] });
      resetForm();
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo crear el evento.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button onClick={handleOpen} className="gradient-cta text-primary-foreground border-0 hover:opacity-90">
        <Plus className="w-4 h-4 mr-2" />
        Crear evento
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crear nuevo evento</DialogTitle>
            <DialogDescription>
              Completa la información para publicar un evento de voluntariado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div>
              <Label htmlFor="ev-title">Título *</Label>
              <Input id="ev-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Limpieza de playa" disabled={saving} />
            </div>

            <div>
              <Label htmlFor="ev-type">Tipo de evento *</Label>
              <Select value={typeIndex} onValueChange={setTypeIndex} disabled={saving}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un tipo" />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((t, i) => (
                    <SelectItem key={t.value} value={String(i)}>
                      {t.emoji} {t.value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="ev-desc">Descripción *</Label>
              <Textarea id="ev-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="¿De qué trata el evento?" rows={3} disabled={saving} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ev-location">Ubicación *</Label>
                <Input id="ev-location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ej: Parque Central" disabled={saving} />
              </div>
              <div>
                <Label htmlFor="ev-date">Fecha *</Label>
                <Input id="ev-date" value={date} onChange={(e) => setDate(e.target.value)} placeholder="Ej: 15 de Abril, 2026" disabled={saving} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ev-schedule">Horario</Label>
                <Input id="ev-schedule" value={schedule} onChange={(e) => setSchedule(e.target.value)} placeholder="Ej: 8:00 AM - 12:00 PM" disabled={saving} />
              </div>
              <div>
                <Label htmlFor="ev-max">Voluntarios máx.</Label>
                <Input id="ev-max" type="number" min="1" value={maxVolunteers} onChange={(e) => setMaxVolunteers(e.target.value)} disabled={saving} />
              </div>
            </div>

            <div>
              <Label htmlFor="ev-req">Requisitos</Label>
              <Textarea id="ev-req" value={requirements} onChange={(e) => setRequirements(e.target.value)} placeholder="Ej: Ropa cómoda, protector solar" rows={2} disabled={saving} />
            </div>

            <Button className="w-full gradient-cta text-primary-foreground border-0 hover:opacity-90" onClick={handleSubmit} disabled={saving}>
              {saving ? "Creando..." : "Publicar evento"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CreateEventDialog;
