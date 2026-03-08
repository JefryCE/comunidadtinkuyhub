import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const CTASection = () => {
  return (
    <section className="py-20 lg:py-28">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="bg-card rounded-3xl p-10 sm:p-16 text-center border border-border shadow-hero relative overflow-hidden"
        >
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-60 h-60 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full bg-secondary/5 blur-3xl" />

          <div className="relative z-10">
            <span className="text-5xl mb-6 block">🌍</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-card-foreground mb-4">
              ¿Listo para hacer la diferencia?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
              Únete a la comunidad de voluntarios más grande. Juntos podemos
              transformar nuestro planeta, una acción a la vez.
            </p>
            <Button
              size="lg"
              className="gradient-cta text-primary-foreground border-0 hover:opacity-90 shadow-hero text-base px-10 h-14"
              onClick={() => toast.info("🚀 ¡Próximamente! El registro estará disponible muy pronto.")}
            >
              Únete a la comunidad de voluntarios
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
