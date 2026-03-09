import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Leaf, ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

const STEPS = [
  { title: "Tu situación", description: "Cuéntanos sobre ti" },
  { title: "Tipo de voluntariado", description: "¿Qué te apasiona?" },
  { title: "Frecuencia", description: "¿Cada cuánto participarías?" },
  { title: "Tu zona", description: "¿Dónde prefieres participar?" },
  { title: "Tus habilidades", description: "¿Qué puedes aportar?" },
  { title: "Notificaciones", description: "Mantente informado" },
  { title: "Liderazgo", description: "¿Te gustaría organizar?" },
];

const SITUATIONS = [
  "Estudiante de secundaria",
  "Estudiante universitario",
  "Egresado",
  "Profesional",
  "Independiente / Emprendedor",
  "Otro",
];

const VOLUNTEER_TYPES = [
  { label: "Limpieza de playas", emoji: "🌊" },
  { label: "Recuperación de parques", emoji: "🌳" },
  { label: "Limpieza de ríos", emoji: "💧" },
  { label: "Reforestación", emoji: "🌱" },
  { label: "Apoyo en albergues de animales", emoji: "🐶" },
  { label: "Apoyo social a comunidades vulnerables", emoji: "🤝" },
  { label: "Educación y tutorías para niños", emoji: "📚" },
  { label: "Campañas de reciclaje", emoji: "♻️" },
];

const FREQUENCIES = [
  "Una vez al mes",
  "Dos veces al mes",
  "Una vez por semana",
  "Solo cuando tenga tiempo",
];

const SKILLS = [
  "Organización de eventos",
  "Comunicación / difusión",
  "Trabajo físico / limpieza",
  "Educación / enseñanza",
  "Logística",
  "Fotografía / video",
  "Tecnología / sistemas",
];

const LEAD_OPTIONS = [
  "Sí, me gustaría organizar eventos",
  "Tal vez en el futuro",
  "Prefiero solo participar",
];

const Onboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const [situation, setSituation] = useState("");
  const [volunteerTypes, setVolunteerTypes] = useState<string[]>([]);
  const [frequency, setFrequency] = useState("");
  const [district, setDistrict] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [wantsNotifications, setWantsNotifications] = useState<boolean | null>(null);
  const [leadInterest, setLeadInterest] = useState("");

  const toggleArrayItem = (arr: string[], item: string, setter: (v: string[]) => void) => {
    setter(arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item]);
  };

  const canAdvance = () => {
    switch (step) {
      case 0: return !!situation;
      case 1: return volunteerTypes.length > 0;
      case 2: return !!frequency;
      case 3: return !!district.trim();
      case 4: return skills.length > 0;
      case 5: return wantsNotifications !== null;
      case 6: return !!leadInterest;
      default: return false;
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      // User not authenticated yet - save to localStorage and redirect
      const surveyData = {
        current_situation: situation,
        volunteer_types: volunteerTypes,
        frequency,
        preferred_district: district.trim(),
        skills,
        wants_notifications: wantsNotifications ?? false,
        lead_interest: leadInterest,
      };
      localStorage.setItem("pending_survey", JSON.stringify(surveyData));
      toast.success("¡Encuesta guardada! Se enviará cuando confirmes tu email.");
      navigate("/");
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("volunteer_surveys" as any).insert({
      user_id: user.id,
      current_situation: situation,
      volunteer_types: volunteerTypes,
      frequency,
      preferred_district: district.trim(),
      skills,
      wants_notifications: wantsNotifications ?? false,
      lead_interest: leadInterest,
    } as any);
    setLoading(false);
    if (error) {
      console.error("Survey insert error:", error);
      toast.error("Error al guardar tu encuesta. Intenta de nuevo.");
    } else {
      toast.success("¡Bienvenido a TinkuyHub! 🎉");
      navigate("/");
    }
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else handleSubmit();
  };

  const handleSkip = () => {
    navigate("/");
  };

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-primary/5 blur-3xl -z-10" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-secondary/5 blur-3xl -z-10" />

      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-xl gradient-hero flex items-center justify-center">
              <Leaf className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">TINKUYHUB</span>
          </div>
          <h1 className="text-xl font-bold text-foreground flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Encuesta de Bienvenida
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Paso {step + 1} de {STEPS.length} — {STEPS[step].description}
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-muted rounded-full mb-6 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: "var(--gradient-cta)" }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Card */}
        <div className="bg-card rounded-2xl border border-border shadow-card p-6 min-h-[340px] flex flex-col">
          <h2 className="text-lg font-semibold text-foreground mb-4">{STEPS[step].title}</h2>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex-1"
            >
              {/* Step 0: Situación */}
              {step === 0 && (
                <RadioGroup value={situation} onValueChange={setSituation} className="space-y-2">
                  {SITUATIONS.map((s) => (
                    <label
                      key={s}
                      className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/40 cursor-pointer transition-colors has-[data-state=checked]:border-primary has-[data-state=checked]:bg-primary/5"
                    >
                      <RadioGroupItem value={s} />
                      <span className="text-sm text-foreground">{s}</span>
                    </label>
                  ))}
                </RadioGroup>
              )}

              {/* Step 1: Tipos de voluntariado */}
              {step === 1 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {VOLUNTEER_TYPES.map((t) => (
                    <label
                      key={t.label}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                        volunteerTypes.includes(t.label)
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      <Checkbox
                        checked={volunteerTypes.includes(t.label)}
                        onCheckedChange={() => toggleArrayItem(volunteerTypes, t.label, setVolunteerTypes)}
                      />
                      <span className="text-sm text-foreground">
                        {t.emoji} {t.label}
                      </span>
                    </label>
                  ))}
                </div>
              )}

              {/* Step 2: Frecuencia */}
              {step === 2 && (
                <RadioGroup value={frequency} onValueChange={setFrequency} className="space-y-2">
                  {FREQUENCIES.map((f) => (
                    <label
                      key={f}
                      className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/40 cursor-pointer transition-colors has-[data-state=checked]:border-primary has-[data-state=checked]:bg-primary/5"
                    >
                      <RadioGroupItem value={f} />
                      <span className="text-sm text-foreground">{f}</span>
                    </label>
                  ))}
                </RadioGroup>
              )}

              {/* Step 3: Distrito */}
              {step === 3 && (
                <div className="space-y-3">
                  <Label htmlFor="district" className="text-sm text-muted-foreground">
                    Escribe tu distrito o ciudad preferida
                  </Label>
                  <Input
                    id="district"
                    placeholder="Ej: Miraflores, Lima"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="text-base"
                  />
                </div>
              )}

              {/* Step 4: Habilidades */}
              {step === 4 && (
                <div className="space-y-2">
                  {SKILLS.map((s) => (
                    <label
                      key={s}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                        skills.includes(s)
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      <Checkbox
                        checked={skills.includes(s)}
                        onCheckedChange={() => toggleArrayItem(skills, s, setSkills)}
                      />
                      <span className="text-sm text-foreground">{s}</span>
                    </label>
                  ))}
                </div>
              )}

              {/* Step 5: Notificaciones */}
              {step === 5 && (
                <RadioGroup
                  value={wantsNotifications === null ? "" : wantsNotifications ? "yes" : "no"}
                  onValueChange={(v) => setWantsNotifications(v === "yes")}
                  className="space-y-2"
                >
                  {[
                    { value: "yes", label: "Sí, quiero recibir notificaciones" },
                    { value: "no", label: "No, prefiero no recibirlas" },
                  ].map((opt) => (
                    <label
                      key={opt.value}
                      className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/40 cursor-pointer transition-colors has-[data-state=checked]:border-primary has-[data-state=checked]:bg-primary/5"
                    >
                      <RadioGroupItem value={opt.value} />
                      <span className="text-sm text-foreground">{opt.label}</span>
                    </label>
                  ))}
                </RadioGroup>
              )}

              {/* Step 6: Liderazgo */}
              {step === 6 && (
                <RadioGroup value={leadInterest} onValueChange={setLeadInterest} className="space-y-2">
                  {LEAD_OPTIONS.map((opt) => (
                    <label
                      key={opt}
                      className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/40 cursor-pointer transition-colors has-[data-state=checked]:border-primary has-[data-state=checked]:bg-primary/5"
                    >
                      <RadioGroupItem value={opt} />
                      <span className="text-sm text-foreground">{opt}</span>
                    </label>
                  ))}
                </RadioGroup>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
            <div>
              {step > 0 ? (
                <Button variant="ghost" size="sm" onClick={() => setStep(step - 1)}>
                  <ArrowLeft className="w-4 h-4 mr-1" /> Atrás
                </Button>
              ) : (
                <Button variant="ghost" size="sm" onClick={handleSkip} className="text-muted-foreground">
                  Omitir
                </Button>
              )}
            </div>
            <Button
              onClick={handleNext}
              disabled={!canAdvance() || loading}
              className="gradient-cta text-primary-foreground border-0 hover:opacity-90"
              size="sm"
            >
              {loading ? "Guardando..." : step === STEPS.length - 1 ? (
                <>Finalizar <Check className="w-4 h-4 ml-1" /></>
              ) : (
                <>Siguiente <ArrowRight className="w-4 h-4 ml-1" /></>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
