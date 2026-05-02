import { ReactNode } from "react";
import { Loader2 } from "lucide-react";

interface ButtonProps {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  fullWidth?: boolean;
}

const sizes = {
  sm: "h-8 px-3 text-xs rounded-md gap-1.5",
  md: "h-10 px-4 text-sm rounded-lg gap-2",
  lg: "h-12 px-5 text-sm rounded-lg gap-2",
};

const getStyle = (variant: string, disabled?: boolean): React.CSSProperties => {
  if (disabled) return { background: "#1A1A1A", color: "#555", border: "1px solid #222", cursor: "not-allowed" };
  switch (variant) {
    case "primary":
      return { background: "var(--accent)", color: "#fff", border: "none" };
    case "secondary":
      return { background: "var(--bg-elevated)", color: "var(--text-primary)", border: "1px solid var(--border)" };
    case "ghost":
      return { background: "transparent", color: "var(--text-secondary)", border: "none" };
    case "danger":
      return { background: "var(--danger)", color: "#fff", border: "none" };
    default:
      return {};
  }
};

const getHover = (variant: string): React.CSSProperties => {
  switch (variant) {
    case "primary": return { background: "var(--accent-hover)" };
    case "secondary": return { background: "#333" };
    case "ghost": return { background: "var(--bg-elevated)" };
    case "danger": return { background: "#E63329" };
    default: return {};
  }
};

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  children,
  className = "",
  disabled,
  onClick,
  type = "button",
  fullWidth = false,
}: ButtonProps) {
  const style = getStyle(variant, disabled || loading);

  return (
    <button
      disabled={disabled || loading}
      type={type}
      onClick={onClick}
      className={`inline-flex items-center justify-center font-medium transition-colors duration-100 cursor-pointer ${sizes[size]} ${fullWidth ? "w-full" : ""} ${className}`}
      style={style}
      onMouseEnter={(e) => {
        if (!disabled && !loading) Object.assign(e.currentTarget.style, getHover(variant));
      }}
      onMouseLeave={(e) => {
        if (!disabled && !loading) Object.assign(e.currentTarget.style, style);
      }}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon ? <span className="w-4 h-4 flex items-center justify-center">{icon}</span> : null}
      {children}
    </button>
  );
}
