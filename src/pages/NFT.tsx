import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Image, RefreshCw } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import Button from "@/components/ui/Button";
import GlassCard from "@/components/ui/GlassCard";
import Badge from "@/components/ui/Badge";
import { useWalletStore } from "@/stores/walletStore";
import { invoke } from "@tauri-apps/api/core";

interface NFTItem {
  id: string;
  name: string;
  image?: string;
  collection?: string;
  contract_address: string;
  token_id: string;
}

export default function NFT() {
  const { t } = useTranslation();
  const { currentWallet } = useWalletStore();
  const [nfts, setNfts] = useState<NFTItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNFTs = async () => {
    if (!currentWallet?.address) return;
    setLoading(true);
    setError(null);
    try {
      // Try to fetch NFT tickets first (most common TRON NFT type)
      const tickets = await invoke<any[]>("get_nft_tickets", {
        address: currentWallet.address,
        network: currentWallet.network,
      });

      const items: NFTItem[] = (tickets ?? []).map((t: any) => ({
        id: t.id ?? `${t.contract_address ?? "unknown"}:${String(t.token_id ?? "0")}`,
        name: t.name ?? `Ticket #${t.token_id}`,
        image: t.image_url ?? t.metadata?.image,
        collection: t.collection ?? t.metadata?.collection ?? "Ticket",
        contract_address: t.contract_address ?? "",
        token_id: String(t.token_id ?? ""),
      }));

      setNfts(items);
    } catch (e) {
      // Fallback: try generic NFT fetch
      try {
        const data = await invoke<any>("get_nft", {
          address: currentWallet.address,
          network: currentWallet.network,
        });
        if (data?.tokens) {
          setNfts(data.tokens.map((t: any) => ({
            id: t.id ?? `${t.contract_address ?? "unknown"}:${String(t.token_id ?? "0")}`,
            name: t.name ?? `NFT #${t.token_id}`,
            image: t.image_url ?? t.metadata?.image,
            collection: t.collection ?? t.metadata?.collection ?? "NFT",
            contract_address: t.contract_address ?? "",
            token_id: String(t.token_id ?? ""),
          })));
        } else {
          setNfts([]);
        }
      } catch {
        setNfts([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNFTs();
  }, [currentWallet?.address]);

  const renderNFT = (nft: NFTItem) => (
    <GlassCard key={nft.id} hoverable className="overflow-hidden">
      <div className="w-full aspect-square rounded-lg overflow-hidden mb-3 flex items-center justify-center"
        style={{ background: "var(--bg-elevated)" }}>
        {nft.image ? (
          <img src={nft.image} alt={nft.name} className="w-full h-full object-cover" onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
            (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
          }} />
        ) : null}
        <div className={`${nft.image ? "hidden" : ""} w-full h-full flex items-center justify-center`}>
          <Image className="w-10 h-10" style={{ color: "var(--text-tertiary)" }} />
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{nft.name}</p>
        <div className="flex items-center justify-between">
          <span className="text-xs truncate max-w-[60%]" style={{ color: "var(--text-tertiary)" }}>{nft.collection}</span>
          <Badge variant="default">{t("nft.tokenId", { id: nft.token_id })}</Badge>
        </div>
      </div>
    </GlassCard>
  );

  if (!currentWallet) {
    return (
      <div className="max-w-lg mx-auto space-y-4">
        <h1 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{t("nft.title")}</h1>
        <EmptyState icon={<Image className="w-6 h-6" />} title={t("nft.noNFTs")} description={t("common.selectWallet")} />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-lg mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{t("nft.title")}</h1>
        <Button variant="secondary" size="sm" onClick={fetchNFTs} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {error && (
        <div className="p-3 rounded-lg text-xs" style={{ background: "rgba(255,59,48,0.1)", color: "var(--error)" }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-lg animate-pulse" style={{ background: "var(--bg-elevated)", height: 200 }} />
          ))}
        </div>
      ) : nfts.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {nfts.map(renderNFT)}
        </div>
      ) : (
        <EmptyState icon={<Image className="w-6 h-6" />} title={t("nft.noNFTs")} description={t("common.nftWillAppear")} />
      )}
    </motion.div>
  );
}