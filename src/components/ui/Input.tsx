import { InputHTMLAttributes, ReactNode, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
  suffix?: ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, suffix, className = "", ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-tertiary)" }}>
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={`w-full h-10 rounded-lg text-sm outline-none transition-colors ${className}`}
            style={{
              background: "var(--bg-elevated)",
              color: "var(--text-primary)",
              border: error ? "1px solid var(--danger)" : "1px solid var(--border)",
              paddingLeft: icon ? "36px" : "12px",
              paddingRight: suffix ? "36px" : "12px",
            }}
            onFocus={(e) => {
              if (!error) e.currentTarget.style.borderColor = "#444";
            }}
            onBlur={(e) => {
              if (!error) e.currentTarget.style.borderColor = "var(--border)";
            }}
            {...props}
          />
          {suffix && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-tertiary)" }}>
              {suffix}
            </div>
          )}
        </div>
        {error && <p className="text-xs" style={{ color: "var(--danger)" }}>{error}</p>}
        {hint && !error && <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>{hint}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
