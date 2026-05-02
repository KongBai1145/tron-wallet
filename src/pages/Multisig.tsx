import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, Plus, Users, Clock, CheckCircle, XCircle, Settings, Key, Send } from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import { useWalletStore } from "@/stores/walletStore";
import { useAccountStore } from "@/stores/accountStore";
import { invoke } from "@tauri-apps/api/core";

interface Proposal { id: string; title: string; status: string; signers: number; signed: number; amount: string; tx_id?: string; }
interface PermKey { address: string; weight: number; label?: string; }
interface Permission { threshold: number; keys: PermKey[]; }

export default function Multisig() {
  const { t } = useTranslation();
  const { currentWallet } = useWalletStore();
  const { accountInfo, fetchAccountInfo } = useAccountStore();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [proposals, setProposals] = useState<Proposal[]>([]);

  const statusConfig = {
    pending: { color: "warning" as const, icon: Clock },
    approved: { color: "success" as const, icon: CheckCircle },
    rejected: { color: "danger" as const, icon: XCircle },
  };

  const isMultisig = currentWallet?.wallet_type === "multisig";

  useEffect(() => {
    if (currentWallet?.address) {
      fetchAccountInfo(currentWallet.address, currentWallet.network);
    }
  }, [currentWallet?.address]);

  const ownerPerm: Permission | null = accountInfo?.owner_permission ? {
    threshold: accountInfo.owner_permission.threshold ?? 1,
    keys: (accountInfo.owner_permission.keys ?? []).map((k: any) => ({
      address: k.address ?? "",
      weight: k.weight ?? 1,
      label: k.label,
    })),
  } : null;

  const handleCreateProposal = async () => {
    if (!currentWallet || !toAddress || !amount || !password) return;
    setCreating(true);
    try {
      const amountSun = Math.floor(parseFloat(amount) * 1e6);
      const txId = await invoke<string>("create_multisig_proposal", {
        walletId: currentWallet.id,
        password,
        toAddress,
        amountSun,
        network: currentWallet.network || "mainnet",
      });
      const newProposal: Proposal = {
        id: txId.slice(0, 8),
        title: `Send ${amount} TRX`,
        status: "pending",
        signers: ownerPerm?.keys.length ?? 2,
        signed: 1,
        amount: `${amount} TRX`,
        tx_id: txId,
      };
      setProposals([newProposal, ...proposals]);
      setShowCreate(false);
      setToAddress("");
      setAmount("");
      setPassword("");
    } catch (e) {
      // Error creating proposal
    } finally {
      setCreating(false);
    }
  };

  if (!isMultisig) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-lg mx-auto space-y-4">
        <h1 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{t("multisig.title")}</h1>
        <EmptyState
          icon={<Shield className="w-6 h-6" />}
          title={t("common.noMultisigSelected")}
          description={t("common.importMultisigDesc")}
          action={<Button size="sm" onClick={() => navigate("/wallet")}><Plus className="w-4 h-4" />{t("common.importMultisigAccount")}</Button>}
        />
        <div className="rounded-xl p-4 space-y-3" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{t("common.howMultisigWorks")}</h3>
          <div className="space-y-2 text-xs" style={{ color: "var(--text-secondary)" }}>
            <div className="flex items-start gap-2">
              <Key className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "var(--accent)" }} />
              <p><strong>{t("common.ownerPermission")}:</strong> {t("common.ownerPermissionDesc")}</p>
            </div>
            <div className="flex items-start gap-2">
              <Settings className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "var(--text-secondary)" }} />
              <p><strong>{t("common.activePermission")}:</strong> {t("common.activePermissionDesc")}</p>
            </div>
            <div className="flex items-start gap-2">
              <Users className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "var(--text-secondary)" }} />
              <p><strong>{t("common.threshold")}:</strong> {t("common.thresholdDesc")}</p>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-lg mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{t("multisig.title")}</h1>
        <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" />{t("multisig.createProposal")}</Button>
      </div>

      {/* Permission Overview */}
      {ownerPerm ? (
        <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
          <div className="px-4 h-10 flex items-center" style={{ borderBottom: "1px solid var(--border)" }}>
            <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>{t("common.ownerPermission")} ({ownerPerm.threshold}-of-{ownerPerm.keys.length})</span>
          </div>
          {ownerPerm.keys.map((k, i) => (
            <div key={i} className="flex items-center justify-between px-4 h-11" style={{ borderBottom: i < ownerPerm.keys.length - 1 ? "1px solid var(--border)" : "none" }}>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs" style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}>{(k.label || k.address[5]).toUpperCase()}</div>
                <span className="text-xs font-mono" style={{ color: "var(--text-primary)" }}>{k.address.slice(0, 10)}...{k.address.slice(-6)}</span>
              </div>
              <div className="flex items-center gap-2">
                {k.label && <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>{k.label}</span>}
                <Badge variant="default">weight: {k.weight}</Badge>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl p-6 text-center" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>{t("multisig.noPermissions")}</p>
        </div>
      )}

      {/* Proposals */}
      <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        <div className="px-4 h-10 flex items-center" style={{ borderBottom: "1px solid var(--border)" }}>
          <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>{t("multisig.proposal")}</span>
        </div>
        {proposals.length > 0 ? proposals.map((proposal) => {
          const config = statusConfig[proposal.status as keyof typeof statusConfig];
          const StatusIcon = config.icon;
          const statusColor = proposal.status === "pending" ? "var(--warning)" : proposal.status === "approved" ? "var(--success)" : "var(--danger)";

          return (
            <div key={proposal.id} className="flex items-center justify-between px-4 h-14 cursor-pointer transition-colors" style={{ borderBottom: "1px solid var(--border)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#1F1F1F")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: proposal.status === "pending" ? "rgba(255,149,0,0.1)" : proposal.status === "approved" ? "rgba(0,214,143,0.1)" : "rgba(255,59,48,0.1)" }}>
                  <StatusIcon className="w-4 h-4" style={{ color: statusColor }} />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{proposal.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant={config.color}>{proposal.status}</Badge>
                    {proposal.amount && <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>{proposal.amount}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>{proposal.signed}/{proposal.signers}</p>
                  <div className="w-20 h-1 rounded-full mt-1" style={{ background: "var(--bg-elevated)" }}>
                    <div className="h-full rounded-full" style={{ width: `${(proposal.signed / proposal.signers) * 100}%`, background: "var(--accent)" }} />
                  </div>
                </div>
              </div>
            </div>
          );
        }) : (
          <div className="px-4 py-6 text-center">
            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>{t("multisig.noProposals")}</p>
          </div>
        )}
      </div>

      {/* Create Proposal Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title={t("multisig.createProposal")}>
        <div className="space-y-4">
          <div className="flex items-start gap-2 p-3 rounded-lg" style={{ background: "rgba(0,214,143,0.08)" }}>
            <Shield className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--success)" }} />
            <p className="text-xs" style={{ color: "var(--success)" }}>
              This proposal will require {ownerPerm?.threshold ?? 2} signatures to execute.
            </p>
          </div>
          <Input
            label={t("send.to")}
            placeholder={t("send.enterAddress")}
            value={toAddress}
            onChange={(e) => setToAddress(e.target.value)}
            error={toAddress && !/^T[a-zA-Z0-9]{33}$/.test(toAddress) ? t("app.invalidTronAddress") : undefined}
          />
          <Input
            label={t("common.amount")}
            type="number"
            placeholder={t("send.enterAmount")}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            suffix={<span className="text-xs" style={{ color: "var(--text-tertiary)" }}>TRX</span>}
          />
          <Input
            label={t("app.password")}
            type="password"
            placeholder={t("app.enterPassword")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="flex gap-2 pt-1">
            <Button variant="secondary" className="flex-1" onClick={() => setShowCreate(false)}>{t("common.cancel")}</Button>
            <Button className="flex-1" onClick={handleCreateProposal} loading={creating} disabled={!toAddress || !amount || !password || !/^T[a-zA-Z0-9]{33}$/.test(toAddress)}>
              <Send className="w-4 h-4" />{t("multisig.createProposal")}
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
