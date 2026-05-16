import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Share2, X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import ShareButtons from "@/components/ui/ShareButtons";
import { type ShareData } from "@/lib/socialShare";
import { toast } from "sonner";

interface ShareAchievementProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ShareData;
  /** Visual card content */
  cardContent: {
    icon: string;
    title: string;
    subtitle: string;
    stats?: { label: string; value: string | number }[];
  };
}

const ShareAchievement = ({ open, onOpenChange, data, cardContent }: ShareAchievementProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const downloadCard = async () => {
    if (!cardRef.current) return;
    setDownloading(true);

    try {
      // Use html2canvas-like approach: render to canvas via SVG foreignObject
      const card = cardRef.current;
      const { width, height } = card.getBoundingClientRect();

      const canvas = document.createElement("canvas");
      const scale = 2; // retina
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.scale(scale, scale);

      // Draw gradient background
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, "#e63a93");
      gradient.addColorStop(1, "#1e3a5f");
      ctx.fillStyle = gradient;

      // Rounded rect
      const r = 24;
      ctx.beginPath();
      ctx.moveTo(r, 0);
      ctx.lineTo(width - r, 0);
      ctx.quadraticCurveTo(width, 0, width, r);
      ctx.lineTo(width, height - r);
      ctx.quadraticCurveTo(width, height, width - r, height);
      ctx.lineTo(r, height);
      ctx.quadraticCurveTo(0, height, 0, height - r);
      ctx.lineTo(0, r);
      ctx.quadraticCurveTo(0, 0, r, 0);
      ctx.closePath();
      ctx.fill();

      // Draw text
      ctx.fillStyle = "white";
      ctx.textAlign = "center";

      // Icon (emoji)
      ctx.font = "48px serif";
      ctx.fillText(cardContent.icon, width / 2, 70);

      // Title
      ctx.font = "bold 20px 'Plus Jakarta Sans', sans-serif";
      ctx.fillText(cardContent.title, width / 2, 110);

      // Subtitle
      ctx.font = "14px 'Plus Jakarta Sans', sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.fillText(cardContent.subtitle, width / 2, 135);

      // Stats
      if (cardContent.stats) {
        const startX = width / (cardContent.stats.length + 1);
        cardContent.stats.forEach((stat, i) => {
          const x = startX * (i + 1);
          ctx.fillStyle = "white";
          ctx.font = "bold 28px 'Plus Jakarta Sans', sans-serif";
          ctx.fillText(String(stat.value), x, 180);
          ctx.font = "10px 'Plus Jakarta Sans', sans-serif";
          ctx.fillStyle = "rgba(255,255,255,0.7)";
          ctx.fillText(stat.label, x, 198);
        });
      }

      // Brand
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = "bold 10px 'Plus Jakarta Sans', sans-serif";
      ctx.fillText("TINKUYHUB · Voluntariado Comunitario", width / 2, height - 16);

      // Download
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `tinkuyhub-logro-${Date.now()}.png`;
      a.click();
      toast.success("🖼️ ¡Imagen descargada!");
    } catch {
      toast.error("No se pudo generar la imagen");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" />
            Compartir logro
          </DialogTitle>
          <DialogDescription>
            Comparte tu logro con la comunidad y motiva a más personas
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Preview Card */}
          <div
            ref={cardRef}
            className="relative overflow-hidden rounded-2xl p-6 text-center text-white"
            style={{
              background: "linear-gradient(135deg, #e63a93, #1e3a5f)",
              minHeight: 220,
            }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.1),transparent_50%)] pointer-events-none" />

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.1 }}
              className="text-5xl mb-3"
            >
              {cardContent.icon}
            </motion.div>

            <motion.h3
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="font-extrabold text-lg leading-tight"
            >
              {cardContent.title}
            </motion.h3>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-white/80 text-xs mt-1"
            >
              {cardContent.subtitle}
            </motion.p>

            {cardContent.stats && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="flex justify-center gap-8 mt-5"
              >
                {cardContent.stats.map((stat) => (
                  <div key={stat.label}>
                    <p className="text-2xl font-extrabold">{stat.value}</p>
                    <p className="text-[10px] text-white/60 uppercase tracking-wider font-medium">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </motion.div>
            )}

            <p className="absolute bottom-2 left-0 right-0 text-[9px] text-white/40 font-bold tracking-widest">
              TINKUYHUB · VOLUNTARIADO COMUNITARIO
            </p>
          </div>

          {/* Download card image */}
          <Button
            variant="outline"
            size="sm"
            onClick={downloadCard}
            disabled={downloading}
            className="w-full gap-2 text-xs"
          >
            <Download className="w-3.5 h-3.5" />
            {downloading ? "Generando..." : "Descargar imagen"}
          </Button>

          {/* Share Buttons */}
          <ShareButtons data={data} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareAchievement;
