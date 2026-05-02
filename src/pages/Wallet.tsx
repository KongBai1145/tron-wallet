import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { invoke } from "@tauri-apps/api/core";
import { Plus, Import, Trash2, Copy, Check, Shield, Wallet as WalletIcon, Lock, Eye, AlertCircle } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import { useWalletStore } from "@/stores/walletStore";
import { usePriceStore } from "@/stores/priceStore";

export default function Wallet() {
  const { t } = useTranslation();
  const { wallets, currentWallet, setCurrentWallet, createWallet, importWallet, deleteWallet } = useWalletStore();
  const { trxPrice, startPolling, stopPolling } = usePriceStore();
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [step, setStep] = useState<"name" | "password" | "done">("name");
  const [copied, setCopied] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [walletBalances, setWalletBalances] = useState<Record<string, number>>({});

  // Import states
  const [importType, setImportType] = useState<"single" | "watch" | "multisig">("single");
  const [importStep, setImportStep] = useState<"type" | "details" | "done">("type");
  const [importName, setImportName] = useState("");
  const [importSecret, setImportSecret] = useState("");
  const [importPassword, setImportPassword] = useState("");
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    startPolling();
    return () => stopPolling();
  }, []);

  useEffect(() => {
    // Fetch balance for each wallet
    wallets.forEach(async (wallet) => {
      try {
        const info = await invoke<any>("get_account_info", { address: wallet.address, network: wallet.network });
        setWalletBalances((prev) => ({ ...prev, [wallet.id]: info.trx_balance ?? 0 }));
      } catch {}
    });
  }, [wallets.length]);

  const resetCreate = () => { setShowCreate(false); setName(""); setPassword(""); setConfirm(""); setStep("name"); };
  const resetImport = () => { setShowImport(false); setImportType("single"); setImportStep("type"); setImportName(""); setImportSecret(""); setImportPassword(""); };

  const handleCreate = async () => {
    setCreating(true);
    try { await createWallet(name, password, "single"); setStep("done"); } catch {} finally { setCreating(false); }
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      await importWallet(importName, importType, importSecret, importType === "single" ? importPassword : undefined);
      setImportStep("done");
    } catch {} finally { setImporting(false); }
  };

  const copyAddr = async (addr: string) => {
    try { await navigator.clipboard.writeText(addr); setCopied(addr); setTimeout(() => setCopied(null), 2000); } catch {}
  };

  if (wallets.length === 0) {
    return (
      <>
        <EmptyState
          icon={<WalletIcon className="w-6 h-6" />}
          title={t("wallet.noWallets")}
          description={t("wallet.createOrImport")}
          action={
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setShowImport(true)}><Import className="w-4 h-4" />{t("wallet.import")}</Button>
              <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" />{t("wallet.create")}</Button>
            </div>
          }
        />
        <CreateModal {...{ isOpen: showCreate, onClose: resetCreate, step, setStep, name, setName, password, setPassword, confirm, setConfirm, creating, onCreate: handleCreate, t }} />
        <ImportModal {...{ isOpen: showImport, onClose: resetImport, importType, setImportType, importStep, setImportStep, importName, setImportName, importSecret, setImportSecret, importPassword, setImportPassword, importing, onImport: handleImport, t }} />
      </>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{t("common.wallet")}</h1>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowImport(true)}><Import className="w-4 h-4" />{t("wallet.import")}</Button>
          <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" />{t("wallet.create")}</Button>
        </div>
      </div>

      <div className="space-y-2">
        {wallets.map((wallet) => (
          <motion.div key={wallet.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <GlassCard
              hoverable
              onClick={() => setCurrentWallet(wallet)}
              className={currentWallet?.id === wallet.id ? "ring-1" : ""}
              {...(currentWallet?.id === wallet.id ? { style: { borderColor: "#444" } } : {})}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "var(--bg-elevated)" }}>
                    <WalletIcon className="w-5 h-5" style={{ color: "var(--text-secondary)" }} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{wallet.name}</span>
                      <Badge variant={wallet.wallet_type === "multisig" ? "warning" : wallet.wallet_type === "watch" ? "default" : "default"}>
                        {wallet.wallet_type === "multisig" && <Shield className="w-3 h-3 mr-1" />}
                        {wallet.wallet_type === "watch" && <Eye className="w-3 h-3 mr-1" />}
                        {wallet.wallet_type === "single" ? t("wallet.singleSig") : wallet.wallet_type === "multisig" ? t("wallet.multiSig") : t("wallet.watchOnly")}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs font-mono" style={{ color: "var(--text-tertiary)" }}>{wallet.address.slice(0, 10)}...{wallet.address.slice(-8)}</span>
                      <button onClick={(e) => { e.stopPropagation(); copyAddr(wallet.address); }} className="cursor-pointer" style={{ color: "var(--text-tertiary)" }}>
                        {copied === wallet.address ? <Check className="w-3 h-3" style={{ color: "var(--success)" }} /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    {(() => {
                      const bal = walletBalances[wallet.id];
                      const price = trxPrice?.price_usd ?? 0;
                      if (bal !== undefined) {
                        const trxBal = bal / 1e6;
                        const usdVal = trxBal * price;
                        return (
                          <>
                            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>
                              ${usdVal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                              {trxBal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TRX
                            </p>
                          </>
                        );
                      }
                      return <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>{t("common.loading")}</p>;
                    })()}
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); if (window.confirm(t("common.deleteConfirm"))) deleteWallet(wallet.id); }} className="p-1.5 rounded cursor-pointer" style={{ color: "var(--text-tertiary)" }}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      <CreateModal {...{ isOpen: showCreate, onClose: resetCreate, step, setStep, name, setName, password, setPassword, confirm, setConfirm, creating, onCreate: handleCreate, t }} />
      <ImportModal {...{ isOpen: showImport, onClose: resetImport, importType, setImportType, importStep, setImportStep, importName, setImportName, importSecret, setImportSecret, importPassword, setImportPassword, importing, onImport: handleImport, t }} />
    </div>
  );
}

function CreateModal({ isOpen, onClose, step, setStep, name, setName, password, setPassword, confirm: confirmPw, setConfirm, creating, onCreate, t }: any) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("wallet.create")}>
      <div className="flex items-center gap-1.5 mb-5">
        {["name", "password"].map((s, i) => (
          <div key={s} className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold" style={{
              background: step === s || (step === "password" && i === 0) || step === "done" ? "var(--accent)" : "var(--bg-elevated)",
              color: step === s || (step === "password" && i === 0) || step === "done" ? "#fff" : "var(--text-tertiary)",
            }}>{i + 1}</div>
            {i < 1 && <div className="w-6 h-0.5 rounded" style={{ background: step === "password" || step === "done" ? "var(--accent)" : "var(--bg-elevated)" }} />}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === "name" && (
          <motion.div key="name" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-4">
            <Input label={t("wallet.name")} placeholder={t("wallet.enterName")} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            <div className="flex gap-2 pt-1">
              <Button variant="secondary" className="flex-1" onClick={onClose}>{t("common.cancel")}</Button>
              <Button className="flex-1" onClick={() => setStep("password")} disabled={name.trim().length < 2}>{t("common.next")}</Button>
            </div>
          </motion.div>
        )}

        {step === "password" && (
          <motion.div key="pw" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-4">
            <div className="flex items-start gap-2 p-3 rounded-lg" style={{ background: "rgba(255,149,0,0.08)" }}>
              <Lock className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--warning)" }} />
              <p className="text-xs" style={{ color: "var(--warning)" }}>{t("common.strongPassword")}</p>
            </div>
            <Input label={t("wallet.password")} type="password" placeholder={t("wallet.enterPassword")} value={password} onChange={(e) => setPassword(e.target.value)} hint={t("common.minChars", { count: 8 })} />
            <Input label={t("wallet.confirmPassword")} type="password" placeholder={t("wallet.confirmYourPassword")} value={confirmPw} onChange={(e) => setConfirm(e.target.value)} error={confirmPw && password !== confirmPw ? t("common.passwordsDontMatch") : undefined} />
            <div className="flex gap-2 pt-1">
              <Button variant="secondary" className="flex-1" onClick={() => setStep("name")}>{t("common.back")}</Button>
              <Button className="flex-1" onClick={onCreate} disabled={password.length < 8 || password !== confirmPw} loading={creating}>{t("common.create")}</Button>
            </div>
          </motion.div>
        )}

        {step === "done" && (
          <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-4 space-y-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto" style={{ background: "rgba(0,214,143,0.1)" }}>
              <Check className="w-6 h-6" style={{ color: "var(--success)" }} />
            </div>
            <div>
              <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{t("common.walletCreated")}</h3>
              <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>{t("common.walletReady")}</p>
            </div>
            <Button className="w-full" onClick={onClose}>{t("common.done")}</Button>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
}

function ImportModal({ isOpen, onClose, importType, setImportType, importStep, setImportStep, importName, setImportName, importSecret, setImportSecret, importPassword, setImportPassword, importing, onImport, t }: any) {
  const types = [
    { v: "single", l: t("wallet.singleSig"), desc: "Mnemonic or private key", icon: Lock },
    { v: "watch", l: t("wallet.watchOnly"), desc: "Address only, no signing", icon: Eye },
    { v: "multisig", l: t("wallet.multiSig"), desc: "Shared account, on-chain permissions", icon: Shield },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("wallet.import")}>
      <AnimatePresence mode="wait">
        {importStep === "type" && (
          <motion.div key="type" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-3">
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{t("common.selectImportType")}</p>
            {types.map((tp) => {
              const Icon = tp.icon;
              return (
                <button key={tp.v} onClick={() => { setImportType(tp.v as any); setImportStep("details"); }}
                  className="w-full flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors text-left"
                  style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#333")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "var(--bg-elevated)")}
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "var(--bg-surface)" }}>
                    <Icon className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{tp.l}</p>
                    <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>{tp.desc}</p>
                  </div>
                </button>
              );
            })}
            <Button variant="secondary" className="w-full mt-2" onClick={onClose}>{t("common.cancel")}</Button>
          </motion.div>
        )}

        {importStep === "details" && (
          <motion.div key="details" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-4">
            <Input label={t("wallet.name")} placeholder={t("wallet.enterName")} value={importName} onChange={(e: any) => setImportName(e.target.value)} autoFocus />

            {importType === "single" && (
              <>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{t("common.mnemonicOrPrivateKey")}</label>
                  <textarea
                    value={importSecret}
                    onChange={(e) => setImportSecret(e.target.value)}
                    placeholder={t("common.enterMnemonicOrPkPlaceholder")}
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg text-sm resize-none focus:outline-none"
                    style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                  />
                </div>
                <Input label={t("wallet.password")} type="password" placeholder={t("wallet.enterPassword")} value={importPassword} onChange={(e: any) => setImportPassword(e.target.value)} hint={t("common.minChars", { count: 8 })} />
              </>
            )}

            {importType === "watch" && (
              <>
                <Input label="Address" placeholder="Enter TRON address (T...)" value={importSecret} onChange={(e: any) => setImportSecret(e.target.value)} />
                <div className="flex items-start gap-2 p-3 rounded-lg" style={{ background: "rgba(0,214,143,0.08)" }}>
                  <Eye className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--success)" }} />
                  <p className="text-xs" style={{ color: "var(--success)" }}>{t("common.watchOnlyImportDesc")}</p>
                </div>
              </>
            )}

            {importType === "multisig" && (
              <>
                <Input label="Account Address" placeholder="Enter TRON account address (T...)" value={importSecret} onChange={(e: any) => setImportSecret(e.target.value)} />
                <div className="flex items-start gap-2 p-3 rounded-lg" style={{ background: "rgba(255,149,0,0.08)" }}>
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--warning)" }} />
                  <div className="text-xs space-y-1" style={{ color: "var(--warning)" }}>
                    <p>{t("common.multisigImportDesc")}</p>
                    <p>{t("common.multisigImportNote")}</p>
                  </div>
                </div>
              </>
            )}

            <div className="flex gap-2 pt-1">
              <Button variant="secondary" className="flex-1" onClick={() => setImportStep("type")}>{t("common.back")}</Button>
              <Button className="flex-1" onClick={onImport} disabled={!importName.trim() || !importSecret.trim() || (importType === "single" && importPassword.length < 8)} loading={importing}>{t("common.import")}</Button>
            </div>
          </motion.div>
        )}

        {importStep === "done" && (
          <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-4 space-y-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto" style={{ background: "rgba(0,214,143,0.1)" }}>
              <Check className="w-6 h-6" style={{ color: "var(--success)" }} />
            </div>
            <div>
              <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{t("common.walletImported")}</h3>
              <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
                {importType === "multisig" ? t("common.multisigImported") : t("common.walletReady")}
              </p>
            </div>
            <Button className="w-full" onClick={onClose}>{t("common.done")}</Button>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
}
