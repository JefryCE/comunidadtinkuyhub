import { motion } from "framer-motion";
import { ArrowRight, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/hero-volunteers.jpg";

const HeroSection = () => {
  const navigate = useNavigate();
  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section id="hero" className="relative min-h-screen flex items-center pt-16 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 right-0 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-secondary/5 blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Text */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 bg-accent rounded-full px-4 py-1.5 mb-6"
            >
              <span className="text-xs font-semibold text-accent-foreground">🌱 Plataforma de voluntariado</span>
            </motion.div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight text-foreground mb-6">
              Conecta, actúa y{" "}
              <span className="text-gradient">transforma</span>{" "}
              tu comunidad
            </h1>

            <p className="text-lg text-muted-foreground mb-8 max-w-lg">
              Únete a miles de voluntarios que están limpiando playas, reforestando bosques y
              recuperando parques. Tu impacto empieza aquí.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                size="lg"
                className="gradient-cta text-primary-foreground border-0 hover:opacity-90 shadow-hero text-base px-8 h-12"
                onClick={() => toast.info("🚀 ¡Próximamente! El registro estará disponible muy pronto.")}
              >
                Únete como voluntario
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="text-base px-8 h-12"
                onClick={() => scrollToSection("eventos")}
              >
                <MapPin className="mr-2 w-5 h-5" />
                Explorar eventos
              </Button>
            </div>

            {/* Social proof */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-10 flex items-center gap-4"
            >
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-10 h-10 rounded-full border-2 border-background gradient-hero"
                  />
                ))}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">+2,400 voluntarios</p>
                <p className="text-xs text-muted-foreground">ya están generando impacto</p>
              </div>
            </motion.div>
          </motion.div>

          {/* Image */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
            className="relative"
          >
            <div className="relative rounded-3xl overflow-hidden shadow-hero">
              <img
                src={heroImage}
                alt="Voluntarios limpiando una playa"
                className="w-full h-[400px] lg:h-[500px] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/20 to-transparent" />
            </div>

            {/* Floating card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 0.5 }}
              className="absolute -bottom-6 -left-6 bg-card rounded-2xl p-4 shadow-card border border-border"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl gradient-hero flex items-center justify-center text-2xl">
                  🌊
                </div>
                <div>
                  <p className="text-sm font-bold text-card-foreground">Limpieza de playa</p>
                  <p className="text-xs text-muted-foreground">Próximo sábado • 28 inscritos</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
