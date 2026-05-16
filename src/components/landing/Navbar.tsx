import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Leaf, Menu, X, LogOut, UserRound, LayoutDashboard, MapPin, Trophy, ChevronDown, Bell, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import ThemeToggle from "@/components/landing/ThemeToggle";


const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const scrollToSection = (id: string) => {
    setMobileOpen(false);

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
    navigate("/");
    toast.success("¡Hasta pronto! 👋");
  };

  const links = [
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
            <ThemeToggle />
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2 px-2 hover:bg-primary/5 transition-all duration-300">
                    <Avatar className="h-8 w-8 border border-border shadow-sm">
                      <AvatarImage src={user.user_metadata?.avatar_url} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                        {(user.user_metadata?.full_name || user.email || "U").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start text-left">
                      <span className="text-sm font-bold text-foreground leading-none">
                        {user.user_metadata?.full_name || "Mi Cuenta"}
                      </span>
                      <span className="text-[10px] text-muted-foreground leading-tight truncate max-w-[120px]">
                        {user.email}
                      </span>
                    </div>
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl shadow-xl border-border bg-background/95 backdrop-blur-md">
                  <DropdownMenuLabel className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Navegación
                  </DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => navigate("/eventos")} className="rounded-xl gap-2 focus:bg-primary/10 focus:text-primary cursor-pointer">
                    <MapPin className="w-4 h-4" />
                    <span>Mapa de eventos</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/dashboard")} className="rounded-xl gap-2 focus:bg-primary/10 focus:text-primary cursor-pointer">
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Mi Dashboard</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/ranking")} className="rounded-xl gap-2 focus:bg-primary/10 focus:text-primary cursor-pointer">
                    <Trophy className="w-4 h-4" />
                    <span>Ranking Tinkuy</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/historial")} className="rounded-xl gap-2 focus:bg-primary/10 focus:text-primary cursor-pointer">
                    <History className="w-4 h-4" />
                    <span>Mi Historial</span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator className="my-2 bg-border/50" />
                  
                  <DropdownMenuLabel className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Ajustes
                  </DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => navigate("/profile")} className="rounded-xl gap-2 focus:bg-primary/10 focus:text-primary cursor-pointer">
                    <UserRound className="w-4 h-4" />
                    <span>Mi Perfil</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/notificaciones")} className="rounded-xl gap-2 focus:bg-primary/10 focus:text-primary cursor-pointer">
                    <Bell className="w-4 h-4" />
                    <span>Notificaciones</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSignOut} className="rounded-xl gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer">
                    <LogOut className="w-4 h-4" />
                    <span>Cerrar sesión</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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

          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <button className="text-foreground" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
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
