import { motion } from "framer-motion";
import { Copy, Check, ExternalLink } from "lucide-react";
import { useState } from "react";
import { type ShareData, whatsappUrl, twitterUrl, facebookUrl, linkedinUrl, telegramUrl, copyToClipboard, nativeShare } from "@/lib/socialShare";
import { toast } from "sonner";

// SVG icons inline to avoid extra dependencies
const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.944 11.944 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.295 0-4.437-.764-6.148-2.053l-.429-.328-3.12 1.046 1.046-3.12-.328-.429A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
  </svg>
);

const TwitterIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const LinkedInIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

const TelegramIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0h-.056zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);

interface SocialButton {
  name: string;
  icon: React.ReactNode;
  getUrl: (data: ShareData) => string;
  color: string;
  hoverColor: string;
}

const socialButtons: SocialButton[] = [
  {
    name: "WhatsApp",
    icon: <WhatsAppIcon />,
    getUrl: whatsappUrl,
    color: "bg-[#25D366]/10 text-[#25D366]",
    hoverColor: "hover:bg-[#25D366]/20",
  },
  {
    name: "Twitter / X",
    icon: <TwitterIcon />,
    getUrl: twitterUrl,
    color: "bg-foreground/5 text-foreground",
    hoverColor: "hover:bg-foreground/10",
  },
  {
    name: "Facebook",
    icon: <FacebookIcon />,
    getUrl: facebookUrl,
    color: "bg-[#1877F2]/10 text-[#1877F2]",
    hoverColor: "hover:bg-[#1877F2]/20",
  },
  {
    name: "LinkedIn",
    icon: <LinkedInIcon />,
    getUrl: linkedinUrl,
    color: "bg-[#0A66C2]/10 text-[#0A66C2]",
    hoverColor: "hover:bg-[#0A66C2]/20",
  },
  {
    name: "Telegram",
    icon: <TelegramIcon />,
    getUrl: telegramUrl,
    color: "bg-[#26A5E4]/10 text-[#26A5E4]",
    hoverColor: "hover:bg-[#26A5E4]/20",
  },
];

interface ShareButtonsProps {
  data: ShareData;
}

const ShareButtons = ({ data }: ShareButtonsProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await copyToClipboard(data);
    setCopied(true);
    toast.success("📋 ¡Copiado al portapapeles!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = async () => {
    const success = await nativeShare(data);
    if (!success) handleCopy();
  };

  return (
    <div className="space-y-3">
      {/* Main social grid */}
      <div className="grid grid-cols-5 gap-2">
        {socialButtons.map((btn, i) => (
          <motion.a
            key={btn.name}
            href={btn.getUrl(data)}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className={`flex flex-col items-center justify-center gap-1.5 rounded-xl p-3 transition-all duration-200 ${btn.color} ${btn.hoverColor} cursor-pointer`}
          >
            {btn.icon}
            <span className="text-[9px] font-semibold leading-none">{btn.name}</span>
          </motion.a>
        ))}
      </div>

      {/* Bottom actions */}
      <div className="flex gap-2">
        <button
          onClick={handleCopy}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-border bg-muted/50 hover:bg-muted px-3 py-2.5 text-xs font-semibold text-foreground transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-500" />
              <span className="text-emerald-500">¡Copiado!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copiar enlace
            </>
          )}
        </button>

        {"share" in navigator && (
          <button
            onClick={handleNativeShare}
            className="flex items-center justify-center gap-2 rounded-xl border border-border bg-muted/50 hover:bg-muted px-4 py-2.5 text-xs font-semibold text-foreground transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Más
          </button>
        )}
      </div>
    </div>
  );
};

export default ShareButtons;
