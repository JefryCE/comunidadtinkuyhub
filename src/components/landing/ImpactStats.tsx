import { motion } from "framer-motion";

const stats = [
  { value: "350+", label: "Eventos realizados", emoji: "📅" },
  { value: "2,400+", label: "Voluntarios activos", emoji: "🙋" },
  { value: "12,000+", label: "Horas de voluntariado", emoji: "⏱️" },
  { value: "8,500 kg", label: "Basura recogida", emoji: "♻️" },
];

const ImpactStats = () => {
  return (
    <section id="impacto" className="py-20 lg:py-28 gradient-hero relative overflow-hidden">
      {/* Decorative circles */}
      <div className="absolute top-10 left-10 w-40 h-40 rounded-full bg-primary-foreground/5 blur-2xl" />
      <div className="absolute bottom-10 right-10 w-60 h-60 rounded-full bg-primary-foreground/5 blur-2xl" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-extrabold text-primary-foreground mb-4">
            Nuestro impacto colectivo
          </h2>
          <p className="text-primary-foreground/80 max-w-md mx-auto">
            Cada acción cuenta. Mira lo que hemos logrado juntos.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="bg-primary-foreground/10 backdrop-blur-sm rounded-2xl p-6 text-center border border-primary-foreground/10"
            >
              <span className="text-3xl mb-3 block">{stat.emoji}</span>
              <p className="text-3xl sm:text-4xl font-extrabold text-primary-foreground mb-1">
                {stat.value}
              </p>
              <p className="text-sm text-primary-foreground/70">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ImpactStats;
