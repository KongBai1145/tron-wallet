import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Vote, ChevronUp, ChevronDown, Search, Lock } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import EmptyState from "@/components/ui/EmptyState";
import Badge from "@/components/ui/Badge";
import { useWalletStore } from "@/stores/walletStore";
import { useAccountStore } from "@/stores/accountStore";
import { invoke } from "@tauri-apps/api/core";

interface SuperRepresentative {
  address: string;
  name: string;
  url: string;
  vote_count: number;
  produced_blocks: number;
  is_active: boolean;
}

export default function Voting() {
  const { t } = useTranslation();
  const { currentWallet } = useWalletStore();
  const { accountInfo, fetchAccountInfo } = useAccountStore();

  const [srs, setSrs] = useState<SuperRepresentative[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [showVote, setShowVote] = useState(false);
  const [password, setPassword] = useState("");
  const [voting, setVoting] = useState(false);
  const [voteResult, setVoteResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (currentWallet?.address) {
      fetchAccountInfo(currentWallet.address, currentWallet.network);
    }
    fetchSRs();
  }, [currentWallet?.address]);

  const fetchSRs = async () => {
    setLoading(true);
    try {
      const network = currentWallet?.network || "mainnet";
      const data = await invoke<any>("get_super_representatives", { network });
      setSrs(data ?? []);
    } catch (e) {
      console.error("Failed to fetch SRs:", e);
    } finally {
      setLoading(false);
    }
  };

  const votingPower = accountInfo?.tron_power ?? 0;
  const totalVotesCast = Object.values(votes).reduce((a, b) => a + b, 0);
  const remainingVotes = votingPower - totalVotesCast;

  const filteredSrs = srs.filter((sr) =>
    sr.name.toLowerCase().includes(search.toLowerCase()) ||
    sr.address.toLowerCase().includes(search.toLowerCase())
  );

  const updateVote = (address: string, delta: number) => {
    setVotes((prev) => {
      const current = prev[address] ?? 0;
      const next = Math.max(0, current + delta);
      const newTotal = totalVotesCast - current + next;
      if (newTotal > votingPower) return prev;
      if (next === 0) {
        const { [address]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [address]: next };
    });
  };

  const handleVote = async () => {
    if (!currentWallet || !password) return;
    setVoting(true);
    setVoteResult(null);
    try {
      const voteList = Object.entries(votes)
        .filter(([_, count]) => count > 0)
        .map(([address, count]) => ({ address, vote_count: count }));

      await invoke("cast_vote", {
        request: {
          wallet_id: currentWallet.id,
          password,
          votes: voteList,
          network: currentWallet.network || "mainnet",
        },
      });
      setVoteResult({ success: true, message: t("voting.voteSuccess") });
    } catch (e) {
      setVoteResult({ success: false, message: String(e) });
    } finally {
      setVoting(false);
    }
  };

  const resetVote = () => {
    setShowVote(false);
    setPassword("");
    setVoteResult(null);
  };

  if (!currentWallet) {
    return (
      <EmptyState
        icon={<Vote className="w-6 h-6" />}
        title={t("app.noWallet")}
        description={t("app.selectWalletVoting")}
      />
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-lg mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{t("voting.title")}</h1>
      </div>

      {/* Voting Power Card */}
      <div className="rounded-xl p-4" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>{t("voting.votingPower")}</span>
          <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            {t("voting.remainingVotes")}: {remainingVotes.toLocaleString()}
          </span>
        </div>
        <div className="flex items-end gap-2 mb-2">
          <span className="text-2xl font-bold" style={{ color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>
            {votingPower.toLocaleString()}
          </span>
          <span className="text-sm mb-0.5" style={{ color: "var(--text-tertiary)" }}>TP</span>
        </div>
        <p className="text-xs mb-3" style={{ color: "var(--text-tertiary)" }}>
          {t("app.votingRule")}
        </p>
        {totalVotesCast > 0 && (
          <Button fullWidth onClick={() => setShowVote(true)}>
            {t("voting.castVote")} ({totalVotesCast} votes)
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-tertiary)" }} />
        <input
          type="text"
          placeholder={`${t("common.search")} SR...`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 h-10 rounded-lg text-sm focus:outline-none"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
        />
      </div>

      {/* SR List */}
      <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        <div className="px-4 h-10 flex items-center" style={{ borderBottom: "1px solid var(--border)" }}>
          <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>{t("voting.srList")}</span>
        </div>
        {loading ? (
          <div className="px-4 py-8 text-center">
            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>{t("common.loading")}</p>
          </div>
        ) : filteredSrs.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>{t("app.noSrs")}</p>
          </div>
        ) : (
          filteredSrs.map((sr, i) => {
            const myVote = votes[sr.address] ?? 0;
            return (
              <div
                key={sr.address}
                className="flex items-center justify-between px-4 h-14 transition-colors"
                style={{ borderBottom: i < filteredSrs.length - 1 ? "1px solid var(--border)" : "none" }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}>
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                      {sr.name || sr.address.slice(0, 10) + "..."}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-mono" style={{ color: "var(--text-tertiary)" }}>
                        {sr.address.slice(0, 8)}...
                      </span>
                      {sr.is_active && <Badge variant="success">Active</Badge>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right mr-2">
                    <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                      {(sr.vote_count / 1e6).toLocaleString("en-US", { maximumFractionDigits: 0 })} votes
                    </p>
                  </div>
                  {votingPower > 0 && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateVote(sr.address, -1)}
                        className="w-6 h-6 rounded flex items-center justify-center cursor-pointer"
                        style={{ background: "var(--bg-elevated)", color: "var(--text-tertiary)" }}
                        disabled={myVote === 0}
                      >
                        <ChevronDown className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center text-xs font-mono" style={{ color: myVote > 0 ? "var(--accent)" : "var(--text-tertiary)" }}>
                        {myVote}
                      </span>
                      <button
                        onClick={() => updateVote(sr.address, 1)}
                        className="w-6 h-6 rounded flex items-center justify-center cursor-pointer"
                        style={{ background: "var(--bg-elevated)", color: "var(--text-tertiary)" }}
                        disabled={remainingVotes <= 0}
                      >
                        <ChevronUp className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {votingPower === 0 && (
        <div className="flex items-start gap-2 p-3 rounded-lg" style={{ background: "rgba(255,149,0,0.08)" }}>
          <Lock className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--warning)" }} />
          <p className="text-xs" style={{ color: "var(--warning)" }}>{t("voting.noVotingPower")}</p>
        </div>
      )}

      {/* Vote Confirmation Modal */}
      <Modal isOpen={showVote} onClose={resetVote} title={t("voting.castVote")}>
        <div className="space-y-4">
          <div className="rounded-lg overflow-hidden" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
            {Object.entries(votes).filter(([_, c]) => c > 0).map(([addr, count]) => {
              const sr = srs.find((s) => s.address === addr);
              return (
                <div key={addr} className="flex items-center justify-between px-3 h-9" style={{ borderBottom: "1px solid var(--border)" }}>
                  <span className="text-xs" style={{ color: "var(--text-primary)" }}>
                    {sr?.name || addr.slice(0, 10) + "..."}
                  </span>
                  <span className="text-xs font-mono" style={{ color: "var(--accent)" }}>{count} votes</span>
                </div>
              );
            })}
            <div className="flex items-center justify-between px-3 h-9">
              <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Total</span>
              <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{totalVotesCast} votes</span>
            </div>
          </div>

          <Input
            label={t("wallet.password")}
            type="password"
            placeholder={t("wallet.enterPassword")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {voteResult && (
            <div className="p-3 rounded-lg" style={{ background: voteResult.success ? "rgba(0,214,143,0.08)" : "rgba(255,59,48,0.08)" }}>
              <p className="text-xs" style={{ color: voteResult.success ? "var(--success)" : "var(--danger)" }}>{voteResult.message}</p>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={resetVote}>{t("common.cancel")}</Button>
            <Button className="flex-1" onClick={handleVote} loading={voting} disabled={!password || totalVotesCast === 0}>
              {t("voting.castVote")}
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
