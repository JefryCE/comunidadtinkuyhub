import { motion } from "framer-motion";
import { UserPlus, Search, Heart } from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    emoji: "1️⃣",
    title: "Crea tu cuenta",
    description: "Regístrate en menos de un minuto y personaliza tu perfil de voluntario.",
  },
  {
    icon: Search,
    emoji: "2️⃣",
    title: "Encuentra eventos",
    description: "Explora el mapa con los eventos disponibles y encuentra actividades de voluntariado cerca de ti.",
  },
  {
    icon: Heart,
    emoji: "3️⃣",
    title: "Genera impacto",
    description: "Únete a eventos, acumula puntos, gana medallas y transforma tu comunidad.",
  },
];

const HowItWorks = () => {
  return (
    <section id="como-funciona" className="py-20 lg:py-28 bg-muted/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="inline-block bg-accent text-accent-foreground text-xs font-semibold px-3 py-1 rounded-full mb-4">
            Así de fácil
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground">
            ¿Cómo funciona?
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
              className="relative bg-card rounded-2xl p-8 border border-border shadow-card text-center group hover:shadow-hero transition-shadow duration-300"
            >
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl gradient-hero flex items-center justify-center">
                <step.icon className="w-8 h-8 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-bold text-card-foreground mb-3">{step.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
