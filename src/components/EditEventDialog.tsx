import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Pencil, MapPin, CalendarIcon } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
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

type EventData = {
  id: string;
  title: string;
  description: string;
  type: string;
  location: string;
  date: string;
  schedule: string;
  requirements: string;
  max_volunteers: number;
  latitude: number | null;
  longitude: number | null;
  registration_open?: boolean;
};

type Props = {
  event: EventData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const EditEventDialog = ({ event, open, onOpenChange }: Props) => {
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description);
  const [typeIndex, setTypeIndex] = useState(String(EVENT_TYPES.findIndex((t) => t.value === event.type)));
  const [location, setLocation] = useState(event.location);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [schedule, setSchedule] = useState(event.schedule);
  const [requirements, setRequirements] = useState(event.requirements);
  const [maxVolunteers, setMaxVolunteers] = useState(String(event.max_volunteers));
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    event.latitude && event.longitude ? { lat: event.latitude, lng: event.longitude } : null
  );

  useEffect(() => {
    setTitle(event.title);
    setDescription(event.description);
    setTypeIndex(String(EVENT_TYPES.findIndex((t) => t.value === event.type)));
    setLocation(event.location);
    setSchedule(event.schedule);
    setRequirements(event.requirements);
    setMaxVolunteers(String(event.max_volunteers));
    setCoords(event.latitude && event.longitude ? { lat: event.latitude, lng: event.longitude } : null);
  }, [event]);

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim() || !location.trim()) {
      toast.error("Completa todos los campos obligatorios.");
      return;
    }

    const eventType = EVENT_TYPES[Number(typeIndex)] ?? EVENT_TYPES[0];
    setSaving(true);

    try {
      const { error } = await supabase
        .from("events")
        .update({
          title: title.trim(),
          description: description.trim(),
          type: eventType.value,
          emoji: eventType.emoji,
          color: eventType.color,
          location: location.trim(),
          date: date ? format(date, "d 'de' MMMM, yyyy", { locale: es }) : event.date,
          schedule: schedule.trim() || "Por definir",
          requirements: requirements.trim() || "Ninguno",
          max_volunteers: Number(maxVolunteers) || 20,
          latitude: coords?.lat ?? null,
          longitude: coords?.lng ?? null,
        })
        .eq("id", event.id);

      if (error) throw error;

      toast.success("✅ Evento actualizado");
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-events"] });
      queryClient.invalidateQueries({ queryKey: ["event-detail", event.id] });
      queryClient.invalidateQueries({ queryKey: ["events-map"] });
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo actualizar el evento.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar evento</DialogTitle>
          <DialogDescription>Modifica la información de tu evento.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div>
            <Label>Título *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} disabled={saving} />
          </div>

          <div>
            <Label>Tipo de evento *</Label>
            <Select value={typeIndex} onValueChange={setTypeIndex} disabled={saving}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map((t, i) => (
                  <SelectItem key={t.value} value={String(i)}>{t.emoji} {t.value}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Descripción *</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} disabled={saving} />
          </div>

          <div>
            <Label>Ubicación *</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} disabled={saving} />
          </div>

          <div>
            <Label className="flex items-center gap-1.5 mb-1.5">
              <MapPin className="w-3.5 h-3.5 text-primary" /> Mapa
            </Label>
            <LocationPicker value={coords} onChange={setCoords} />
          </div>

          <div>
            <Label>Fecha</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" disabled={saving} className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP", { locale: es }) : event.date}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={date} onSelect={setDate} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Horario</Label>
              <Input value={schedule} onChange={(e) => setSchedule(e.target.value)} disabled={saving} />
            </div>
            <div>
              <Label>Voluntarios máx.</Label>
              <Input type="number" min="1" value={maxVolunteers} onChange={(e) => setMaxVolunteers(e.target.value)} disabled={saving} />
            </div>
          </div>

          <div>
            <Label>Requisitos</Label>
            <Textarea value={requirements} onChange={(e) => setRequirements(e.target.value)} rows={2} disabled={saving} />
          </div>

          <Button className="w-full gradient-cta text-primary-foreground border-0 hover:opacity-90" onClick={handleSubmit} disabled={saving}>
            {saving ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditEventDialog;
