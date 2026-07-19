import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Pencil, MapPin, CalendarIcon, Bus, Trash2, Plus } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
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
  whatsapp_group_link?: string | null;
  offers_transport?: boolean;
  is_multiday?: boolean;
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
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    event.latitude && event.longitude ? { lat: event.latitude, lng: event.longitude } : null
  );
  const [whatsappLink, setWhatsappLink] = useState(event.whatsapp_group_link || "");

  // Transport states
  const [offersTransport, setOffersTransport] = useState(event.offers_transport || false);
  const [transportStops, setTransportStops] = useState<{ name: string; address: string; pickupTime: string }[]>([
    { name: "", address: "", pickupTime: "8:00 AM" }
  ]);

  // Multiday states
  const [isMultiday, setIsMultiday] = useState(event.is_multiday || false);
  const [sessions, setSessions] = useState<{ title: string; date: Date | undefined; startTime: string; endTime: string }[]>([
    { title: "", date: undefined, startTime: "8:00 AM", endTime: "12:00 PM" }
  ]);

  useEffect(() => {
    setTitle(event.title);
    setDescription(event.description);
    setTypeIndex(String(EVENT_TYPES.findIndex((t) => t.value === event.type)));
    setLocation(event.location);
    setSchedule(event.schedule);
    setRequirements(event.requirements);
    setCoords(event.latitude && event.longitude ? { lat: event.latitude, lng: event.longitude } : null);
    setWhatsappLink(event.whatsapp_group_link || "");
    setOffersTransport(event.offers_transport || false);
    setIsMultiday(event.is_multiday || false);
  }, [event]);

  // Load existing transport stops when opening the dialog
  useEffect(() => {
    if (open && event.id) {
      const fetchStops = async () => {
        const { data, error } = await supabase
          .from("event_transport_stops" as any)
          .select("*")
          .eq("event_id", event.id)
          .order("stop_order", { ascending: true });

        if (error) {
          console.error("Error al cargar paradas:", error);
        } else if (data && data.length > 0) {
          setTransportStops(data.map((stop) => ({
            name: stop.name,
            address: stop.address,
            pickupTime: stop.pickup_time,
          })));
        } else {
          setTransportStops([{ name: "", address: "", pickupTime: "8:00 AM" }]);
        }
      };
      fetchStops();
    }
  }, [open, event.id]);

  // Load existing sessions when opening the dialog
  useEffect(() => {
    if (open && event.id && isMultiday) {
      const fetchSessions = async () => {
        const { data, error } = await supabase
          .from("event_sessions" as any)
          .select("*")
          .eq("event_id", event.id)
          .order("session_order", { ascending: true });

        if (error) {
          console.error("Error al cargar sesiones:", error);
        } else if (data && data.length > 0) {
          setSessions(data.map((sess) => ({
            title: sess.title || "",
            date: sess.date ? new Date(sess.date + "T12:00:00") : undefined,
            startTime: sess.start_time,
            endTime: sess.end_time,
          })));
        } else {
          setSessions([{ title: "", date: undefined, startTime: "8:00 AM", endTime: "12:00 PM" }]);
        }
      };
      fetchSessions();
    } else {
      setSessions([{ title: "", date: undefined, startTime: "8:00 AM", endTime: "12:00 PM" }]);
    }
  }, [open, event.id, isMultiday]);

  const handleAddStop = () => {
    setTransportStops([...transportStops, { name: "", address: "", pickupTime: "8:00 AM" }]);
  };

  const handleRemoveStop = (index: number) => {
    setTransportStops(transportStops.filter((_, i) => i !== index));
  };

  const handleStopChange = (index: number, field: "name" | "address" | "pickupTime", value: string) => {
    setTransportStops(
      transportStops.map((stop, i) => (i === index ? { ...stop, [field]: value } : stop))
    );
  };

  const handleAddSession = () => {
    setSessions([...sessions, { title: "", date: undefined, startTime: "8:00 AM", endTime: "12:00 PM" }]);
  };

  const handleRemoveSession = (index: number) => {
    setSessions(sessions.filter((_, i) => i !== index));
  };

  const handleSessionChange = (index: number, field: "title" | "date" | "startTime" | "endTime", value: any) => {
    setSessions(
      sessions.map((session, i) => (i === index ? { ...session, [field]: value } : session))
    );
  };

  const formatMultidayDate = (sessionsList: { date: Date | undefined }[]) => {
    const dates = sessionsList
      .map(s => s.date)
      .filter((d): d is Date => !!d)
      .sort((a, b) => a.getTime() - b.getTime());

    if (dates.length === 0) return "";
    if (dates.length === 1) {
      return format(dates[0], "d 'de' MMMM, yyyy", { locale: es });
    }

    const first = dates[0];
    const last = dates[dates.length - 1];

    const firstFormat = format(first, "d 'de' MMMM", { locale: es });
    const lastFormat = format(last, "d 'de' MMMM, yyyy", { locale: es });

    return `${firstFormat} al ${lastFormat}`;
  };

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim() || !location.trim()) {
      toast.error("Completa todos los campos obligatorios.");
      return;
    }

    if (!isMultiday && !date && !event.date) {
      toast.error("Completa todos los campos obligatorios.");
      return;
    }

    if (isMultiday) {
      if (sessions.length === 0) {
        toast.error("Debes añadir al menos una sesión para un evento de varios días.");
        return;
      }
      const hasInvalidSession = sessions.some(s => !s.date);
      if (hasInvalidSession) {
        toast.error("Completa la fecha para todas las sesiones.");
        return;
      }
    }

    if (offersTransport) {
      const invalidStop = transportStops.some(
        (s) => !s.name.trim() || !s.address.trim() || !s.pickupTime.trim()
      );
      if (invalidStop) {
        toast.error("Completa todos los campos obligatorios para las paradas de transporte.");
        return;
      }
    }

    const eventType = EVENT_TYPES[Number(typeIndex)] ?? EVENT_TYPES[0];
    setSaving(true);

    try {
      const eventDate = isMultiday 
        ? formatMultidayDate(sessions)
        : date ? format(date, "d 'de' MMMM, yyyy", { locale: es }) : event.date;

      const eventSchedule = isMultiday 
        ? "Varios horarios" 
        : schedule.trim() || "Por definir";

      // 1. Update event details
      const { error } = await supabase
        .from("events")
        .update({
          title: title.trim(),
          description: description.trim(),
          type: eventType.value,
          emoji: eventType.emoji,
          color: eventType.color,
          location: location.trim(),
          date: eventDate,
          schedule: eventSchedule,
          requirements: requirements.trim() || "Ninguno",
          max_volunteers: 99999,
          latitude: coords?.lat ?? null,
          longitude: coords?.lng ?? null,
          whatsapp_group_link: whatsappLink.trim() || null,
          offers_transport: offersTransport,
          is_multiday: isMultiday,
        })
        .eq("id", event.id);

      if (error) throw error;

      // 2. Synchronize sessions (delete all existing first, then insert if multiday is active)
      await supabase
        .from("event_sessions" as any)
        .delete()
        .eq("event_id", event.id);

      if (isMultiday && sessions.length > 0) {
        const sessionsToInsert = sessions.map((session, index) => ({
          event_id: event.id,
          title: session.title.trim() || null,
          date: session.date ? format(session.date, "yyyy-MM-dd") : "",
          start_time: session.startTime,
          end_time: session.endTime,
          session_order: index,
        }));

        const { error: sessionsError } = await supabase
          .from("event_sessions" as any)
          .insert(sessionsToInsert);

        if (sessionsError) throw sessionsError;
      }

      // 3. Synchronize stops (delete all existing first, then insert)
      await supabase
        .from("event_transport_stops" as any)
        .delete()
        .eq("event_id", event.id);

      if (offersTransport && transportStops.length > 0) {
        const stopsToInsert = transportStops.map((stop, index) => ({
          event_id: event.id,
          name: stop.name.trim(),
          address: stop.address.trim(),
          pickup_time: stop.pickupTime.trim(),
          stop_order: index,
        }));

        const { error: stopsError } = await supabase
          .from("event_transport_stops" as any)
          .insert(stopsToInsert);

        if (stopsError) throw stopsError;
      }

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

          {/* Multiday option */}
          <div className="flex items-center justify-between border-t border-border pt-4">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-1.5 text-sm font-semibold">
                <CalendarIcon className="w-4 h-4 text-primary" />
                Evento de varios días
              </Label>
              <span className="text-[11px] text-muted-foreground block">
                Permite programar múltiples fechas con horarios independientes.
              </span>
            </div>
            <Switch checked={isMultiday} onCheckedChange={setIsMultiday} disabled={saving} />
          </div>

          {!isMultiday ? (
            <>
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

              <div className="space-y-4">
                <div>
                  <Label>Horario</Label>
                  <Input value={schedule} onChange={(e) => setSchedule(e.target.value)} disabled={saving} />
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-4 border-t border-border pt-3">
              <Label className="text-xs font-semibold">Jornadas / Sesiones del evento</Label>
              {sessions.map((session, index) => (
                <div key={index} className="space-y-3 p-3 bg-muted/40 rounded-lg relative border border-border">
                  {sessions.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveSession(index)}
                      className="absolute top-2 right-2 text-destructive hover:text-destructive hover:bg-destructive/10 h-7 w-7 p-0"
                      disabled={saving}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}

                  <div>
                    <Label htmlFor={`edit-session-title-${index}`} className="text-[11px]">Título de la jornada (Opcional)</Label>
                    <Input
                      id={`edit-session-title-${index}`}
                      value={session.title}
                      onChange={(e) => handleSessionChange(index, "title", e.target.value)}
                      placeholder="Ej: Día 1 - Introducción o Capacitación"
                      className="h-8 text-xs mt-1"
                      disabled={saving}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-[11px] block mb-1">Fecha *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={saving}
                            className={cn(
                              "w-full h-8 justify-start text-left text-xs font-normal",
                              !session.date && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                            {session.date ? format(session.date, "PP", { locale: es }) : "Fecha"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={session.date}
                            onSelect={(val) => handleSessionChange(index, "date", val)}
                            initialFocus
                            className="p-3 pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[11px]">Inicio *</Label>
                        <Select value={session.startTime} onValueChange={(val) => handleSessionChange(index, "startTime", val)} disabled={saving}>
                          <SelectTrigger className="h-8 text-xs mt-1">
                            <SelectValue placeholder="Inicio" />
                          </SelectTrigger>
                          <SelectContent>
                            {TIME_OPTIONS.map((time) => (
                              <SelectItem key={`edit-sess-start-${index}-${time}`} value={time} className="text-xs">{time}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-[11px]">Fin *</Label>
                        <Select value={session.endTime} onValueChange={(val) => handleSessionChange(index, "endTime", val)} disabled={saving}>
                          <SelectTrigger className="h-8 text-xs mt-1">
                            <SelectValue placeholder="Fin" />
                          </SelectTrigger>
                          <SelectContent>
                            {TIME_OPTIONS.map((time) => (
                              <SelectItem key={`edit-sess-end-${index}-${time}`} value={time} className="text-xs">{time}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddSession}
                className="w-full text-xs"
                disabled={saving}
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Añadir otra jornada
              </Button>
            </div>
          )}

          <div>
            <Label>Requisitos</Label>
            <Textarea value={requirements} onChange={(e) => setRequirements(e.target.value)} rows={2} disabled={saving} />
          </div>

          <div>
            <Label>Enlace del grupo de WhatsApp (Opcional)</Label>
            <Input value={whatsappLink} onChange={(e) => setWhatsappLink(e.target.value)} placeholder="Ej: https://chat.whatsapp.com/..." disabled={saving} />
          </div>

          {/* Transport section */}
          <div className="space-y-3 border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-1.5 text-sm font-semibold">
                  <Bus className="w-4 h-4 text-primary" />
                  Ofrecer transporte
                </Label>
                <span className="text-[11px] text-muted-foreground block">
                  Habilita puntos de recogida de ida para los voluntarios.
                </span>
              </div>
              <Switch checked={offersTransport} onCheckedChange={setOffersTransport} disabled={saving} />
            </div>

            {offersTransport && (
              <div className="space-y-4 pt-2">
                <Label className="text-xs font-semibold">Puntos de recogida (en orden de ruta)</Label>
                {transportStops.map((stop, index) => (
                  <div key={index} className="space-y-3 p-3 bg-muted/40 rounded-lg relative border border-border">
                    {transportStops.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveStop(index)}
                        className="absolute top-2 right-2 text-destructive hover:text-destructive hover:bg-destructive/10 h-7 w-7 p-0"
                        disabled={saving}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                    
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <Label htmlFor={`edit-stop-name-${index}`} className="text-[11px]">Punto de recogida *</Label>
                        <Input
                          id={`edit-stop-name-${index}`}
                          value={stop.name}
                          onChange={(e) => handleStopChange(index, "name", e.target.value)}
                          placeholder="Ej: Ovalo Higuereta"
                          className="h-8 text-xs mt-1"
                          disabled={saving}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`edit-stop-time-${index}`} className="text-[11px]">Hora *</Label>
                        <Input
                          id={`edit-stop-time-${index}`}
                          value={stop.pickupTime}
                          onChange={(e) => handleStopChange(index, "pickupTime", e.target.value)}
                          placeholder="Ej: 6:30 AM"
                          className="h-8 text-xs mt-1"
                          disabled={saving}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor={`edit-stop-address-${index}`} className="text-[11px]">Dirección / Referencia *</Label>
                      <Input
                        id={`edit-stop-address-${index}`}
                        value={stop.address}
                        onChange={(e) => handleStopChange(index, "address", e.target.value)}
                        placeholder="Ej: Frente al centro comercial, junto al grifo"
                        className="h-8 text-xs mt-1"
                        disabled={saving}
                      />
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddStop}
                  className="w-full text-xs"
                  disabled={saving}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Añadir otra parada
                </Button>
              </div>
            )}
          </div>

          <Button className="w-full gradient-cta text-primary-foreground border-0 hover:opacity-90 mt-4" onClick={handleSubmit} disabled={saving}>
            {saving ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditEventDialog;
