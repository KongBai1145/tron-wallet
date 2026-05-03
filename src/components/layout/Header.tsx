import { useTranslation } from "react-i18next";
import { Search, Bell, Copy, Check, X, Minus, Square } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useUIStore } from "@/stores/uiStore";
import { useWalletStore } from "@/stores/walletStore";
import { useNotificationStore } from "@/stores/notificationStore";

function isTauriRuntime() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

async function withCurrentWindow(action: (win: Awaited<ReturnType<typeof import("@tauri-apps/api/window")["getCurrentWindow"]>>) => Promise<void>) {
  if (!isTauriRuntime()) return;
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await action(getCurrentWindow());
  } catch (error) {
    console.error("Window control failed:", error);
  }
}

async function minimizeWindow() {
  await withCurrentWindow((win) => win.minimize());
}

async function toggleMaximizeWindow() {
  await withCurrentWindow(async (win) => {
    const maximized = await win.isMaximized();
    if (maximized) {
      await win.unmaximize();
    } else {
      await win.maximize();
    }
  });
}

async function closeWindow() {
  await withCurrentWindow((win) => win.close());
}

export default function Header() {
  const { t } = useTranslation();
  const { toggleCommandPalette } = useUIStore();
  const { currentWallet } = useWalletStore();
  const { notifications, unreadCount, markAllAsRead, removeNotification } = useNotificationStore();
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
    } catch (error) {
      console.error("Failed to copy address:", error);
    }
  };

  return (
    <header
      className="flex items-center justify-between px-6 h-14 shrink-0 select-none"
      style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--border)" }}
    >
      {/* Search */}
      <div className="flex-1 max-w-xs" onMouseDown={(e) => e.stopPropagation()}>
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

      {/* Dedicated draggable strip: keep interactive controls outside this region */}
      <div
        data-tauri-drag-region
        className="flex-1 h-full mx-4"
        title="Drag window"
        onDoubleClick={toggleMaximizeWindow}
      />

      {/* Right */}
      <div className="flex items-center gap-3" onMouseDown={(e) => e.stopPropagation()}>
        {/* Network */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: "rgba(0,214,143,0.1)" }}>
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--success)" }} />
          <span className="text-xs font-medium" style={{ color: "var(--success)" }}>
            {currentWallet?.network || "Mainnet"}
          </span>
        </div>

        {/* Bell */}
        <div className="relative" ref={notifRef}>
          <button onClick={() => {
            setShowNotif(!showNotif);
            if (!showNotif) markAllAsRead();
          }} className="relative p-2 rounded-lg cursor-pointer" style={{ color: "var(--text-secondary)" }}>
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-semibold flex items-center justify-center"
                style={{ background: "var(--danger)", color: "white" }}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          {showNotif && (
            <div className="absolute right-0 top-full mt-2 w-80 rounded-xl overflow-hidden z-50" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
              <div className="flex items-center justify-between px-4 h-10" style={{ borderBottom: "1px solid var(--border)" }}>
                <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{t("notification.title")}</span>
                <div className="flex items-center gap-2">
                  {notifications.length > 0 && (
                    <button onClick={markAllAsRead} className="text-[11px] cursor-pointer" style={{ color: "var(--accent)" }}>
                      {t("common.markAllRead", "Mark all read")}
                    </button>
                  )}
                  <button onClick={() => setShowNotif(false)} className="cursor-pointer" style={{ color: "var(--text-tertiary)" }}><X className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              {notifications.length > 0 ? (
                <div className="max-h-96 overflow-y-auto">
                  {notifications.map((notification) => (
                    <div key={notification.id} className="px-4 py-3" style={{ borderBottom: "1px solid var(--border)", background: notification.read ? "transparent" : "rgba(0,214,143,0.04)" }}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{notification.title}</p>
                          {notification.message && (
                            <p className="text-xs mt-1 break-words" style={{ color: "var(--text-tertiary)" }}>{notification.message}</p>
                          )}
                          <p className="text-[10px] mt-1" style={{ color: "var(--text-tertiary)" }}>
                            {new Date(notification.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <button onClick={() => removeNotification(notification.id)} className="cursor-pointer shrink-0" style={{ color: "var(--text-tertiary)" }}>
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-6 text-center">
                  <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>{t("notification.noNotifications")}</p>
                </div>
              )}
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
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={minimizeWindow}
            className="w-10 h-14 flex items-center justify-center cursor-pointer transition-colors"
            style={{ color: "var(--text-tertiary)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-elevated)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            title="Minimize"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={toggleMaximizeWindow}
            className="w-10 h-14 flex items-center justify-center cursor-pointer transition-colors"
            style={{ color: "var(--text-tertiary)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-elevated)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            title="Maximize / Restore"
          >
            <Square className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={closeWindow}
            className="w-10 h-14 flex items-center justify-center cursor-pointer transition-colors"
            style={{ color: "var(--text-tertiary)" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#e81123"; e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-tertiary)"; }}
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
