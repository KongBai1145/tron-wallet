import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownLeft, ExternalLink, Filter, RefreshCw, X } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Tabs from "@/components/ui/Tabs";
import EmptyState from "@/components/ui/EmptyState";
import { useWalletStore } from "@/stores/walletStore";
import { useTransactionStore } from "@/stores/transactionStore";

function formatAmount(sunAmount: number, decimals: number = 6): string {
  const amount = sunAmount / Math.pow(10, decimals);
  return amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function useTimeAgo() {
  const { t } = useTranslation();
  return (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return t("history.justNow");
    if (minutes < 60) return t("history.minutesAgo", { count: minutes });
    if (hours < 24) return t("history.hoursAgo", { count: hours });
    if (days < 7) return t("history.daysAgo", { count: days });
    return new Date(timestamp).toLocaleDateString();
  };
}

type TimeFilter = "all" | "24h" | "7d" | "30d";

export default function History() {
  const { t } = useTranslation();
  const { currentWallet } = useWalletStore();
  const { transactions, fetchTransactions, loadMore, isLoading, hasMore } = useTransactionStore();
  const [tab, setTab] = useState("all");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [showFilter, setShowFilter] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const timeAgo = useTimeAgo();

  useEffect(() => {
    if (currentWallet?.address) {
      fetchTransactions(currentWallet.address, currentWallet.network);
    }
  }, [currentWallet?.address]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setShowFilter(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const tabs = [
    { id: "all", label: t("history.all") },
    { id: "in", label: t("history.received") },
    { id: "out", label: t("history.sent") },
  ];

  const timeFilterOpts: { v: TimeFilter; l: string }[] = [
    { v: "all", l: t("history.all") },
    { v: "24h", l: "24h" },
    { v: "7d", l: "7d" },
    { v: "30d", l: "30d" },
  ];

  const now = Date.now();
  const timeCutoff: Record<TimeFilter, number> = {
    all: 0,
    "24h": now - 86400000,
    "7d": now - 7 * 86400000,
    "30d": now - 30 * 86400000,
  };

  const filtered = transactions.filter((tx) => {
    const isOut = tx.owner_address?.toLowerCase() === currentWallet?.address.toLowerCase();
    const dirMatch = tab === "all" || (tab === "out" ? isOut : !isOut);
    const timeMatch = timeFilter === "all" || tx.block_timestamp >= timeCutoff[timeFilter];
    return dirMatch && timeMatch;
  });

  const handleRefresh = () => {
    if (currentWallet?.address) {
      fetchTransactions(currentWallet.address, currentWallet.network);
    }
  };

  const activeFilterCount = (tab !== "all" ? 1 : 0) + (timeFilter !== "all" ? 1 : 0);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-lg mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{t("history.title")}</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs cursor-pointer"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setShowFilter(!showFilter)}
              className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs cursor-pointer"
              style={{
                background: activeFilterCount > 0 ? "rgba(0,214,143,0.1)" : "var(--bg-surface)",
                border: `1px solid ${activeFilterCount > 0 ? "var(--success)" : "var(--border)"}`,
                color: activeFilterCount > 0 ? "var(--success)" : "var(--text-secondary)",
              }}
            >
              <Filter className="w-3.5 h-3.5" />{t("common.filter")}{activeFilterCount > 0 && ` (${activeFilterCount})`}
            </button>
            {showFilter && (
              <div className="absolute right-0 top-full mt-1 w-48 rounded-lg overflow-hidden z-20" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
                <div className="px-3 h-8 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
                  <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Time Range</span>
                  {timeFilter !== "all" && (
                    <button onClick={() => setTimeFilter("all")} className="cursor-pointer" style={{ color: "var(--text-tertiary)" }}><X className="w-3 h-3" /></button>
                  )}
                </div>
                {timeFilterOpts.map((opt) => (
                  <button
                    key={opt.v}
                    onClick={() => { setTimeFilter(opt.v); setShowFilter(false); }}
                    className="w-full flex items-center justify-between px-3 h-8 cursor-pointer transition-colors text-xs"
                    style={{ color: timeFilter === opt.v ? "var(--success)" : "var(--text-primary)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-elevated)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    {opt.l}
                    {timeFilter === opt.v && <span>&#10003;</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Tabs tabs={tabs} onChange={setTab}>
        <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
          {filtered.length === 0 ? (
            <EmptyState
              icon={<ArrowUpRight className="w-6 h-6" />}
              title={t("dashboard.noTransactions")}
              description={isLoading ? t("common.loading") : t("history.noTxsForWallet")}
            />
          ) : (<>
            {filtered.map((tx) => {
              const isOut = tx.owner_address?.toLowerCase() === currentWallet?.address.toLowerCase();
              const counterparty = isOut ? tx.to_address : tx.owner_address;
              const displayAddr = counterparty
                ? `${counterparty.slice(0, 10)}...`
                : t("common.contract");
              const amount = tx.amount ? formatAmount(tx.amount, 6) : "-";

              return (
                <div
                  key={tx.tx_id}
                  className="flex items-center justify-between px-4 h-14 cursor-pointer transition-colors"
                  style={{ borderBottom: "1px solid var(--border)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#1F1F1F")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  onClick={() => {
                    const explorerUrl = `https://tronscan.org/#/transaction/${tx.tx_id}`;
                    window.open(explorerUrl, "_blank");
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: isOut ? "rgba(255,59,48,0.1)" : "rgba(0,214,143,0.1)" }}>
                      {isOut ? <ArrowUpRight className="w-4 h-4" style={{ color: "var(--danger)" }} /> : <ArrowDownLeft className="w-4 h-4" style={{ color: "var(--success)" }} />}
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                        {isOut ? t("history.sent") : t("history.received")}
                      </p>
                      <p className="text-xs font-mono" style={{ color: "var(--text-tertiary)" }}>{displayAddr}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={tx.confirmed ? "success" : "warning"}>
                      {tx.confirmed ? t("common.confirmed") : t("common.pending")}
                    </Badge>
                    <div className="text-right">
                      <p className="text-sm font-medium" style={{ color: isOut ? "var(--text-primary)" : "var(--success)", fontVariantNumeric: "tabular-nums" }}>
                        {isOut ? "-" : "+"}{amount} TRX
                      </p>
                      <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                        {timeAgo(tx.block_timestamp)}
                      </p>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); window.open(`https://tronscan.org/#/transaction/${tx.tx_id}`, "_blank"); }} className="p-1.5 rounded cursor-pointer" style={{ color: "var(--text-tertiary)" }}>
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
            {hasMore && (
              <div className="p-3 text-center">
                <button
                  onClick={() => loadMore(currentWallet!.address, currentWallet!.network)}
                  disabled={isLoading}
                  className="px-4 h-8 rounded-lg text-xs cursor-pointer transition-colors"
                  style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
                >
                  {isLoading ? t("common.loading") : "Load More"}
                </button>
              </div>
            )}
          </>)}
        </div>
      </Tabs>
    </motion.div>
  );
}
