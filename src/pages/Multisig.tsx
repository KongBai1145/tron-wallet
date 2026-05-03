import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, Plus, Users, Clock, CheckCircle, XCircle, Settings, Key, Send, Copy, Check, ExternalLink, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import { useWalletStore } from "@/stores/walletStore";
import { useAccountStore } from "@/stores/accountStore";
import { invoke } from "@tauri-apps/api/core";

interface Proposal {
  id: string;
  wallet_id: string;
  title: string;
  to_address: string;
  amount_sun: number;
  token_address?: string;
  raw_data_hex: string;
  tx_id: string;
  threshold: number;
  current_weight: number;
  status: string;
  created_at: string;
  expires_at?: string;
  broadcast_tx_hash?: string;
}

interface Signature {
  id: string;
  proposal_id: string;
  signer_address: string;
  signer_weight: number;
  signature_hex: string;
  signed_at: string;
}

interface PermKey { address: string; weight: number; label?: string; }
interface Permission { threshold: number; keys: PermKey[]; }

export default function Multisig() {
  const { t } = useTranslation();
  const { currentWallet } = useWalletStore();
  const { accountInfo, fetchAccountInfo } = useAccountStore();
  const navigate = useNavigate();

  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [creating, setCreating] = useState(false);
  const [unsignedTx, setUnsignedTx] = useState<any>(null);
  const [showUnsignedTx, setShowUnsignedTx] = useState(false);
  const [copiedTx, setCopiedTx] = useState(false);

  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [showProposalDetail, setShowProposalDetail] = useState(false);
  const [showAddSignature, setShowAddSignature] = useState(false);
  const [signatureHex, setSignatureHex] = useState("");
  const [signerAddress, setSignerAddress] = useState("");
  const [addingSignature, setAddingSignature] = useState(false);
  const [signatures, setSignatures] = useState<Signature[]>([]);

  const [broadcasting, setBroadcasting] = useState(false);

  const isMultisig = currentWallet?.wallet_type === "multisig";

  useEffect(() => {
    if (currentWallet?.address) {
      fetchAccountInfo(currentWallet.address, currentWallet.network);
      fetchProposals();
    }
  }, [currentWallet?.address]);

  const fetchProposals = async () => {
    if (!currentWallet?.id) return;
    try {
      const list = await invoke<Proposal[]>("get_proposals", { walletId: currentWallet.id });
      setProposals(list);
    } catch (e) {
      // Error fetching proposals
    }
  };

  const ownerPerm: Permission | null = accountInfo?.owner_permission ? {
    threshold: accountInfo.owner_permission.threshold ?? 1,
    keys: (accountInfo.owner_permission.keys ?? []).map((k: any) => ({
      address: k.address ?? "",
      weight: k.weight ?? 1,
      label: k.label,
    })),
  } : null;

  const handleCreateProposal = async () => {
    if (!currentWallet || !toAddress || !amount) return;
    setCreating(true);
    try {
      const amountSun = Math.floor(parseFloat(amount) * 1e6);
      const result = await invoke<any>("create_unsigned_proposal", {
        walletId: currentWallet.id,
        toAddress,
        amountSun,
        network: currentWallet.network || "mainnet",
      });
      setUnsignedTx(result.unsigned_tx);
      setShowCreate(false);
      setShowUnsignedTx(true);
      fetchProposals();
      setToAddress("");
      setAmount("");
    } catch (e) {
      alert(String(e));
    } finally {
      setCreating(false);
    }
  };

  const copyUnsignedTx = async () => {
    if (!unsignedTx) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(unsignedTx, null, 2));
      setCopiedTx(true);
      setTimeout(() => setCopiedTx(false), 2000);
    } catch {}
  };

  const handleSelectProposal = async (proposal: Proposal) => {
    setSelectedProposal(proposal);
    try {
      const sigs = await invoke<Signature[]>("get_proposal_signatures", { proposalId: proposal.id });
      setSignatures(sigs);
    } catch {}
    setShowProposalDetail(true);
  };

  const handleAddSignature = async () => {
    if (!selectedProposal || !signatureHex || !signerAddress) return;
    setAddingSignature(true);
    try {
      await invoke("add_signature", {
        proposalId: selectedProposal.id,
        signatureHex,
        signerAddress,
        network: currentWallet?.network || "mainnet",
      });
      // Refresh signatures
      const sigs = await invoke<Signature[]>("get_proposal_signatures", { proposalId: selectedProposal.id });
      setSignatures(sigs);
      // Refresh proposal
      const updated = await invoke<Proposal>("get_proposal", { proposalId: selectedProposal.id });
      setSelectedProposal(updated);
      fetchProposals();
      setShowAddSignature(false);
      setSignatureHex("");
      setSignerAddress("");
    } catch (e) {
      alert(String(e));
    } finally {
      setAddingSignature(false);
    }
  };

  const handleBroadcast = async () => {
    if (!selectedProposal) return;
    setBroadcasting(true);
    try {
      await invoke<string>("broadcast_proposal", {
        proposalId: selectedProposal.id,
        network: currentWallet?.network || "mainnet",
      });
      fetchProposals();
      const updated = await invoke<Proposal>("get_proposal", { proposalId: selectedProposal.id });
      setSelectedProposal(updated);
    } catch (e) {
      alert(String(e));
    } finally {
      setBroadcasting(false);
    }
  };

  const handleDeleteProposal = async (proposalId: string) => {
    try {
      await invoke("delete_proposal", { proposalId });
      fetchProposals();
      setShowProposalDetail(false);
      setSelectedProposal(null);
    } catch (e) {
      alert(String(e));
    }
  };

  const statusConfig: Record<string, { color: "warning" | "success" | "danger" | "default"; icon: typeof Clock }> = {
    pending: { color: "warning", icon: Clock },
    ready: { color: "success", icon: CheckCircle },
    broadcasted: { color: "success", icon: CheckCircle },
    rejected: { color: "danger", icon: XCircle },
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
          const config = statusConfig[proposal.status] || statusConfig.pending;
          const StatusIcon = config.icon;
          const progress = Math.min((proposal.current_weight / proposal.threshold) * 100, 100);

          return (
            <div
              key={proposal.id}
              className="flex items-center justify-between px-4 h-14 cursor-pointer transition-colors"
              style={{ borderBottom: "1px solid var(--border)" }}
              onClick={() => handleSelectProposal(proposal)}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#1F1F1F")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: proposal.status === "pending" ? "rgba(255,149,0,0.1)" : proposal.status === "ready" ? "rgba(0,214,143,0.1)" : proposal.status === "broadcasted" ? "rgba(0,214,143,0.1)" : "rgba(255,59,48,0.1)" }}>
                  <StatusIcon className="w-4 h-4"
                    style={{ color: proposal.status === "pending" ? "var(--warning)" : proposal.status === "ready" || proposal.status === "broadcasted" ? "var(--success)" : "var(--danger)" }} />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{proposal.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant={config.color}>{proposal.status}</Badge>
                    <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>{(proposal.amount_sun / 1e6).toFixed(2)} TRX</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>{proposal.current_weight}/{proposal.threshold}</p>
                  <div className="w-20 h-1.5 rounded-full mt-1" style={{ background: "var(--bg-elevated)" }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: progress >= 100 ? "var(--success)" : "var(--accent)" }} />
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
              {t("multisig.proposalInfo", `This proposal will require ${ownerPerm?.threshold ?? 2} signatures to execute. No password needed for multisig.`)}
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
          <div className="flex gap-2 pt-1">
            <Button variant="secondary" className="flex-1" onClick={() => setShowCreate(false)}>{t("common.cancel")}</Button>
            <Button className="flex-1" onClick={handleCreateProposal} loading={creating} disabled={!toAddress || !amount || !/^T[a-zA-Z0-9]{33}$/.test(toAddress)}>
              <Plus className="w-4 h-4" />{t("multisig.createProposal")}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Unsigned Transaction Modal */}
      <Modal isOpen={showUnsignedTx} onClose={() => setShowUnsignedTx(false)} title={t("multisig.unsignedTx", "Unsigned Transaction")}>
        <div className="space-y-4">
          <div className="flex items-start gap-2 p-3 rounded-lg" style={{ background: "rgba(255,149,0,0.08)" }}>
            <Copy className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--warning)" }} />
            <p className="text-xs" style={{ color: "var(--warning)" }}>
              {t("multisig.copyForSigning", "Copy this transaction JSON and sign it externally with your private key or hardware wallet.")}
            </p>
          </div>
          <div className="p-3 rounded-lg max-h-48 overflow-auto text-xs font-mono" style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}>
            {JSON.stringify(unsignedTx, null, 2)}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setShowUnsignedTx(false)}>{t("common.close")}</Button>
            <Button className="flex-1" onClick={copyUnsignedTx}>
              {copiedTx ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copiedTx ? t("common.copied", "Copied") : t("common.copy")}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Proposal Detail Modal */}
      <Modal isOpen={showProposalDetail} onClose={() => { setShowProposalDetail(false); setSelectedProposal(null); }} title={t("multisig.proposalDetail", "Proposal Details")}>
        {selectedProposal && (
          <div className="space-y-4">
            {/* Status */}
            <div className="flex items-center justify-between">
              <Badge variant={statusConfig[selectedProposal.status]?.color || "default"}>{selectedProposal.status}</Badge>
              <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>{new Date(selectedProposal.created_at).toLocaleString()}</span>
            </div>

            {/* Details */}
            <div className="rounded-lg p-3 space-y-2" style={{ background: "var(--bg-elevated)" }}>
              <div className="flex justify-between text-xs">
                <span style={{ color: "var(--text-secondary)" }}>{t("send.to")}</span>
                <span className="font-mono" style={{ color: "var(--text-primary)" }}>{selectedProposal.to_address.slice(0, 10)}...{selectedProposal.to_address.slice(-6)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span style={{ color: "var(--text-secondary)" }}>{t("common.amount")}</span>
                <span style={{ color: "var(--text-primary)" }}>{(selectedProposal.amount_sun / 1e6).toFixed(2)} TRX</span>
              </div>
              <div className="flex justify-between text-xs">
                <span style={{ color: "var(--text-secondary)" }}>{t("multisig.threshold")}</span>
                <span style={{ color: "var(--text-primary)" }}>{selectedProposal.current_weight}/{selectedProposal.threshold}</span>
              </div>
            </div>

            {/* Signatures */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Signatures ({signatures.length})</span>
                <Button size="sm" variant="ghost" onClick={() => setShowAddSignature(true)}><Plus className="w-3 h-3" />Add</Button>
              </div>
              {signatures.length > 0 ? (
                <div className="space-y-1">
                  {signatures.map((sig) => (
                    <div key={sig.id} className="flex items-center justify-between px-2 py-1.5 rounded text-xs" style={{ background: "var(--bg-elevated)" }}>
                      <span className="font-mono" style={{ color: "var(--text-primary)" }}>{sig.signer_address.slice(0, 8)}...{sig.signer_address.slice(-4)}</span>
                      <Badge variant="default">w: {sig.signer_weight}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-center py-2" style={{ color: "var(--text-tertiary)" }}>No signatures yet</p>
              )}
            </div>

            {/* Progress */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span style={{ color: "var(--text-secondary)" }}>Progress</span>
                <span style={{ color: "var(--text-primary)" }}>{Math.min(100, (selectedProposal.current_weight / selectedProposal.threshold) * 100).toFixed(0)}%</span>
              </div>
              <div className="h-2 rounded-full" style={{ background: "var(--bg-elevated)" }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, (selectedProposal.current_weight / selectedProposal.threshold) * 100)}%`, background: selectedProposal.current_weight >= selectedProposal.threshold ? "var(--success)" : "var(--accent)" }} />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              {selectedProposal.status === "pending" && (
                <Button variant="ghost" onClick={() => handleDeleteProposal(selectedProposal.id)}><Trash2 className="w-4 h-4" />{t("common.delete")}</Button>
              )}
              {selectedProposal.status === "ready" && (
                <Button className="flex-1" onClick={handleBroadcast} loading={broadcasting}>
                  <Send className="w-4 h-4" />{t("multisig.broadcast", "Broadcast")}
                </Button>
              )}
              {selectedProposal.status === "broadcasted" && selectedProposal.broadcast_tx_hash && (
                <Button variant="secondary" className="flex-1" onClick={() => window.open(`https://tronscan.org/#/transaction/${selectedProposal.broadcast_tx_hash}`, "_blank")}>
                  <ExternalLink className="w-4 h-4" />View on TronScan
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Add Signature Modal */}
      <Modal isOpen={showAddSignature} onClose={() => setShowAddSignature(false)} title={t("multisig.addSignature", "Add Signature")}>
        <div className="space-y-4">
          <div className="flex items-start gap-2 p-3 rounded-lg" style={{ background: "rgba(0,214,143,0.08)" }}>
            <Shield className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--success)" }} />
            <p className="text-xs" style={{ color: "var(--success)" }}>
              {t("multisig.signatureHelp", "Paste the signature from your external signing tool. Sign the transaction JSON using another wallet or hardware device.")}
            </p>
          </div>

          {/* Signer Address Dropdown */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Signer Address</label>
            <div className="relative">
              {ownerPerm?.keys && (
                <select
                  value={signerAddress}
                  onChange={(e) => setSignerAddress(e.target.value)}
                  className="w-full h-11 px-3 rounded-lg text-sm cursor-pointer"
                  style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                >
                  <option value="">Select signer...</option>
                  {ownerPerm.keys.map((k) => (
                    <option key={k.address} value={k.address}>{k.label || k.address.slice(0, 10)}...{k.address.slice(-4)} (w: {k.weight})</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <Input
            label="Signature (hex)"
            placeholder="65-byte signature hex string..."
            value={signatureHex}
            onChange={(e) => setSignatureHex(e.target.value)}
          />

          <div className="flex gap-2 pt-1">
            <Button variant="secondary" className="flex-1" onClick={() => setShowAddSignature(false)}>{t("common.cancel")}</Button>
            <Button className="flex-1" onClick={handleAddSignature} loading={addingSignature} disabled={!signatureHex || !signerAddress}>
              <Plus className="w-4 h-4" />Add Signature
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}