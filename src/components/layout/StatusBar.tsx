import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Wifi, WifiOff, Clock, HardDrive } from "lucide-react";
import { useWalletStore } from "@/stores/walletStore";
import { invoke } from "@tauri-apps/api/core";

export default function StatusBar() {
  const { t } = useTranslation();
  const { currentWallet } = useWalletStore();
  const [blockNumber, setBlockNumber] = useState<number>(0);
  const [connected, setConnected] = useState(true);
  const [lastSync, setLastSync] = useState<Date>(new Date());

  useEffect(() => {
    const fetchBlock = async () => {
      try {
        const network = currentWallet?.network || "mainnet";
        const result = await invoke<{ block_number: number }>("get_now_block", { network });
        setBlockNumber(result.block_number);
        setConnected(true);
        setLastSync(new Date());
      } catch {
        setConnected(false);
      }
    };
    fetchBlock();
    const interval = setInterval(fetchBlock, 15000);
    return () => clearInterval(interval);
  }, [currentWallet?.network]);

  const formatTime = (d: Date) => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diff < 5) return t("history.justNow");
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    return `${Math.floor(diff / 3600)}h`;
  };

  return (
    <footer
      className="flex items-center justify-between px-6 h-8 text-xs shrink-0"
      style={{ background: "var(--bg-surface)", borderTop: "1px solid var(--border)", color: "var(--text-tertiary)" }}
    >
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1">
          {connected
            ? <Wifi className="w-3 h-3" style={{ color: "var(--success)" }} />
            : <WifiOff className="w-3 h-3" style={{ color: "var(--danger)" }} />}
          {connected ? "Connected" : "Disconnected"}
        </span>
        <span className="flex items-center gap-1">
          <HardDrive className="w-3 h-3" />
          Block: {blockNumber > 0 ? blockNumber.toLocaleString() : "..."}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Synced: {formatTime(lastSync)}
        </span>
        <span>v0.1.0</span>
      </div>
    </footer>
  );
}
