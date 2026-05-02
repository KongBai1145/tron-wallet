import { ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Eye, EyeOff } from "lucide-react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import StatusBar from "./StatusBar";
import { useUIStore } from "@/stores/uiStore";
import Button from "@/components/ui/Button";

interface AppLayoutProps {
  children: ReactNode;
}

function LockScreen() {
  const { t } = useTranslation();
  const { unlock } = useUIStore();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleUnlock = () => {
    if (!password.trim()) return;
    // Simple unlock - password field is just a gate, actual wallet encryption is per-operation
    unlock();
    setPassword("");
    setError("");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "var(--bg-base)" }}
    >
      <div className="w-80 space-y-6 text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
          <Lock className="w-7 h-7" style={{ color: "var(--text-secondary)" }} />
        </div>
        <div>
          <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>TRON Wallet</h2>
          <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>{t("common.lockWallet")}</p>
        </div>
        <div className="space-y-3">
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
              placeholder={t("app.enterPassword")}
              className="w-full h-11 px-3 pr-10 rounded-lg text-sm focus:outline-none"
              style={{ background: "var(--bg-elevated)", border: error ? "1px solid var(--danger)" : "1px solid var(--border)", color: "var(--text-primary)" }}
              autoFocus
            />
            <button
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
              style={{ color: "var(--text-tertiary)" }}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {error && <p className="text-xs" style={{ color: "var(--danger)" }}>{error}</p>}
          <Button fullWidth onClick={handleUnlock} disabled={!password.trim()}>
            {t("common.confirm")}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { locked } = useUIStore();

  return (
    <>
      <AnimatePresence>{locked && <LockScreen />}</AnimatePresence>
      <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg-base)" }}>
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <Header />
          <main className="flex-1 overflow-auto p-6">{children}</main>
          <StatusBar />
        </div>
      </div>
    </>
  );
}
