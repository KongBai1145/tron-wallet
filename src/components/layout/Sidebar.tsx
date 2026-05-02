import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Wallet,
  Send,
  Download,
  History,
  Shield,
  Image,
  Globe,
  Book,
  Lock,
  ChevronLeft,
  ChevronRight,
  Zap,
  Cpu,
  Vote,
  Settings,
} from "lucide-react";
import { useUIStore } from "@/stores/uiStore";

const navItems = [
  { path: "/", icon: LayoutDashboard, labelKey: "dashboard.title" },
  { path: "/wallet", icon: Wallet, labelKey: "wallet.create" },
  { path: "/send", icon: Send, labelKey: "send.title" },
  { path: "/receive", icon: Download, labelKey: "receive.title" },
  { path: "/history", icon: History, labelKey: "history.title" },
  { divider: true },
  { path: "/resources", icon: Cpu, labelKey: "resource.title" },
  { path: "/voting", icon: Vote, labelKey: "voting.title" },
  { path: "/multisig", icon: Shield, labelKey: "multisig.title" },
  { path: "/nft", icon: Image, labelKey: "nft.title" },
  { path: "/dapp", icon: Globe, labelKey: "dapp.title" },
  { path: "/address-book", icon: Book, labelKey: "addressBook.title" },
  { divider: true },
  { path: "/settings", icon: Settings, labelKey: "settings.title" },
];

export default function Sidebar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { sidebarCollapsed, toggleSidebar, lock } = useUIStore();

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarCollapsed ? 64 : 220 }}
      transition={{ duration: 0.15 }}
      className="flex flex-col h-full shrink-0"
      style={{ background: "#111111", borderRight: "1px solid var(--border)" }}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-4 h-14">
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2"
            >
              <div
                className="w-7 h-7 rounded-md flex items-center justify-center"
                style={{ background: "var(--accent)" }}
              >
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                TRON Wallet
              </span>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-md cursor-pointer"
          style={{ color: "var(--text-tertiary)" }}
        >
          {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 overflow-y-auto">
        <ul className="px-2 space-y-0.5">
          {navItems.map((item, index) => {
            if ("divider" in item && item.divider) {
              return <li key={`div-${index}`} className="my-2 mx-2 h-px" style={{ background: "var(--border)" }} />;
            }
            if (!("path" in item)) return null;

            const Icon = item.icon!;
            const isActive = location.pathname === item.path;

            return (
              <li key={item.path}>
                <button
                  onClick={() => navigate(item.path!)}
                  className="w-full flex items-center gap-3 px-3 h-10 rounded-lg text-sm cursor-pointer transition-colors duration-100"
                  style={{
                    background: isActive ? "var(--bg-elevated)" : "transparent",
                    color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                    fontWeight: isActive ? 600 : 400,
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = "#1F1F1F";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = "transparent";
                  }}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <AnimatePresence>
                    {!sidebarCollapsed && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="whitespace-nowrap"
                      >
                        {t(item.labelKey!)}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Lock */}
      <div className="p-2 border-t" style={{ borderColor: "var(--border)" }}>
        <button
          onClick={lock}
          className="w-full flex items-center gap-3 px-3 h-10 rounded-lg text-sm cursor-pointer transition-colors"
          style={{ color: "var(--text-tertiary)" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#1F1F1F";
            e.currentTarget.style.color = "var(--danger)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--text-tertiary)";
          }}
        >
          <Lock className="w-4 h-4 shrink-0" />
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {t("common.lockWallet")}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.aside>
  );
}
