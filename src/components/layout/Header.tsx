import { useTranslation } from "react-i18next";
import { Search, Bell, Copy, Check, X, Minus, Square } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useUIStore } from "@/stores/uiStore";
import { useWalletStore } from "@/stores/walletStore";

// Window controls for Tauri
async function minimizeWindow() {
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().minimize();
  } catch {}
}

async function toggleMaximize() {
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().toggleMaximize();
  } catch {}
}

async function closeWindow() {
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().close();
  } catch {}
}

export default function Header() {
  const { t } = useTranslation();
  const { toggleCommandPalette } = useUIStore();
  const { currentWallet } = useWalletStore();
  const [copied, setCopied] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotif(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const copyAddress = async () => {
    if (!currentWallet?.address) return;
    try {
      await navigator.clipboard.writeText(currentWallet.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <header
      data-tauri-drag-region
      className="flex items-center justify-between px-6 h-14 shrink-0"
      style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--border)" }}
    >
      {/* Search */}
      <div className="flex-1 max-w-xs">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-tertiary)" }} />
          <input
            type="text"
            placeholder={t("common.search")}
            className="w-full pl-9 pr-4 h-9 rounded-lg text-sm outline-none cursor-pointer"
            style={{ background: "var(--bg-elevated)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
            onClick={toggleCommandPalette}
            readOnly
          />
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        {/* Network */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: "rgba(0,214,143,0.1)" }}>
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--success)" }} />
          <span className="text-xs font-medium" style={{ color: "var(--success)" }}>
            {currentWallet?.network || "Mainnet"}
          </span>
        </div>

        {/* Bell */}
        <div className="relative" ref={notifRef}>
          <button onClick={() => setShowNotif(!showNotif)} className="relative p-2 rounded-lg cursor-pointer" style={{ color: "var(--text-secondary)" }}>
            <Bell className="w-4 h-4" />
          </button>
          {showNotif && (
            <div className="absolute right-0 top-full mt-2 w-72 rounded-xl overflow-hidden z-50" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
              <div className="flex items-center justify-between px-4 h-10" style={{ borderBottom: "1px solid var(--border)" }}>
                <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{t("notification.title")}</span>
                <button onClick={() => setShowNotif(false)} className="cursor-pointer" style={{ color: "var(--text-tertiary)" }}><X className="w-3.5 h-3.5" /></button>
              </div>
              <div className="px-4 py-6 text-center">
                <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>{t("notification.noNotifications")}</p>
              </div>
            </div>
          )}
        </div>

        {/* Wallet */}
        {currentWallet && (
          <div className="flex items-center gap-3 pl-3" style={{ borderLeft: "1px solid var(--border)" }}>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold"
              style={{ background: "var(--bg-elevated)", color: "var(--text-primary)" }}
            >
              {currentWallet.name[0].toUpperCase()}
            </div>
            <div className="text-right">
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{currentWallet.name}</p>
              <button
                onClick={copyAddress}
                className="flex items-center gap-1 text-xs font-mono cursor-pointer"
                style={{ color: "var(--text-tertiary)" }}
              >
                {currentWallet.address.slice(0, 6)}...{currentWallet.address.slice(-4)}
                {copied ? <Check className="w-3 h-3" style={{ color: "var(--success)" }} /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>
        )}

        {/* Window Controls */}
        <div
          className="flex items-center ml-3"
          style={{ borderLeft: "1px solid var(--border)" }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            onClick={minimizeWindow}
            className="w-10 h-14 flex items-center justify-center cursor-pointer transition-colors"
            style={{ color: "var(--text-tertiary)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-elevated)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={toggleMaximize}
            className="w-10 h-14 flex items-center justify-center cursor-pointer transition-colors"
            style={{ color: "var(--text-tertiary)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-elevated)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <Square className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={closeWindow}
            className="w-10 h-14 flex items-center justify-center cursor-pointer transition-colors"
            style={{ color: "var(--text-tertiary)" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#e81123"; e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-tertiary)"; }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
