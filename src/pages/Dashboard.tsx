import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownLeft, Wallet, Copy, Check, Eye, EyeOff, Send, Download, ArrowLeftRight } from "lucide-react";
import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import { useWalletStore } from "@/stores/walletStore";
import { useAccountStore } from "@/stores/accountStore";
import { usePriceStore } from "@/stores/priceStore";
import { useTransactionStore } from "@/stores/transactionStore";
import { useNavigate } from "react-router-dom";

// Known TRC-20 token metadata
const KNOWN_TOKENS: Record<string, { symbol: string; name: string; decimals: number }> = {
  "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t": { symbol: "USDT", name: "Tether USD", decimals: 6 },
  "TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8": { symbol: "USDC", name: "USD Coin", decimals: 6 },
  "TCFLL5dx5ZJdKnWuesXxi1VPwjLVmWZZy9": { symbol: "JST", name: "JUST", decimals: 18 },
  "TLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7": { symbol: "WIN", name: "WINkLink", decimals: 6 },
  "TKfjV9RNKJJCqPvB2Mb4r5G5c4hYN8UG2S": { symbol: "BTT", name: "BitTorrent", decimals: 18 },
};

function formatAmount(sunAmount: number, decimals: number = 6): string {
  const amount = sunAmount / Math.pow(10, decimals);
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(2)}M`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(2)}K`;
  return amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatUSD(amount: number): string {
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function Dashboard() {
  const { t } = useTranslation();
  const { currentWallet } = useWalletStore();
  const { accountInfo, fetchAccountInfo, isLoading: accountLoading } = useAccountStore();
  const { trxPrice, startPolling, stopPolling } = usePriceStore();
  const { transactions, fetchTransactions } = useTransactionStore();
  const navigate = useNavigate();
  const [hidden, setHidden] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<"tokens" | "txs">("tokens");
  const [tokenMeta, setTokenMeta] = useState<Record<string, { symbol: string; name: string; decimals: number }>>({});

  useEffect(() => {
    if (currentWallet?.address) {
      fetchAccountInfo(currentWallet.address, currentWallet.network);
      fetchTransactions(currentWallet.address, currentWallet.network);
    }
    startPolling();
    return () => stopPolling();
  }, [currentWallet?.address]);

  // Fetch metadata for unknown TRC-20 tokens
  useEffect(() => {
    const tokens = accountInfo?.trc20_tokens ?? [];
    const unknownAddrs = tokens
      .map((t) => t.contract_address)
      .filter((addr) => !KNOWN_TOKENS[addr] && !tokenMeta[addr]);

    if (unknownAddrs.length === 0) return;

    const network = currentWallet?.network || "mainnet";
    invoke<Array<{ contract_address: string; symbol: string; name: string; decimals: number }>>("get_trc20_token_info", {
      contractAddresses: unknownAddrs,
      network,
    }).then((infos) => {
      const meta: Record<string, { symbol: string; name: string; decimals: number }> = {};
      for (const info of infos) {
        if (info.symbol || info.name) {
          meta[info.contract_address] = {
            symbol: info.symbol || "UNKNOWN",
            name: info.name || info.contract_address.slice(0, 10) + "...",
            decimals: info.decimals,
          };
        }
      }
      if (Object.keys(meta).length > 0) {
        setTokenMeta((prev) => ({ ...prev, ...meta }));
      }
    }).catch(() => {});
  }, [accountInfo?.trc20_tokens]);

  const copyAddr = async () => {
    if (!currentWallet?.address) return;
    try { await navigator.clipboard.writeText(currentWallet.address); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };

  if (!currentWallet) {
    return (
      <EmptyState
        icon={<Wallet className="w-6 h-6" />}
        title={t("wallet.noWallets")}
        description={t("wallet.createOrImport")}
        action={<Button onClick={() => navigate("/wallet")}>{t("wallet.create")}</Button>}
      />
    );
  }

  const trxBalance = accountInfo?.trx_balance ?? 0;
  const priceUsd = trxPrice?.price_usd ?? 0;
  const priceChange = trxPrice?.price_change_24h ?? 0;
  const totalUsd = (trxBalance / 1e6) * priceUsd;

  // Build token list
  const tokens = [
    {
      symbol: "TRX",
      name: "TRON",
      balance: formatAmount(trxBalance, 6),
      rawBalance: trxBalance / 1e6,
      value: formatUSD(totalUsd),
      change: `${priceChange >= 0 ? "+" : ""}${priceChange.toFixed(2)}%`,
      up: priceChange >= 0,
    },
    ...(accountInfo?.trc20_tokens ?? []).map((token) => {
      const meta = KNOWN_TOKENS[token.contract_address] ?? tokenMeta[token.contract_address];
      const symbol = meta?.symbol ?? "UNKNOWN";
      const name = meta?.name ?? token.contract_address.slice(0, 10) + "...";
      const decimals = meta?.decimals ?? token.decimals;
      const bal = parseFloat(token.balance) / Math.pow(10, decimals);
      return {
        symbol,
        name,
        balance: bal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        rawBalance: bal,
        value: symbol === "USDT" || symbol === "USDC" ? formatUSD(bal) : "-",
        change: "",
        up: true,
      };
    }),
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-lg mx-auto space-y-4">
      {/* Balance Card */}
      <div className="rounded-xl p-5" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>{t("dashboard.totalAssets")}</span>
          <div className="flex items-center gap-2">
            {priceChange !== 0 && (
              <Badge variant={priceChange >= 0 ? "success" : "danger"}>
                {priceChange >= 0 ? "+" : ""}{priceChange.toFixed(2)}%
              </Badge>
            )}
            <button onClick={() => setHidden(!hidden)} className="cursor-pointer" style={{ color: "var(--text-tertiary)" }}>
              {hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div className="flex items-end gap-2 mb-0.5">
          <span className="text-3xl font-bold tracking-tight" style={{ color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>
            {hidden ? "****" : formatUSD(totalUsd)}
          </span>
        </div>
        <p className="text-xs mb-4" style={{ color: "var(--text-tertiary)" }}>
          {hidden ? "****" : `≈ ${formatAmount(trxBalance, 6)} TRX`}
        </p>

        {/* Address */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-mono px-2 py-1 rounded" style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}>
            {currentWallet.address.slice(0, 10)}...{currentWallet.address.slice(-8)}
          </span>
          <button onClick={copyAddr} className="cursor-pointer" style={{ color: "var(--text-tertiary)" }}>
            {copied ? <Check className="w-3.5 h-3.5" style={{ color: "var(--success)" }} /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-3 gap-2">
          <Button fullWidth onClick={() => navigate("/send")}><Send className="w-4 h-4" />{t("send.title")}</Button>
          <Button variant="secondary" fullWidth onClick={() => navigate("/receive")}><Download className="w-4 h-4" />{t("receive.title")}</Button>
          <Button variant="secondary" fullWidth onClick={() => navigate("/dapp")}><ArrowLeftRight className="w-4 h-4" />Swap</Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg" style={{ background: "var(--bg-surface)" }}>
        {(["tokens", "txs"] as const).map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="flex-1 h-9 rounded-md text-xs font-medium cursor-pointer transition-colors"
            style={{
              background: tab === key ? "var(--bg-elevated)" : "transparent",
              color: tab === key ? "var(--text-primary)" : "var(--text-tertiary)",
            }}
          >
            {key === "tokens" ? t("dashboard.assets") : t("dashboard.recentTransactions")}
          </button>
        ))}
      </div>

      {/* Token List */}
      {tab === "tokens" && (
        <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
          {tokens.map((token) => (
            <div
              key={token.symbol}
              className="flex items-center justify-between px-4 h-14 cursor-pointer transition-colors"
              style={{ borderBottom: "1px solid var(--border)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#1F1F1F")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}>
                  {token.symbol[0]}
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{token.symbol}</p>
                  <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>{token.name}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium" style={{ color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>
                  {hidden ? "****" : token.balance}
                </p>
                <div className="flex items-center justify-end gap-1.5">
                  <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>{hidden ? "****" : token.value}</span>
                  {token.change && (
                    <span className="text-xs font-medium flex items-center gap-0.5" style={{ color: token.up ? "var(--success)" : "var(--danger)" }}>
                      {token.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {token.change}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
          {tokens.length === 0 && !accountLoading && (
            <div className="px-4 py-8 text-center">
              <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>{t("app.noTokens")}</p>
            </div>
          )}
        </div>
      )}

      {/* Transaction List */}
      {tab === "txs" && (
        <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
          {transactions.map((tx) => {
            const isOut = tx.owner_address?.toLowerCase() === currentWallet.address.toLowerCase();
            const counterparty = isOut ? tx.to_address : tx.owner_address;
            const displayAddr = counterparty
              ? `${counterparty.slice(0, 6)}...${counterparty.slice(-4)}`
              : "Contract";
            const amount = tx.amount ? formatAmount(tx.amount, 6) : "-";

            return (
              <div
                key={tx.tx_id}
                className="flex items-center justify-between px-4 h-14 cursor-pointer transition-colors"
                style={{ borderBottom: "1px solid var(--border)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#1F1F1F")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
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
                <div className="text-right">
                  <p className="text-sm font-medium" style={{ color: isOut ? "var(--text-primary)" : "var(--success)", fontVariantNumeric: "tabular-nums" }}>
                    {isOut ? "-" : "+"}{amount} TRX
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                    {tx.block_timestamp ? new Date(tx.block_timestamp).toLocaleString() : ""}
                  </p>
                </div>
              </div>
            );
          })}
          {transactions.length === 0 && (
            <div className="px-4 py-8 text-center">
              <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>{t("dashboard.noTransactions")}</p>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
