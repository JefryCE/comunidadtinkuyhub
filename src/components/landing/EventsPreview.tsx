import { motion } from "framer-motion";
import { MapPin, Calendar, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const events = [
  {
    emoji: "🌊",
    type: "Limpieza de playa",
    title: "Gran limpieza Playa del Sol",
    location: "Costa Verde",
    date: "15 Mar 2026",
    volunteers: 34,
    max: 50,
    color: "from-secondary to-primary",
  },
  {
    emoji: "🌳",
    type: "Reforestación",
    title: "Plantación de árboles nativos",
    location: "Parque Nacional",
    date: "22 Mar 2026",
    volunteers: 18,
    max: 30,
    color: "from-primary to-primary",
  },
  {
    emoji: "🏞️",
    type: "Recuperación de parque",
    title: "Renovemos el Parque Central",
    location: "Centro Histórico",
    date: "29 Mar 2026",
    volunteers: 42,
    max: 60,
    color: "from-primary to-secondary",
  },
];

const EventsPreview = () => {
  return (
    <section id="eventos" className="py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="inline-block bg-accent text-accent-foreground text-xs font-semibold px-3 py-1 rounded-full mb-4">
            Próximos eventos
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-4">
            Eventos que te esperan
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Encuentra actividades de voluntariado cerca de ti y únete a la comunidad.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {events.map((event, index) => (
            <motion.div
              key={event.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-card rounded-2xl border border-border overflow-hidden shadow-card hover:shadow-hero transition-all duration-300 group"
            >
              {/* Color bar */}
              <div className={`h-2 bg-gradient-to-r ${event.color}`} />

              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">{event.emoji}</span>
                  <span className="text-xs font-semibold text-primary bg-accent px-2 py-0.5 rounded-full">
                    {event.type}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-card-foreground mb-3 group-hover:text-primary transition-colors">
                  {event.title}
                </h3>

                <div className="space-y-2 mb-5">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>{event.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>{event.date}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span>{event.volunteers}/{event.max} voluntarios</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-muted rounded-full h-2 mb-4">
                  <div
                    className="h-2 rounded-full gradient-hero transition-all duration-500"
                    style={{ width: `${(event.volunteers / event.max) * 100}%` }}
                  />
                </div>

                <Button
                  className="w-full gradient-cta text-primary-foreground border-0 hover:opacity-90"
                  size="sm"
                  onClick={() => toast.success(`🎉 ¡Te has inscrito a "${event.title}"! (demo)`)}
                >
                  Unirme al evento
                </Button>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="text-center mt-10"
        >
          <Button variant="outline" size="lg" onClick={() => toast.info("📋 ¡Próximamente! La lista completa de eventos estará disponible pronto.")}>
            Ver todos los eventos
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default EventsPreview;
