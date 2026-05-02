import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Send as SendIcon, AlertCircle, Check, QrCode, ChevronDown, Lock } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { useWalletStore } from "@/stores/walletStore";
import { useAccountStore } from "@/stores/accountStore";
import { usePriceStore } from "@/stores/priceStore";
import { invoke } from "@tauri-apps/api/core";

// Known TRC-20 contracts
const TRC20_CONTRACTS: Record<string, { symbol: string; name: string; decimals: number }> = {
  "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t": { symbol: "USDT", name: "Tether USD", decimals: 6 },
  "TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8": { symbol: "USDC", name: "USD Coin", decimals: 6 },
};

interface TokenOption {
  symbol: string;
  name: string;
  balance: string;
  rawBalance: number;
  contractAddress?: string;
  decimals: number;
}

export default function Send() {
  const { t } = useTranslation();
  const { currentWallet } = useWalletStore();
  const { accountInfo, fetchAccountInfo } = useAccountStore();
  const { trxPrice, startPolling, stopPolling } = usePriceStore();

  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [token, setToken] = useState("TRX");
  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [error, setError] = useState("");
  const [showTokens, setShowTokens] = useState(false);

  useEffect(() => {
    if (currentWallet?.address) {
      fetchAccountInfo(currentWallet.address, currentWallet.network);
    }
    startPolling();
    return () => stopPolling();
  }, [currentWallet?.address]);

  // Build token list from account info
  const tokens: TokenOption[] = [
    {
      symbol: "TRX",
      name: "TRON",
      balance: ((accountInfo?.trx_balance ?? 0) / 1e6).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      rawBalance: (accountInfo?.trx_balance ?? 0) / 1e6,
      decimals: 6,
    },
    ...(accountInfo?.trc20_tokens ?? []).map((t) => {
      const meta = TRC20_CONTRACTS[t.contract_address];
      const decimals = meta?.decimals ?? t.decimals;
      const bal = parseFloat(t.balance) / Math.pow(10, decimals);
      return {
        symbol: meta?.symbol ?? "UNKNOWN",
        name: meta?.name ?? t.contract_address.slice(0, 10) + "...",
        balance: bal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        rawBalance: bal,
        contractAddress: t.contract_address,
        decimals,
      };
    }),
  ];

  const sel = tokens.find((t) => t.symbol === token) || tokens[0];
  const priceUsd = trxPrice?.price_usd ?? 0;

  const handleSend = async () => {
    if (!currentWallet || !password) return;

    setSending(true);
    setError("");

    try {
      if (sel.contractAddress) {
        // TRC-20 transfer
        const amountRaw = Math.floor(parseFloat(amount) * Math.pow(10, sel.decimals));
        const txId = await invoke<string>("send_trc20", {
          request: {
            wallet_id: currentWallet.id,
            password,
            to_address: to,
            contract_address: sel.contractAddress,
            amount: amountRaw.toString(),
            fee_limit: 100_000_000, // 100 TRX fee limit
            network: currentWallet.network || "mainnet",
          },
        });
        setTxHash(txId);
      } else {
        // TRX transfer
        const amountSun = Math.floor(parseFloat(amount) * 1e6);
        const txId = await invoke<string>("send_trx", {
          request: {
            wallet_id: currentWallet.id,
            password,
            to_address: to,
            amount_sun: amountSun,
            network: currentWallet.network || "mainnet",
          },
        });
        setTxHash(txId);
      }
      setSent(true);
    } catch (e) {
      setError(String(e));
    } finally {
      setSending(false);
    }
  };

  const reset = () => {
    setTo("");
    setAmount("");
    setMemo("");
    setPassword("");
    setShowConfirm(false);
    setSent(false);
    setTxHash("");
    setError("");
  };

  const isValidAddress = (addr: string) => /^T[a-zA-Z0-9]{33}$/.test(addr.trim());

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-md mx-auto space-y-4">
      <h1 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{t("send.title")}</h1>

      <div className="rounded-xl p-5 space-y-4" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        {/* From */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{t("send.from")}</label>
          <div className="flex items-center gap-3 h-11 px-3 rounded-lg" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold" style={{ background: "#333", color: "var(--text-primary)" }}>
              {currentWallet?.name[0]?.toUpperCase() || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{currentWallet?.name || "No wallet"}</p>
              <p className="text-xs font-mono truncate" style={{ color: "var(--text-tertiary)" }}>{currentWallet?.address || "N/A"}</p>
            </div>
          </div>
        </div>

        {/* Token */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Token</label>
          <div className="relative">
            <button
              onClick={() => setShowTokens(!showTokens)}
              className="w-full flex items-center justify-between h-11 px-3 rounded-lg cursor-pointer transition-colors"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "#333", color: "var(--text-secondary)" }}>{sel?.symbol[0]}</div>
                <div className="text-left">
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{sel?.symbol}</p>
                  <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>Balance: {sel?.balance}</p>
                </div>
              </div>
              <ChevronDown className="w-4 h-4" style={{ color: "var(--text-tertiary)" }} />
            </button>
            {showTokens && (
              <div className="absolute top-full left-0 right-0 mt-1 rounded-lg overflow-hidden z-10" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                {tokens.map((t) => (
                  <button key={t.symbol} onClick={() => { setToken(t.symbol); setShowTokens(false); }} className="w-full flex items-center gap-2 px-3 h-10 cursor-pointer transition-colors text-sm" style={{ color: "var(--text-primary)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#333")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    {t.symbol} <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>{t.name}</span>
                    {token === t.symbol && <Check className="w-4 h-4 ml-auto" style={{ color: "var(--accent)" }} />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* To */}
        <Input
          label={t("send.to")}
          placeholder={t("send.enterAddress")}
          value={to}
          onChange={(e) => setTo(e.target.value)}
          error={to && !isValidAddress(to) ? t("app.invalidTronAddress") : undefined}
          suffix={
            <button
              className="cursor-pointer"
              style={{ color: "var(--text-tertiary)" }}
              onClick={async () => {
                try {
                  const text = await navigator.clipboard.readText();
                  if (text && /^T[a-zA-Z0-9]{33}$/.test(text.trim())) {
                    setTo(text.trim());
                  }
                } catch {}
              }}
              title={t("common.paste")}
            >
              <QrCode className="w-4 h-4" />
            </button>
          }
        />

        {/* Amount */}
        <Input label={t("common.amount")} type="number" placeholder={t("send.enterAmount")} value={amount} onChange={(e) => setAmount(e.target.value)}
          suffix={<button className="text-xs font-semibold cursor-pointer" style={{ color: "var(--accent)" }} onClick={() => setAmount(sel?.rawBalance.toString() || "0")}>MAX</button>}
        />

        {/* Memo */}
        <Input label={t("send.memo")} placeholder={t("send.addMemo")} value={memo} onChange={(e) => setMemo(e.target.value)} hint="Optional" />

        {/* Fee */}
        <div className="flex items-center justify-between h-10 px-3 rounded-lg" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{t("send.fee")}</span>
          <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
            {sel?.contractAddress ? "~15 TRX (energy)" : "~0.27 TRX (bandwidth)"}
          </span>
        </div>

        {/* Warning */}
        <div className="flex items-start gap-2 p-3 rounded-lg" style={{ background: "rgba(255,149,0,0.08)" }}>
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--warning)" }} />
          <p className="text-xs" style={{ color: "var(--warning)" }}>{t("app.doubleCheckAddress")}</p>
        </div>

        <Button fullWidth onClick={() => setShowConfirm(true)} disabled={!to || !amount || !isValidAddress(to)}>
          <SendIcon className="w-4 h-4" />{t("send.sendTransaction")}
        </Button>
      </div>

      {/* Confirm Modal */}
      <Modal isOpen={showConfirm} onClose={() => { if (!sending) { setShowConfirm(false); if (sent) reset(); } }} title={sent ? "Sent" : "Confirm"}>
        {sent ? (
          <div className="text-center py-4 space-y-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto" style={{ background: "rgba(0,214,143,0.1)" }}>
              <Check className="w-6 h-6" style={{ color: "var(--success)" }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{t("send.transactionSent")}</p>
              <p className="text-xs mt-1 font-mono" style={{ color: "var(--text-tertiary)" }}>{txHash.slice(0, 20)}...</p>
            </div>
            <Button className="w-full" onClick={reset}>Done</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-2xl font-bold" style={{ color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>{amount} {token}</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
                ≈ ${(parseFloat(amount || "0") * (token === "TRX" ? priceUsd : 1)).toFixed(2)} USD
              </p>
            </div>
            <div className="rounded-lg overflow-hidden" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
              {[["From", currentWallet?.address.slice(0, 10) + "..."], ["To", to.slice(0, 10) + "..."], ["Fee", sel?.contractAddress ? "~15 TRX" : "~0.27 TRX"]].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between px-3 h-9" style={{ borderBottom: "1px solid var(--border)" }}>
                  <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>{k}</span>
                  <span className="text-xs font-mono" style={{ color: "var(--text-primary)" }}>{v}</span>
                </div>
              ))}
            </div>

            {/* Password for signing */}
            <div className="flex items-start gap-2 p-3 rounded-lg" style={{ background: "rgba(0,214,143,0.08)" }}>
              <Lock className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--success)" }} />
              <p className="text-xs" style={{ color: "var(--success)" }}>Enter your wallet password to sign this transaction.</p>
            </div>
            <Input
              label={t("app.password")}
              type="password"
              placeholder={t("app.enterPassword")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg" style={{ background: "rgba(255,59,48,0.08)" }}>
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--danger)" }} />
                <p className="text-xs" style={{ color: "var(--danger)" }}>{error}</p>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setShowConfirm(false)} disabled={sending}>Cancel</Button>
              <Button className="flex-1" onClick={handleSend} loading={sending} disabled={!password}>Confirm</Button>
            </div>
          </div>
        )}
      </Modal>
    </motion.div>
  );
}
