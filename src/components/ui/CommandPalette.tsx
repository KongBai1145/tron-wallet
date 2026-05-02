import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Send, Download, Shield, Globe, Settings, Wallet, History, Image } from "lucide-react";
import { useUIStore } from "@/stores/uiStore";

interface Command { id: string; label: string; icon: React.ReactNode; action: () => void; category: string; }

export default function CommandPalette() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { commandPaletteOpen, setCommandPaletteOpen } = useUIStore();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: Command[] = [
    { id: "send", label: t("send.title") + " TRX", icon: <Send className="w-4 h-4" />, action: () => { navigate("/send"); setCommandPaletteOpen(false); }, category: t("common.send") },
    { id: "receive", label: t("receive.title"), icon: <Download className="w-4 h-4" />, action: () => { navigate("/receive"); setCommandPaletteOpen(false); }, category: t("common.receive") },
    { id: "wallet", label: t("wallet.create"), icon: <Wallet className="w-4 h-4" />, action: () => { navigate("/wallet"); setCommandPaletteOpen(false); }, category: t("common.wallet") },
    { id: "history", label: t("history.title"), icon: <History className="w-4 h-4" />, action: () => { navigate("/history"); setCommandPaletteOpen(false); }, category: t("common.transactions") },
    { id: "multisig", label: t("multisig.title"), icon: <Shield className="w-4 h-4" />, action: () => { navigate("/multisig"); setCommandPaletteOpen(false); }, category: t("multisig.title") },
    { id: "nft", label: t("nft.title"), icon: <Image className="w-4 h-4" />, action: () => { navigate("/nft"); setCommandPaletteOpen(false); }, category: t("nft.title") },
    { id: "dapp", label: t("dapp.title"), icon: <Globe className="w-4 h-4" />, action: () => { navigate("/dapp"); setCommandPaletteOpen(false); }, category: t("dapp.title") },
    { id: "settings", label: t("settings.title"), icon: <Settings className="w-4 h-4" />, action: () => { navigate("/settings"); setCommandPaletteOpen(false); }, category: t("settings.title") },
  ];

  const filtered = commands.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => { if (commandPaletteOpen && inputRef.current) inputRef.current.focus(); }, [commandPaletteOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setCommandPaletteOpen(!commandPaletteOpen); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  return (
    <AnimatePresence>
      {commandPaletteOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setCommandPaletteOpen(false)} className="absolute inset-0" style={{ background: "rgba(0,0,0,0.6)" }} />
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="relative w-full max-w-md rounded-xl overflow-hidden"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-center gap-3 px-4 h-12" style={{ borderBottom: "1px solid var(--border)" }}>
              <Search className="w-4 h-4" style={{ color: "var(--text-tertiary)" }} />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("common.search")}
                className="flex-1 bg-transparent outline-none text-sm"
                style={{ color: "var(--text-primary)" }}
              />
            </div>
            <div className="max-h-72 overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm" style={{ color: "var(--text-tertiary)" }}>No results</div>
              ) : (
                filtered.map((cmd) => (
                  <button
                    key={cmd.id}
                    onClick={cmd.action}
                    className="w-full flex items-center gap-3 px-4 h-11 cursor-pointer transition-colors"
                    style={{ color: "var(--text-primary)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-elevated)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <span className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: "var(--bg-elevated)", color: "var(--text-tertiary)" }}>
                      {cmd.icon}
                    </span>
                    <span className="text-sm">{cmd.label}</span>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
