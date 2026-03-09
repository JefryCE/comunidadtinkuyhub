import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Leaf, Menu, X, LogOut, UserRound, LayoutDashboard, MapPin, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const scrollToSection = (id: string) => {
    setMobileOpen(false);

    // Si no estamos en la landing, primero navegamos al home y luego hacemos scroll.
    if (location.pathname !== "/") {
      navigate("/");
      window.setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      }, 60);
      return;
    }

    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success("¡Hasta pronto! 👋");
  };

  const links = [
    { label: "Inicio", id: "hero" },
    { label: "Cómo funciona", id: "como-funciona" },
    { label: "Eventos", id: "eventos" },
    { label: "Impacto", id: "impacto" },
  ];

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <button onClick={() => scrollToSection("hero")} className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl gradient-hero flex items-center justify-center">
              <Leaf className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">TINKUYHUB</span>
          </button>

          <div className="hidden md:flex items-center gap-8">
            {links.map((link) => (
              <button
                key={link.id}
                onClick={() => scrollToSection(link.id)}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </button>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate("/eventos")}>
                  <MapPin className="w-4 h-4 mr-1" />
                  Mapa
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
                  <LayoutDashboard className="w-4 h-4 mr-1" />
                  Dashboard
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate("/ranking")}>
                  <Trophy className="w-4 h-4 mr-1" />
                  Ranking
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate("/profile")}>
                  <UserRound className="w-4 h-4 mr-1" />
                  Perfil
                </Button>
                <span className="text-sm text-muted-foreground">
                  {user.user_metadata?.full_name || user.email}
                </span>
                <Button variant="ghost" size="sm" onClick={handleSignOut}>
                  <LogOut className="w-4 h-4 mr-1" />
                  Salir
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>
                  Iniciar sesión
                </Button>
                <Button
                  size="sm"
                  className="gradient-cta text-primary-foreground border-0 hover:opacity-90"
                  onClick={() => navigate("/auth")}
                >
                  Únete gratis
                </Button>
              </>
            )}
          </div>

          <button className="md:hidden text-foreground" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden bg-background border-b border-border overflow-hidden"
          >
            <div className="px-4 py-4 space-y-3">
              {links.map((link) => (
                <button
                  key={link.id}
                  onClick={() => scrollToSection(link.id)}
                  className="block w-full text-left text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
                >
                  {link.label}
                </button>
              ))}
              <div className="pt-3 border-t border-border space-y-2">
                {user ? (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-center"
                      onClick={() => {
                        setMobileOpen(false);
                        navigate("/eventos");
                      }}
                    >
                      <MapPin className="w-4 h-4 mr-1" />
                      Mapa
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-center"
                      onClick={() => {
                        setMobileOpen(false);
                        navigate("/dashboard");
                      }}
                    >
                      <LayoutDashboard className="w-4 h-4 mr-1" />
                      Dashboard
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-center"
                      onClick={() => {
                        setMobileOpen(false);
                        navigate("/ranking");
                      }}
                    >
                      <Trophy className="w-4 h-4 mr-1" />
                      Ranking
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-center"
                      onClick={() => {
                        setMobileOpen(false);
                        navigate("/profile");
                      }}
                    >
                      <UserRound className="w-4 h-4 mr-1" />
                      Mi perfil
                    </Button>
                    <Button variant="ghost" size="sm" className="w-full justify-center" onClick={handleSignOut}>
                      <LogOut className="w-4 h-4 mr-1" />
                      Cerrar sesión
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-center"
                      onClick={() => {
                        setMobileOpen(false);
                        navigate("/auth");
                      }}
                    >
                      Iniciar sesión
                    </Button>
                    <Button
                      size="sm"
                      className="w-full gradient-cta text-primary-foreground border-0"
                      onClick={() => {
                        setMobileOpen(false);
                        navigate("/auth");
                      }}
                    >
                      Únete gratis
                    </Button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default Navbar;
