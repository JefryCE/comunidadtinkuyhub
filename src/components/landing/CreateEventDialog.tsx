import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, MapPin, CalendarIcon, Bus, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useSearchParams } from "react-router-dom";
import { awardPointsForCreate, BADGES } from "@/lib/gamification";
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

const TIME_OPTIONS = Array.from({ length: 48 }).map((_, i) => {
  const hour = Math.floor(i / 2);
  const min = i % 2 === 0 ? "00" : "30";
  const ampm = hour < 12 ? "AM" : "PM";
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h12}:${min} ${ampm}`;
});

const CreateEventDialog = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [saving, setSaving] = useState(false);
  const open = searchParams.get("create") === "true";
  
  const setOpen = (val: boolean) => {
    if (val) {
      searchParams.set("create", "true");
    } else {
      searchParams.delete("create");
    }
    setSearchParams(searchParams);
  };
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [typeIndex, setTypeIndex] = useState<string>("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [startTime, setStartTime] = useState("8:00 AM");
  const [endTime, setEndTime] = useState("12:00 PM");
  const [requirements, setRequirements] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [whatsappLink, setWhatsappLink] = useState("");
  
  // Transport states
  const [offersTransport, setOffersTransport] = useState(false);
  const [transportStops, setTransportStops] = useState<{ name: string; address: string; pickupTime: string }[]>([
    { name: "", address: "", pickupTime: "8:00 AM" }
  ]);

  // Multiday states
  const [isMultiday, setIsMultiday] = useState(false);
  const [sessions, setSessions] = useState<{ title: string; date: Date | undefined; startTime: string; endTime: string }[]>([
    { title: "", date: undefined, startTime: "8:00 AM", endTime: "12:00 PM" }
  ]);

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
  
  // Save draft to localStorage
  useEffect(() => {
    const draft = { 
      title, 
      description, 
      typeIndex, 
      location, 
      startTime, 
      endTime, 
      requirements, 
      coords, 
      whatsappLink,
      offersTransport,
      transportStops,
      isMultiday,
      sessions: sessions.map(s => ({
        ...s,
        date: s.date ? s.date.toISOString() : null
      }))
    };
    localStorage.setItem("create-event-draft", JSON.stringify(draft));
  }, [title, description, typeIndex, location, startTime, endTime, requirements, coords, whatsappLink, offersTransport, transportStops, isMultiday, sessions]);

  // Load draft from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("create-event-draft");
    if (saved) {
      try {
        const d = JSON.parse(saved);
        if (d.title) setTitle(d.title);
        if (d.description) setDescription(d.description);
        if (d.typeIndex) setTypeIndex(d.typeIndex);
        if (d.location) setLocation(d.location);
        if (d.startTime) setStartTime(d.startTime);
        if (d.endTime) setEndTime(d.endTime);
        if (d.requirements) setRequirements(d.requirements);
        if (d.coords) setCoords(d.coords);
        if (d.whatsappLink) setWhatsappLink(d.whatsappLink);
        if (d.offersTransport !== undefined) setOffersTransport(d.offersTransport);
        if (d.transportStops) setTransportStops(d.transportStops);
        if (d.isMultiday !== undefined) setIsMultiday(d.isMultiday);
        if (d.sessions) {
          setSessions(d.sessions.map((s: any) => ({
            ...s,
            date: s.date ? new Date(s.date) : undefined
          })));
        }

        // Auto-open only if there's significant content and it's not already open
        if ((d.title || d.description) && !open) {
          setOpen(true);
        }
      } catch (e) {
        console.error("Failed to load draft");
      }
    }
  }, []);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setTypeIndex("");
    setLocation("");
    setDate(undefined);
    setStartTime("8:00 AM");
    setEndTime("12:00 PM");
    setRequirements("");
    setCoords(null);
    setWhatsappLink("");
    setOffersTransport(false);
    setTransportStops([{ name: "", address: "", pickupTime: "8:00 AM" }]);
    setIsMultiday(false);
    setSessions([{ title: "", date: undefined, startTime: "8:00 AM", endTime: "12:00 PM" }]);
    localStorage.removeItem("create-event-draft");
  };

  const handleOpen = () => {
    if (!user) {
      toast.info("Inicia sesión para crear un evento.");
      navigate("/auth");
      return;
    }
    setOpen(true);
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
    if (!title.trim() || !description.trim() || !typeIndex || !location.trim()) {
      toast.error("Completa todos los campos obligatorios.");
      return;
    }

    if (!isMultiday && !date) {
      toast.error("Completa todos los campos obligatorios (fecha).");
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

    const eventType = EVENT_TYPES[Number(typeIndex)];
    setSaving(true);

    try {
      const eventDate = isMultiday 
        ? formatMultidayDate(sessions)
        : date ? format(date, "d 'de' MMMM, yyyy", { locale: es }) : "";
        
      const eventSchedule = isMultiday 
        ? "Varios horarios" 
        : `${startTime} - ${endTime}`;

      const { data: newEvent, error } = await supabase
        .from("events")
        .insert({
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
          created_by: user!.id,
          latitude: coords?.lat ?? null,
          longitude: coords?.lng ?? null,
          whatsapp_group_link: whatsappLink.trim() || null,
          offers_transport: offersTransport,
          is_multiday: isMultiday,
        } as any)
        .select("id")
        .single();

      if (error) throw error;

      // Insert event sessions if multiday
      if (isMultiday && sessions.length > 0) {
        const sessionsToInsert = sessions.map((session, index) => ({
          event_id: newEvent.id,
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

      if (offersTransport && transportStops.length > 0) {
        const stopsToInsert = transportStops.map((stop, index) => ({
          event_id: newEvent.id,
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

      // Otorgar puntos por crear evento y mostrar toasts
      awardPointsForCreate(user!.id)
        .then((result) => {
          if (result) {
            toast.success(`🎉 ¡Evento creado exitosamente! Has ganado +${result.pointsEarned} puntos.`);
            if (result.newBadges && result.newBadges.length > 0) {
              result.newBadges.forEach((badgeId) => {
                const badge = BADGES.find((b) => b.id === badgeId);
                if (badge) toast.success(`🏅 ¡Medalla desbloqueada: ${badge.name}!`);
              });
            }
          } else {
            toast.success("🎉 ¡Evento creado exitosamente!");
          }
        })
        .catch((err) => {
          console.error("Error al otorgar puntos por creación:", err);
          toast.success("🎉 ¡Evento creado exitosamente!");
        });

      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-events"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
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
        <DialogContent 
          className="sm:max-w-lg max-h-[90vh] overflow-y-auto"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
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

            <div>
              <Label htmlFor="ev-location">Ubicación *</Label>
              <Input id="ev-location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ej: Parque Central" disabled={saving} />
            </div>

            <div>
              <Label className="flex items-center gap-1.5 mb-1.5">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                Selecciona en el mapa
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
                  <Label>Fecha *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        disabled={saving}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "PPP", { locale: es }) : "Selecciona una fecha"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        disabled={(d) => d < new Date()}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ev-start">Hora inicio</Label>
                    <Select value={startTime} onValueChange={setStartTime} disabled={saving}>
                      <SelectTrigger id="ev-start">
                        <SelectValue placeholder="Inicio" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_OPTIONS.map((time) => (
                          <SelectItem key={`start-${time}`} value={time}>{time}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ev-end">Hora fin</Label>
                    <Select value={endTime} onValueChange={setEndTime} disabled={saving}>
                      <SelectTrigger id="ev-end">
                        <SelectValue placeholder="Fin" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_OPTIONS.map((time) => (
                          <SelectItem key={`end-${time}`} value={time}>{time}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                      <Label htmlFor={`session-title-${index}`} className="text-[11px]">Título de la jornada (Opcional)</Label>
                      <Input
                        id={`session-title-${index}`}
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
                              disabled={(d) => d < new Date()}
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
                                <SelectItem key={`sess-start-${index}-${time}`} value={time} className="text-xs">{time}</SelectItem>
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
                                <SelectItem key={`sess-end-${index}-${time}`} value={time} className="text-xs">{time}</SelectItem>
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
              <Label htmlFor="ev-req">Requisitos</Label>
              <Textarea id="ev-req" value={requirements} onChange={(e) => setRequirements(e.target.value)} placeholder="Ej: Ropa cómoda, protector solar" rows={2} disabled={saving} />
            </div>

            <div>
              <Label htmlFor="ev-whatsapp">Enlace del grupo de WhatsApp (Opcional)</Label>
              <Input id="ev-whatsapp" value={whatsappLink} onChange={(e) => setWhatsappLink(e.target.value)} placeholder="Ej: https://chat.whatsapp.com/..." disabled={saving} />
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
                          <Label htmlFor={`stop-name-${index}`} className="text-[11px]">Punto de recogida *</Label>
                          <Input
                            id={`stop-name-${index}`}
                            value={stop.name}
                            onChange={(e) => handleStopChange(index, "name", e.target.value)}
                            placeholder="Ej: Ovalo Higuereta"
                            className="h-8 text-xs mt-1"
                            disabled={saving}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`stop-time-${index}`} className="text-[11px]">Hora *</Label>
                          <Input
                            id={`stop-time-${index}`}
                            value={stop.pickupTime}
                            onChange={(e) => handleStopChange(index, "pickupTime", e.target.value)}
                            placeholder="Ej: 6:30 AM"
                            className="h-8 text-xs mt-1"
                            disabled={saving}
                          />
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor={`stop-address-${index}`} className="text-[11px]">Dirección / Referencia *</Label>
                        <Input
                          id={`stop-address-${index}`}
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

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button className="flex-[2] gradient-cta text-primary-foreground border-0 hover:opacity-90" onClick={handleSubmit} disabled={saving}>
                {saving ? "Creando..." : "Publicar evento"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CreateEventDialog;
