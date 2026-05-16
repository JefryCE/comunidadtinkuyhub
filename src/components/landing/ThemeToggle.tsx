import { motion } from "framer-motion";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      className="relative w-10 h-10 rounded-xl bg-muted/60 hover:bg-muted border border-border/50 flex items-center justify-center transition-colors duration-300 overflow-hidden"
    >
      <motion.div
        key={theme}
        initial={{ y: isDark ? 20 : -20, opacity: 0, rotate: isDark ? 90 : -90 }}
        animate={{ y: 0, opacity: 1, rotate: 0 }}
        exit={{ y: isDark ? -20 : 20, opacity: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        {isDark ? (
          <Moon className="w-[18px] h-[18px] text-indigo-400" />
        ) : (
          <Sun className="w-[18px] h-[18px] text-amber-500" />
        )}
      </motion.div>
    </button>
  );
};

export default ThemeToggle;
