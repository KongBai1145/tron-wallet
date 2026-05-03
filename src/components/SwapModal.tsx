import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeftRight, ChevronDown, ExternalLink, Zap } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { useNavigate } from "react-router-dom";
import { useAccountStore } from "@/stores/accountStore";
import { formatTokenBalance } from "@/utils/balance";

// Token options for swap
const SWAP_TOKENS = [
  { symbol: "TRX", name: "TRON", contract: "" },
  { symbol: "USDT", name: "Tether USD", contract: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t" },
  { symbol: "USDC", name: "USD Coin", contract: "TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8" },
  { symbol: "SUN", name: "SUN Token", contract: "TSSMHYeV2uE9qYs73EhvmWR8n2q5NyD8n8" },
  { symbol: "JST", name: "JUST", contract: "TCFLL5dx5ZJdKnWuesXxi1VPwjLVmWZZy9" },
];

// SunSwap URL with optional token parameters
function getSunSwapUrl(fromToken: string, toToken: string): string {
  const baseUrl = "https://sunswap.com";
  // SunSwap uses hash-based routing, token parameters in URL
  const params = new URLSearchParams();
  if (fromToken && fromToken !== "TRX") {
    params.set("inputCurrency", fromToken);
  }
  if (toToken) {
    params.set("outputCurrency", toToken);
  }
  // Return base URL - SunSwap interface will handle pair selection
  return params.toString() ? `${baseUrl}/#/swap?${params.toString()}` : `${baseUrl}/#/swap`;
}

interface SwapModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SwapModal({ isOpen, onClose }: SwapModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { accountInfo } = useAccountStore();

  const [fromToken, setFromToken] = useState("TRX");
  const [toToken, setToToken] = useState("USDT");
  const [showFromTokens, setShowFromTokens] = useState(false);
  const [showToTokens, setShowToTokens] = useState(false);

  // Get token balances
  const trxBalance = (accountInfo?.trx_balance ?? 0) / 1e6;
  const usdtBalance = accountInfo?.trc20_tokens?.find(
    (t) => t.contract_address === "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"
  );
  const usdcBalance = accountInfo?.trc20_tokens?.find(
    (t) => t.contract_address === "TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8"
  );

  const balances: Record<string, string> = {
    TRX: trxBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    USDT: usdtBalance ? formatTokenBalance(usdtBalance.balance, 6) : "0.00",
    USDC: usdcBalance ? formatTokenBalance(usdcBalance.balance, 6) : "0.00",
  };

  // Open SunSwap in DApp browser
  const handleSwap = () => {
    const fromContract = SWAP_TOKENS.find((t) => t.symbol === fromToken)?.contract;
    const toContract = SWAP_TOKENS.find((t) => t.symbol === toToken)?.contract;
    const url = getSunSwapUrl(fromContract || "", toContract || "");

    // Navigate to DApp with SunSwap URL (pass via state)
    navigate("/dapp", { state: { openUrl: url } });
    onClose();
  };

  // Swap token positions
  const flipTokens = () => {
    setFromToken(toToken);
    setToToken(fromToken);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("swap.title", "Swap")}>
      <div className="space-y-4">
        {/* From Token */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
            {t("swap.from", "From")}
          </label>
          <div className="relative">
            <button
              onClick={() => setShowFromTokens(!showFromTokens)}
              className="w-full flex items-center justify-between h-11 px-3 rounded-lg cursor-pointer transition-colors"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "#333", color: "var(--text-secondary)" }}>
                  {fromToken[0]}
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{fromToken}</p>
                  <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                    Balance: {balances[fromToken] || "0.00"}
                  </p>
                </div>
              </div>
              <ChevronDown className="w-4 h-4" style={{ color: "var(--text-tertiary)" }} />
            </button>
            {showFromTokens && (
              <div className="absolute top-full left-0 right-0 mt-1 rounded-lg overflow-hidden z-10" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                {SWAP_TOKENS.filter((t) => t.symbol !== toToken).map((token) => (
                  <button
                    key={token.symbol}
                    onClick={() => { setFromToken(token.symbol); setShowFromTokens(false); }}
                    className="w-full flex items-center gap-2 px-3 h-10 cursor-pointer transition-colors text-sm"
                    style={{ color: "var(--text-primary)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#333")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <span className="font-medium">{token.symbol}</span>
                    <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>{token.name}</span>
                    {fromToken === token.symbol && <span className="ml-auto text-xs" style={{ color: "var(--accent)" }}>✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Flip Button */}
        <div className="flex justify-center">
          <button
            onClick={flipTokens}
            className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-colors"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#333")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "var(--bg-elevated)")}
          >
            <ArrowLeftRight className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
          </button>
        </div>

        {/* To Token */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
            {t("swap.to", "To")}
          </label>
          <div className="relative">
            <button
              onClick={() => setShowToTokens(!showToTokens)}
              className="w-full flex items-center justify-between h-11 px-3 rounded-lg cursor-pointer transition-colors"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "#333", color: "var(--text-secondary)" }}>
                  {toToken[0]}
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{toToken}</p>
                  <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                    Balance: {balances[toToken] || "0.00"}
                  </p>
                </div>
              </div>
              <ChevronDown className="w-4 h-4" style={{ color: "var(--text-tertiary)" }} />
            </button>
            {showToTokens && (
              <div className="absolute top-full left-0 right-0 mt-1 rounded-lg overflow-hidden z-10" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                {SWAP_TOKENS.filter((t) => t.symbol !== fromToken).map((token) => (
                  <button
                    key={token.symbol}
                    onClick={() => { setToToken(token.symbol); setShowToTokens(false); }}
                    className="w-full flex items-center gap-2 px-3 h-10 cursor-pointer transition-colors text-sm"
                    style={{ color: "var(--text-primary)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#333")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <span className="font-medium">{token.symbol}</span>
                    <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>{token.name}</span>
                    {toToken === token.symbol && <span className="ml-auto text-xs" style={{ color: "var(--accent)" }}>✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="flex items-start gap-2 p-3 rounded-lg" style={{ background: "rgba(0,214,143,0.08)" }}>
          <Zap className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--success)" }} />
          <p className="text-xs" style={{ color: "var(--success)" }}>
            {t("swap.info", "Powered by SunSwap DEX. Opens in embedded browser.")}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button className="flex-1" onClick={handleSwap}>
            <ExternalLink className="w-4 h-4" />
            {t("swap.openSunSwap", "Open SunSwap")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}