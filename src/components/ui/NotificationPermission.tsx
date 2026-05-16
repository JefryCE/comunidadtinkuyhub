import { motion, AnimatePresence } from "framer-motion";
import { Bell, BellOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

const NotificationPermission = () => {
  const { user } = useAuth();
  const { permissionState, requestPermission, settings } = usePushNotifications();
  const [visible, setVisible] = useState(false);

  // Show the prompt only once, after login, if permission hasn't been granted or denied
  useEffect(() => {
    if (!user) return;
    if (permissionState !== "default") return;

    // Small delay so the user settles in first
    const timeout = setTimeout(() => {
      const dismissed = localStorage.getItem("tinkuyhub-notif-dismissed");
      if (!dismissed) setVisible(true);
    }, 3000);

    return () => clearTimeout(timeout);
  }, [user, permissionState]);

  const handleAllow = async () => {
    await requestPermission();
    setVisible(false);
  };

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem("tinkuyhub-notif-dismissed", "true");
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 100, opacity: 0, scale: 0.95 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[90vw] max-w-md"
        >
          <div className="bg-card border border-border rounded-2xl shadow-2xl p-5 relative overflow-hidden">
            {/* Glow accent */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/20 rounded-full blur-3xl pointer-events-none" />

            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <Bell className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-foreground text-sm leading-tight">
                  ¿Activar notificaciones?
                </h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Te avisaremos cuando se creen eventos de voluntariado cerca de ti. Puedes desactivarlas cuando quieras.
                </p>
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    onClick={handleAllow}
                    className="gradient-cta text-primary-foreground border-0 hover:opacity-90 text-xs h-8 px-4"
                  >
                    <Bell className="w-3.5 h-3.5 mr-1.5" />
                    Activar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDismiss}
                    className="text-xs h-8 px-3 text-muted-foreground"
                  >
                    <BellOff className="w-3.5 h-3.5 mr-1.5" />
                    Ahora no
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NotificationPermission;
