import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, Lock, Sun, Moon, Monitor, RefreshCw, RotateCcw, Check, X } from "lucide-react";
import { useUIStore } from "@/stores/uiStore";

const Row = ({ icon: Icon, label, value, onClick }: { icon: any; label: string; value: string; onClick?: () => void }) => (
  <div onClick={onClick} className={`flex items-center justify-between h-11 px-3 ${onClick ? "cursor-pointer" : ""}`} style={{ borderBottom: "1px solid var(--border)" }}
    {...(onClick ? { onMouseEnter: (e: any) => e.currentTarget.style.background = "#1F1F1F", onMouseLeave: (e: any) => e.currentTarget.style.background = "transparent" } : {})}
  >
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4" style={{ color: "var(--text-tertiary)" }} />
      <span className="text-sm" style={{ color: "var(--text-primary)" }}>{label}</span>
    </div>
    <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>{value}</span>
  </div>
);

export default function Settings() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme, setLanguage, lock } = useUIStore();
  const [autoLock, setAutoLock] = useState(() => localStorage.getItem("autoLock") || "5");
  const [clipboardClear, setClipboardClear] = useState(() => localStorage.getItem("clipboardClear") || "30");
  const [showAutoLock, setShowAutoLock] = useState(false);
  const [showClipboard, setShowClipboard] = useState(false);
  const [checking, setChecking] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);

  useEffect(() => { localStorage.setItem("autoLock", autoLock); }, [autoLock]);
  useEffect(() => { localStorage.setItem("clipboardClear", clipboardClear); }, [clipboardClear]);

  // Auto-lock timer
  useEffect(() => {
    if (autoLock === "never") return;
    const minutes = parseInt(autoLock);
    if (isNaN(minutes)) return;
    let timeout: ReturnType<typeof setTimeout>;
    const resetTimer = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => lock(), minutes * 60 * 1000);
    };
    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    events.forEach((e) => document.addEventListener(e, resetTimer));
    resetTimer();
    return () => { clearTimeout(timeout); events.forEach((e) => document.removeEventListener(e, resetTimer)); };
  }, [autoLock, lock]);

  const langs = [{ code: "zh-CN", label: "简体中文" }, { code: "en", label: "English" }, { code: "zh-TW", label: "繁體中文" }];
  const themes = [{ v: "light", l: t("settings.theme"), icon: Sun }, { v: "dark", l: t("settings.darkMode"), icon: Moon }, { v: "system", l: t("common.system"), icon: Monitor }];
  const autoLockOpts = [{ v: "1", l: "1 min" }, { v: "5", l: "5 min" }, { v: "15", l: "15 min" }, { v: "30", l: "30 min" }, { v: "never", l: "Never" }];
  const clipboardOpts = [{ v: "10", l: "10s" }, { v: "30", l: "30s" }, { v: "60", l: "60s" }, { v: "never", l: "Never" }];

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
      <div className="px-3 h-9 flex items-center" style={{ borderBottom: "1px solid var(--border)" }}>
        <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>{title}</span>
      </div>
      {children}
    </div>
  );

  const handleCheckUpdate = () => {
    setChecking(true);
    setTimeout(() => {
      setChecking(false);
      setUpdateMessage(t("settings.version") + " v0.1.0 - Latest");
      setTimeout(() => setUpdateMessage(null), 3000);
    }, 1500);
  };

  const handleReset = () => {
    if (window.confirm(t("settings.resetConfirm"))) {
      localStorage.clear();
      setAutoLock("5");
      setClipboardClear("30");
      setTheme("system");
      setLanguage("zh-CN");
      i18n.changeLanguage("zh-CN");
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-md mx-auto space-y-3">
      <h1 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{t("settings.title")}</h1>

      <Section title={t("settings.language")}>
        <div className="flex gap-1 p-2">
          {langs.map((l) => (
            <button key={l.code} onClick={() => { setLanguage(l.code); i18n.changeLanguage(l.code); localStorage.setItem("language", l.code); }}
              className="flex-1 h-9 rounded-md text-xs font-medium cursor-pointer transition-colors"
              style={{ background: i18n.language === l.code ? "var(--bg-elevated)" : "transparent", color: i18n.language === l.code ? "var(--text-primary)" : "var(--text-tertiary)", border: i18n.language === l.code ? "1px solid #444" : "1px solid transparent" }}
            >{l.label}</button>
          ))}
        </div>
      </Section>

      <Section title={t("settings.theme")}>
        <div className="flex gap-1 p-2">
          {themes.map((tp) => {
            const Icon = tp.icon;
            return (
              <button key={tp.v} onClick={() => setTheme(tp.v as any)}
                className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-md text-xs font-medium cursor-pointer transition-colors"
                style={{ background: theme === tp.v ? "var(--bg-elevated)" : "transparent", color: theme === tp.v ? "var(--text-primary)" : "var(--text-tertiary)", border: theme === tp.v ? "1px solid #444" : "1px solid transparent" }}
              ><Icon className="w-3.5 h-3.5" />{tp.l}</button>
            );
          })}
        </div>
      </Section>

      <Section title={t("settings.security")}>
        <Row icon={Lock} label={t("settings.autoLock")} value={autoLockOpts.find((o) => o.v === autoLock)?.l || "5 min"} onClick={() => setShowAutoLock(!showAutoLock)} />
        {showAutoLock && (
          <div className="flex gap-1 px-2 pb-2">
            {autoLockOpts.map((o) => (
              <button key={o.v} onClick={() => { setAutoLock(o.v); setShowAutoLock(false); }}
                className="flex-1 h-8 rounded-md text-xs cursor-pointer transition-colors"
                style={{ background: autoLock === o.v ? "var(--bg-elevated)" : "transparent", color: autoLock === o.v ? "var(--text-primary)" : "var(--text-tertiary)", border: autoLock === o.v ? "1px solid #444" : "1px solid transparent" }}
              >{o.l}</button>
            ))}
          </div>
        )}
        <Row icon={Globe} label={t("settings.clipboardAutoClear")} value={clipboardOpts.find((o) => o.v === clipboardClear)?.l || "30s"} onClick={() => setShowClipboard(!showClipboard)} />
        {showClipboard && (
          <div className="flex gap-1 px-2 pb-2">
            {clipboardOpts.map((o) => (
              <button key={o.v} onClick={() => { setClipboardClear(o.v); setShowClipboard(false); }}
                className="flex-1 h-8 rounded-md text-xs cursor-pointer transition-colors"
                style={{ background: clipboardClear === o.v ? "var(--bg-elevated)" : "transparent", color: clipboardClear === o.v ? "var(--text-primary)" : "var(--text-tertiary)", border: clipboardClear === o.v ? "1px solid #444" : "1px solid transparent" }}
              >{o.l}</button>
            ))}
          </div>
        )}
      </Section>

      <Section title={t("settings.about")}>
        <div className="flex items-center justify-between h-11 px-3" style={{ borderBottom: "1px solid var(--border)" }}>
          <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{t("settings.version")}</span>
          <span className="text-sm" style={{ color: "var(--text-primary)" }}>v0.1.0</span>
        </div>
        <button onClick={handleCheckUpdate} disabled={checking} className="w-full flex items-center justify-between h-11 px-3 cursor-pointer transition-colors"
          style={{ borderBottom: "1px solid var(--border)", color: "var(--text-primary)" }}
          onMouseEnter={(e) => e.currentTarget.style.background = "#1F1F1F"}
          onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
        >
          <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{t("settings.checkUpdate")}</span>
          {checking ? <RefreshCw className="w-4 h-4 animate-spin" style={{ color: "var(--text-tertiary)" }} /> : <Check className="w-4 h-4" style={{ color: "var(--success)" }} />}
        </button>
        <button onClick={handleReset} className="w-full flex items-center justify-between h-11 px-3 cursor-pointer transition-colors"
          onMouseEnter={(e) => e.currentTarget.style.background = "#1F1F1F"}
          onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
        >
          <span className="text-sm" style={{ color: "var(--danger)" }}>{t("settings.resetSettings")}</span>
          <RotateCcw className="w-4 h-4" style={{ color: "var(--danger)" }} />
        </button>
      </Section>

      {/* Update notification */}
      <AnimatePresence>
        {updateMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-lg flex items-center gap-2 z-50"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--success)", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}
          >
            <Check className="w-4 h-4" style={{ color: "var(--success)" }} />
            <span className="text-sm" style={{ color: "var(--text-primary)" }}>{updateMessage}</span>
            <button onClick={() => setUpdateMessage(null)} className="ml-2 cursor-pointer" style={{ color: "var(--text-tertiary)" }}>
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
