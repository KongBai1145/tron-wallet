import { ReactNode } from "react";

interface BadgeProps {
  variant?: "default" | "success" | "warning" | "danger";
  children: ReactNode;
  className?: string;
}

const styles: Record<string, React.CSSProperties> = {
  default: { background: "var(--bg-elevated)", color: "var(--text-secondary)" },
  success: { background: "rgba(0,214,143,0.12)", color: "var(--success)" },
  warning: { background: "rgba(255,149,0,0.12)", color: "var(--warning)" },
  danger: { background: "rgba(255,59,48,0.12)", color: "var(--danger)" },
};

export default function Badge({ variant = "default", children, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${className}`}
      style={styles[variant]}
    >
      {children}
    </span>
  );
}
