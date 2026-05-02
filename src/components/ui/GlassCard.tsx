import { ReactNode } from "react";
import { motion } from "framer-motion";

interface GlassCardProps {
  children: ReactNode;
  padding?: "sm" | "md" | "lg" | "none";
  hoverable?: boolean;
  className?: string;
  onClick?: () => void;
}

const paddingMap = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-5",
};

export default function GlassCard({
  children,
  padding = "md",
  hoverable = false,
  className = "",
  onClick,
}: GlassCardProps) {
  return (
    <motion.div
      whileTap={onClick ? { scale: 0.99 } : undefined}
      onClick={onClick}
      className={`${paddingMap[padding]} rounded-xl cursor-pointer transition-colors duration-100 ${className}`}
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
      }}
      onMouseEnter={(e) => {
        if (hoverable || onClick) e.currentTarget.style.background = "#1F1F1F";
      }}
      onMouseLeave={(e) => {
        if (hoverable || onClick) e.currentTarget.style.background = "var(--bg-surface)";
      }}
    >
      {children}
    </motion.div>
  );
}
