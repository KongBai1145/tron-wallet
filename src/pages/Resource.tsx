import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Zap, Bolt, Lock, Unlock, ArrowRight, Send, Download } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import EmptyState from "@/components/ui/EmptyState";
import { useWalletStore } from "@/stores/walletStore";
import { useAccountStore } from "@/stores/accountStore";
import { invoke } from "@tauri-apps/api/core";

function ResourceBar({ label, used, limit, color }: { label: string; used: number; limit: number; color: string }) {
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const available = limit - used;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{label}</span>
        <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          {limit > 0 ? `${available.toLocaleString()} / ${limit.toLocaleString()}` : "N/A"}
        </span>
      </div>
      <div className="w-full h-2 rounded-full" style={{ background: "var(--bg-elevated)" }}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <div className="flex justify-between text-xs" style={{ color: "var(--text-tertiary)" }}>
        <span>{used.toLocaleString()} used</span>
        <span>{limit.toLocaleString()} limit</span>
      </div>
    </div>
  );
}

function formatCountdown(expireTimeMs: number): string {
  const now = Date.now();
  const diff = expireTimeMs - now;
  if (diff <= 0) return "Ready";
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hours}h`;
  const minutes = Math.floor((diff % 3600000) / 60000);
  return `${hours}h ${minutes}m`;
}

export default function Resource() {
  const { t } = useTranslation();
  const { currentWallet } = useWalletStore();
  const { accountInfo, fetchAccountInfo } = useAccountStore();

  const [showFreeze, setShowFreeze] = useState(false);
  const [showUnfreeze, setShowUnfreeze] = useState(false);
  const [showDelegate, setShowDelegate] = useState(false);
  const [showUndelegate, setShowUndelegate] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [freezeAmount, setFreezeAmount] = useState("");
  const [freezeResource, setFreezeResource] = useState<"BANDWIDTH" | "ENERGY">("BANDWIDTH");
  const [receiverAddress, setReceiverAddress] = useState("");
  const [password, setPassword] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionResult, setActionResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (currentWallet?.address) {
      fetchAccountInfo(currentWallet.address, currentWallet.network);
    }
  }, [currentWallet?.address]);

  const handleFreeze = async () => {
    if (!currentWallet || !password || !freezeAmount) return;
    setActionLoading(true);
    setActionResult(null);
    try {
      const amountSun = Math.floor(parseFloat(freezeAmount) * 1e6);
      await invoke("freeze_balance", {
        request: {
          wallet_id: currentWallet.id,
          password,
          amount_sun: amountSun,
          resource_type: freezeResource,
          network: currentWallet.network || "mainnet",
        },
      });
      setActionResult({ success: true, message: t("resource.freezeSuccess") });
      fetchAccountInfo(currentWallet.address, currentWallet.network);
    } catch (e) {
      setActionResult({ success: false, message: String(e) });
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnfreeze = async () => {
    if (!currentWallet || !password || !freezeAmount) return;
    setActionLoading(true);
    setActionResult(null);
    try {
      const amountSun = Math.floor(parseFloat(freezeAmount) * 1e6);
      await invoke("unfreeze_balance", {
        request: {
          wallet_id: currentWallet.id,
          password,
          amount_sun: amountSun,
          resource_type: freezeResource,
          network: currentWallet.network || "mainnet",
        },
      });
      setActionResult({ success: true, message: t("resource.unfreezeSuccess") });
      fetchAccountInfo(currentWallet.address, currentWallet.network);
    } catch (e) {
      setActionResult({ success: false, message: String(e) });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelegate = async () => {
    if (!currentWallet || !password || !freezeAmount || !receiverAddress) return;
    setActionLoading(true);
    setActionResult(null);
    try {
      const amountSun = Math.floor(parseFloat(freezeAmount) * 1e6);
      await invoke("delegate_resource", {
        request: {
          wallet_id: currentWallet.id,
          password,
          amount_sun: amountSun,
          resource_type: freezeResource,
          receiver_address: receiverAddress,
          lock: false,
          network: currentWallet.network || "mainnet",
        },
      });
      setActionResult({ success: true, message: t("app.delegationSuccess") });
      fetchAccountInfo(currentWallet.address, currentWallet.network);
    } catch (e) {
      setActionResult({ success: false, message: String(e) });
    } finally {
      setActionLoading(false);
    }
  };

  const handleUndelegate = async () => {
    if (!currentWallet || !password || !freezeAmount || !receiverAddress) return;
    setActionLoading(true);
    setActionResult(null);
    try {
      const amountSun = Math.floor(parseFloat(freezeAmount) * 1e6);
      await invoke("undelegate_resource", {
        request: {
          wallet_id: currentWallet.id,
          password,
          amount_sun: amountSun,
          resource_type: freezeResource,
          receiver_address: receiverAddress,
          network: currentWallet.network || "mainnet",
        },
      });
      setActionResult({ success: true, message: t("app.undelegationSuccess") });
      fetchAccountInfo(currentWallet.address, currentWallet.network);
    } catch (e) {
      setActionResult({ success: false, message: String(e) });
    } finally {
      setActionLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!currentWallet || !password) return;
    setActionLoading(true);
    setActionResult(null);
    try {
      await invoke("withdraw_expired_unfreeze", {
        request: {
          wallet_id: currentWallet.id,
          password,
          network: currentWallet.network || "mainnet",
        },
      });
      setActionResult({ success: true, message: t("resource.withdrawSuccess") });
      fetchAccountInfo(currentWallet.address, currentWallet.network);
    } catch (e) {
      setActionResult({ success: false, message: String(e) });
    } finally {
      setActionLoading(false);
    }
  };

  const resetModals = () => {
    setShowFreeze(false);
    setShowUnfreeze(false);
    setShowDelegate(false);
    setShowUndelegate(false);
    setShowWithdraw(false);
    setFreezeAmount("");
    setReceiverAddress("");
    setPassword("");
    setActionResult(null);
  };

  if (!currentWallet) {
    return (
      <EmptyState
        icon={<Zap className="w-6 h-6" />}
        title={t("app.noWallet")}
        description={t("app.selectWalletResources")}
      />
    );
  }

  const bandwidthUsed = accountInfo?.bandwidth_used ?? 0;
  const bandwidthLimit = accountInfo?.bandwidth_limit ?? 0;
  const energyUsed = accountInfo?.energy_used ?? 0;
  const energyLimit = accountInfo?.energy_limit ?? 0;
  const frozenBw = accountInfo?.frozen_for_bandwidth ?? 0;
  const frozenEnergy = accountInfo?.frozen_for_energy ?? 0;
  const tronPower = accountInfo?.tron_power ?? 0;
  const totalStaked = frozenBw + frozenEnergy;
  const unfrozenList = accountInfo?.unfrozen_list ?? [];
  const withdrawable = accountInfo?.withdrawable_balance ?? 0;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-lg mx-auto space-y-4">
      <h1 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{t("resource.title")}</h1>

      {/* Resource Overview */}
      <div className="rounded-xl p-5 space-y-5" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        <ResourceBar
          label={t("resource.bandwidth")}
          used={bandwidthUsed}
          limit={bandwidthLimit}
          color="var(--accent)"
        />
        <ResourceBar
          label={t("resource.energy")}
          used={energyUsed}
          limit={energyLimit}
          color="#FF9500"
        />

        {/* TRON Power */}
        <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: "var(--bg-elevated)" }}>
          <div className="flex items-center gap-2">
            <Bolt className="w-4 h-4" style={{ color: "var(--accent)" }} />
            <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{t("resource.tronPower")}</span>
          </div>
          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {tronPower.toLocaleString()} TP
          </span>
        </div>
      </div>

      {/* Staking Summary */}
      <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        <div className="px-4 h-10 flex items-center" style={{ borderBottom: "1px solid var(--border)" }}>
          <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>{t("resource.stakedTrx")}</span>
        </div>

        <div className="px-4 py-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>{t("resource.frozenForBandwidth")}</span>
            <span className="text-sm font-mono" style={{ color: "var(--text-primary)" }}>
              {(frozenBw / 1e6).toLocaleString("en-US", { minimumFractionDigits: 2 })} TRX
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>{t("resource.frozenForEnergy")}</span>
            <span className="text-sm font-mono" style={{ color: "var(--text-primary)" }}>
              {(frozenEnergy / 1e6).toLocaleString("en-US", { minimumFractionDigits: 2 })} TRX
            </span>
          </div>
          <div className="h-px" style={{ background: "var(--border)" }} />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>{t("resource.totalStaked")}</span>
            <span className="text-sm font-semibold font-mono" style={{ color: "var(--text-primary)" }}>
              {(totalStaked / 1e6).toLocaleString("en-US", { minimumFractionDigits: 2 })} TRX
            </span>
          </div>
        </div>
      </div>

      {/* Pending Unstakes */}
      {unfrozenList.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
          <div className="px-4 h-10 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
            <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>{t("app.pendingUnstakes")}</span>
            {withdrawable > 0 && (
              <span className="text-xs font-medium" style={{ color: "var(--success)" }}>
                {(withdrawable / 1e6).toLocaleString("en-US", { minimumFractionDigits: 2 })} TRX {t("app.readyToWithdraw")}
              </span>
            )}
          </div>
          <div className="px-4 py-3 space-y-2">
            {unfrozenList.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-xs font-mono" style={{ color: "var(--text-primary)" }}>
                  {(item.amount / 1e6).toLocaleString("en-US", { minimumFractionDigits: 2 })} TRX
                </span>
                <span className="text-xs" style={{ color: item.unfreeze_expire_time <= Date.now() ? "var(--success)" : "var(--text-tertiary)" }}>
                  {formatCountdown(item.unfreeze_expire_time)}
                </span>
              </div>
            ))}
          </div>
          {withdrawable > 0 && (
            <div className="px-4 pb-3">
              <Button fullWidth variant="secondary" onClick={() => setShowWithdraw(true)}>
                <Download className="w-4 h-4" />{t("resource.withdraw")} ({(withdrawable / 1e6).toLocaleString("en-US", { minimumFractionDigits: 2 })} TRX)
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button fullWidth onClick={() => { setFreezeResource("BANDWIDTH"); setShowFreeze(true); }}>
          <Lock className="w-4 h-4" />{t("resource.freeze")}
        </Button>
        <Button variant="secondary" fullWidth onClick={() => { setFreezeResource("BANDWIDTH"); setShowUnfreeze(true); }} disabled={totalStaked === 0}>
          <Unlock className="w-4 h-4" />{t("resource.unfreeze")}
        </Button>
        <Button fullWidth onClick={() => { setFreezeResource("BANDWIDTH"); setShowDelegate(true); }}>
          <Send className="w-4 h-4" />{t("resource.delegate")}
        </Button>
        <Button variant="secondary" fullWidth onClick={() => { setFreezeResource("BANDWIDTH"); setShowUndelegate(true); }}>
          <ArrowRight className="w-4 h-4" />{t("resource.undelegate")}
        </Button>
      </div>

      <p className="text-xs text-center" style={{ color: "var(--text-tertiary)" }}>{t("resource.unstakePeriod")}</p>

      {/* Freeze Modal */}
      <Modal isOpen={showFreeze} onClose={resetModals} title={t("resource.freeze")}>
        <div className="space-y-4">
          <ResourceTypeSelector value={freezeResource} onChange={setFreezeResource} />
          <Input
            label={t("resource.freezeAmount")}
            type="number"
            placeholder="0.00"
            value={freezeAmount}
            onChange={(e) => setFreezeAmount(e.target.value)}
            suffix={<span className="text-xs" style={{ color: "var(--text-tertiary)" }}>TRX</span>}
          />
          <Input
            label={t("wallet.password")}
            type="password"
            placeholder={t("wallet.enterPassword")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {actionResult && <ActionResultBanner result={actionResult} />}
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={resetModals}>{t("common.cancel")}</Button>
            <Button className="flex-1" onClick={handleFreeze} loading={actionLoading} disabled={!freezeAmount || !password}>
              {t("resource.freeze")}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Unfreeze Modal */}
      <Modal isOpen={showUnfreeze} onClose={resetModals} title={t("resource.unfreeze")}>
        <div className="space-y-4">
          <ResourceTypeSelector value={freezeResource} onChange={setFreezeResource} />
          <Input
            label={t("resource.freezeAmount")}
            type="number"
            placeholder="0.00"
            value={freezeAmount}
            onChange={(e) => setFreezeAmount(e.target.value)}
            suffix={<span className="text-xs" style={{ color: "var(--text-tertiary)" }}>TRX</span>}
          />
          <Input
            label={t("wallet.password")}
            type="password"
            placeholder={t("wallet.enterPassword")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="flex items-start gap-2 p-3 rounded-lg" style={{ background: "rgba(255,149,0,0.08)" }}>
            <ArrowRight className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--warning)" }} />
            <p className="text-xs" style={{ color: "var(--warning)" }}>{t("resource.unstakePeriod")}</p>
          </div>
          {actionResult && <ActionResultBanner result={actionResult} />}
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={resetModals}>{t("common.cancel")}</Button>
            <Button className="flex-1" onClick={handleUnfreeze} loading={actionLoading} disabled={!freezeAmount || !password}>
              {t("resource.unfreeze")}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delegate Modal */}
      <Modal isOpen={showDelegate} onClose={resetModals} title={t("resource.delegate")}>
        <div className="space-y-4">
          <ResourceTypeSelector value={freezeResource} onChange={setFreezeResource} />
          <Input
            label={t("app.receiverAddress")}
            placeholder={t("app.enterReceiverAddress")}
            value={receiverAddress}
            onChange={(e) => setReceiverAddress(e.target.value)}
          />
          <Input
            label={t("resource.freezeAmount")}
            type="number"
            placeholder="0.00"
            value={freezeAmount}
            onChange={(e) => setFreezeAmount(e.target.value)}
            suffix={<span className="text-xs" style={{ color: "var(--text-tertiary)" }}>TRX</span>}
          />
          <Input
            label={t("wallet.password")}
            type="password"
            placeholder={t("wallet.enterPassword")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {actionResult && <ActionResultBanner result={actionResult} />}
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={resetModals}>{t("common.cancel")}</Button>
            <Button className="flex-1" onClick={handleDelegate} loading={actionLoading} disabled={!freezeAmount || !password || !receiverAddress}>
              {t("resource.delegate")}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Undelegate Modal */}
      <Modal isOpen={showUndelegate} onClose={resetModals} title={t("resource.undelegate")}>
        <div className="space-y-4">
          <ResourceTypeSelector value={freezeResource} onChange={setFreezeResource} />
          <Input
            label={t("app.receiverAddress")}
            placeholder={t("app.enterReceiverAddress")}
            value={receiverAddress}
            onChange={(e) => setReceiverAddress(e.target.value)}
          />
          <Input
            label={t("resource.freezeAmount")}
            type="number"
            placeholder="0.00"
            value={freezeAmount}
            onChange={(e) => setFreezeAmount(e.target.value)}
            suffix={<span className="text-xs" style={{ color: "var(--text-tertiary)" }}>TRX</span>}
          />
          <Input
            label={t("wallet.password")}
            type="password"
            placeholder={t("wallet.enterPassword")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="flex items-start gap-2 p-3 rounded-lg" style={{ background: "rgba(255,149,0,0.08)" }}>
            <ArrowRight className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--warning)" }} />
            <p className="text-xs" style={{ color: "var(--warning)" }}>{t("resource.unstakePeriod")}</p>
          </div>
          {actionResult && <ActionResultBanner result={actionResult} />}
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={resetModals}>{t("common.cancel")}</Button>
            <Button className="flex-1" onClick={handleUndelegate} loading={actionLoading} disabled={!freezeAmount || !password || !receiverAddress}>
              {t("resource.undelegate")}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Withdraw Modal */}
      <Modal isOpen={showWithdraw} onClose={resetModals} title={t("resource.withdraw")}>
        <div className="space-y-4">
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {t("app.withdrawDesc", { amount: (withdrawable / 1e6).toLocaleString("en-US", { minimumFractionDigits: 2 }) })}
          </p>
          <Input
            label={t("wallet.password")}
            type="password"
            placeholder={t("wallet.enterPassword")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {actionResult && <ActionResultBanner result={actionResult} />}
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={resetModals}>{t("common.cancel")}</Button>
            <Button className="flex-1" onClick={handleWithdraw} loading={actionLoading} disabled={!password}>
              {t("resource.withdraw")}
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}

function ResourceTypeSelector({ value, onChange }: { value: "BANDWIDTH" | "ENERGY"; onChange: (v: "BANDWIDTH" | "ENERGY") => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex gap-2">
      {(["BANDWIDTH", "ENERGY"] as const).map((rt) => (
        <button
          key={rt}
          onClick={() => onChange(rt)}
          className="flex-1 h-9 rounded-md text-xs font-medium cursor-pointer transition-colors"
          style={{
            background: value === rt ? "var(--bg-elevated)" : "transparent",
            color: value === rt ? "var(--text-primary)" : "var(--text-tertiary)",
            border: value === rt ? "1px solid #444" : "1px solid transparent",
          }}
        >
          {rt === "BANDWIDTH" ? t("resource.bandwidth") : t("resource.energy")}
        </button>
      ))}
    </div>
  );
}

function ActionResultBanner({ result }: { result: { success: boolean; message: string } }) {
  return (
    <div className="p-3 rounded-lg" style={{ background: result.success ? "rgba(0,214,143,0.08)" : "rgba(255,59,48,0.08)" }}>
      <p className="text-xs" style={{ color: result.success ? "var(--success)" : "var(--danger)" }}>{result.message}</p>
    </div>
  );
}
