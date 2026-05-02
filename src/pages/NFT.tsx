import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Image } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";

export default function NFT() {
  const { t } = useTranslation();

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-lg mx-auto space-y-4">
      <h1 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{t("nft.title")}</h1>
      <EmptyState icon={<Image className="w-6 h-6" />} title={t("nft.noNFTs")} description={t("common.nftWillAppear")} />
    </motion.div>
  );
}
