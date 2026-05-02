import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Copy, Check } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import Button from "@/components/ui/Button";
import { useWalletStore } from "@/stores/walletStore";

export default function Receive() {
  const { t } = useTranslation();
  const { currentWallet } = useWalletStore();
  const [copied, setCopied] = useState(false);

  const copyAddr = async () => {
    if (!currentWallet?.address) return;
    try { await navigator.clipboard.writeText(currentWallet.address); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-md mx-auto space-y-4">
      <h1 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{t("receive.title")}</h1>
      <div className="rounded-xl p-5 space-y-5" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        <div className="w-48 h-48 rounded-xl flex items-center justify-center mx-auto p-3" style={{ background: "#fff" }}>
          {currentWallet?.address ? (
            <QRCodeSVG value={currentWallet.address} size={168} level="M" bgColor="#ffffff" fgColor="#000000" />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ color: "#999" }}>No wallet</div>
          )}
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-center" style={{ color: "var(--text-secondary)" }}>{t("receive.yourAddress")}</label>
          <div className="p-3 rounded-lg" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
            <p className="text-xs font-mono text-center break-all leading-relaxed" style={{ color: "var(--text-primary)" }}>{currentWallet?.address || "No wallet"}</p>
          </div>
        </div>
        <Button className="w-full" onClick={copyAddr}>
          {copied ? <><Check className="w-4 h-4" style={{ color: "var(--success)" }} />{t("receive.addressCopied")}</> : <><Copy className="w-4 h-4" />{t("receive.copyAddress")}</>}
        </Button>
        <div className="flex items-center justify-between h-10 px-3 rounded-lg" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{t("common.network")}</span>
          <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{currentWallet?.network || "Mainnet"}</span>
        </div>
      </div>
    </motion.div>
  );
}
